/**
 * Agent Settings API
 *
 * GET: Fetch agent settings (preferences, trust scores, pending actions)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getMemorySummary, getUserPendingActions, getAllTrust } from '@/lib/agent';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { householdId: true },
    });

    if (!user?.householdId) {
      return NextResponse.json({ error: 'No household found' }, { status: 400 });
    }

    // Fetch all agent data in parallel
    const [memorySummary, pendingActions, trustScores] = await Promise.all([
      getMemorySummary(user.householdId),
      getUserPendingActions(session.user.id),
      getAllTrust(user.householdId),
    ]);

    // Format preferences for display
    const preferences = memorySummary.preferences.map(p => ({
      id: p.id,
      key: p.key,
      value: p.value,
      source: p.source,
      confidence: p.confidence,
      createdAt: p.createdAt,
    }));

    // Format patterns for display
    const patterns = memorySummary.patterns.map(p => ({
      id: p.id,
      key: p.key,
      description: (p.value as { description?: string })?.description || p.key,
      confidence: p.confidence,
      createdAt: p.createdAt,
    }));

    // Format pending actions
    const actions = pendingActions.map(a => ({
      id: a.id,
      actionType: a.actionType,
      actionData: a.actionData,
      status: a.status,
      riskLevel: a.riskLevel,
      reason: a.reason,
      expiresAt: a.expiresAt,
      createdAt: a.createdAt,
    }));

    // Format trust scores
    const trust = trustScores.map(t => ({
      actionType: t.actionType,
      successCount: t.successCount,
      failureCount: t.failureCount,
      rejectCount: t.rejectCount,
      successRate: t.successRate,
      autoApprove: t.autoApprove,
      canAutoApprove: t.canAutoApprove,
    }));

    return NextResponse.json({
      preferences,
      patterns,
      pendingActions: actions,
      trustScores: trust,
    });
  } catch (error) {
    console.error('Agent settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
