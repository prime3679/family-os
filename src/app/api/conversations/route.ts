/**
 * GET /api/conversations
 *
 * List conversations for the current user's household
 * Used by the Activity Feed and Chat history
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getRecentConversations, ConversationChannel, ConversationStatus } from '@/lib/conversations';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 404 });
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const channel = searchParams.get('channel') as ConversationChannel | null;
    const status = searchParams.get('status') as ConversationStatus | 'all' | null;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const cursor = searchParams.get('cursor') || undefined;

    // Fetch conversations
    const result = await getRecentConversations(user.householdId, {
      channel: channel || undefined,
      status: status || 'all',
      limit: Math.min(limit, 50),
      cursor,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
