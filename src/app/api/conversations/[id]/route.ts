/**
 * GET /api/conversations/[id]
 *
 * Get a single conversation with all its messages
 * Used by Chat to load conversation history
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getConversationWithMessages } from '@/lib/conversations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 });
    }

    // Fetch conversation with messages
    const conversation = await getConversationWithMessages(id);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify conversation belongs to user's household
    if (conversation.householdId !== user.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Conversation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
