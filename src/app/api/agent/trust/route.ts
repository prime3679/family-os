/**
 * Agent Trust API
 *
 * POST: Toggle auto-approve for an action type
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { setAutoApprove, getTrust } from '@/lib/agent';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionType, enabled } = await req.json();

    if (!actionType || typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing actionType or enabled field' },
        { status: 400 }
      );
    }

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 400 });
    }

    // Update auto-approve setting
    const updatedTrust = await setAutoApprove(user.householdId, actionType, enabled);

    return NextResponse.json({
      success: true,
      trust: {
        actionType: updatedTrust.actionType,
        successCount: updatedTrust.successCount,
        failureCount: updatedTrust.failureCount,
        successRate: updatedTrust.successRate,
        autoApprove: updatedTrust.autoApprove,
        canAutoApprove: updatedTrust.canAutoApprove,
      },
    });
  } catch (error) {
    console.error('Agent trust error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET: Get trust score for a specific action type
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actionType = req.nextUrl.searchParams.get('actionType');
    if (!actionType) {
      return NextResponse.json({ error: 'Missing actionType' }, { status: 400 });
    }

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 400 });
    }

    const trust = await getTrust(user.householdId, actionType);

    return NextResponse.json({
      actionType: trust.actionType,
      successCount: trust.successCount,
      failureCount: trust.failureCount,
      successRate: trust.successRate,
      autoApprove: trust.autoApprove,
      canAutoApprove: trust.canAutoApprove,
    });
  } catch (error) {
    console.error('Agent trust error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
