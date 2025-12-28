import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendVerificationCode, isValidPhoneNumber } from '@/lib/sms/client';

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/sms/verify - Send verification code or verify code
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber, code } = body;

    // Case 1: Verify a code
    if (code) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          phoneNumber: true,
          phoneVerified: true,
          updatedAt: true
        },
      });

      if (!user || !user.phoneNumber) {
        return NextResponse.json(
          { error: 'No phone number on file' },
          { status: 400 }
        );
      }

      // Check if code matches and is still valid (10 minutes)
      const storedCode = await prisma.verificationToken.findFirst({
        where: {
          identifier: `phone:${session.user.id}`,
          token: code,
        },
      });

      if (!storedCode) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }

      if (storedCode.expires < new Date()) {
        // Clean up expired code
        await prisma.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: `phone:${session.user.id}`,
              token: code,
            },
          },
        });
        return NextResponse.json(
          { error: 'Verification code expired' },
          { status: 400 }
        );
      }

      // Mark phone as verified
      await prisma.user.update({
        where: { id: session.user.id },
        data: { phoneVerified: true },
      });

      // Clean up verification token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: `phone:${session.user.id}`,
            token: code,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Phone number verified successfully'
      });
    }

    // Case 2: Send verification code
    if (phoneNumber) {
      // Format phone number to E.164
      const formattedPhone = phoneNumber.trim();

      // Validate phone number format
      if (!isValidPhoneNumber(formattedPhone)) {
        return NextResponse.json(
          { error: 'Invalid phone number format. Use E.164 format (e.g., +1 555 123 4567)' },
          { status: 400 }
        );
      }

      // Generate verification code
      const verificationCode = generateVerificationCode();

      // Store code in database with 10-minute expiration
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Delete any existing verification codes for this user
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: `phone:${session.user.id}`,
        },
      });

      // Store new verification code
      await prisma.verificationToken.create({
        data: {
          identifier: `phone:${session.user.id}`,
          token: verificationCode,
          expires: expiresAt,
        },
      });

      // Update user's phone number (unverified)
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          phoneNumber: formattedPhone,
          phoneVerified: false,
        },
      });

      // Send verification code via SMS
      const result = await sendVerificationCode(formattedPhone, verificationCode);

      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to send verification code' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Verification code sent successfully',
        phoneNumber: formattedPhone,
      });
    }

    return NextResponse.json(
      { error: 'Missing required field: phoneNumber or code' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in SMS verification:', error);
    return NextResponse.json(
      { error: 'Failed to process verification request' },
      { status: 500 }
    );
  }
}

// GET /api/sms/verify - Get current phone verification status
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        phoneNumber: true,
        phoneVerified: true,
      },
    });

    return NextResponse.json({
      phoneNumber: user?.phoneNumber || null,
      phoneVerified: user?.phoneVerified || false,
    });
  } catch (error) {
    console.error('Error fetching phone verification status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification status' },
      { status: 500 }
    );
  }
}
