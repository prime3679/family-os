/**
 * Family OS — Ritual State Persistence API
 *
 * GET  /api/ritual/state?week=2024-W50  → Load state for a week
 * PUT  /api/ritual/state                → Save/update state
 * DELETE /api/ritual/state?week=...     → Reset week's state
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWeekKey } from '@/lib/ritual/weekKey';

export interface RitualStateResponse {
  weekKey: string;
  currentStep: number;
  prepItems: Record<string, boolean>;
  decisions: Record<string, { resolved: boolean; resolution?: string }>;
  completedAt?: string;
}

/**
 * GET - Load ritual state for a week
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekKey = searchParams.get('week') || getWeekKey();

    const ritualSession = await prisma.ritualSession.findUnique({
      where: {
        userId_weekKey: {
          userId: session.user.id,
          weekKey,
        },
      },
      include: {
        prepItems: true,
        decisions: true,
      },
    });

    if (!ritualSession) {
      // Return empty state for new week
      return NextResponse.json({
        weekKey,
        currentStep: 1,
        prepItems: {},
        decisions: {},
      } as RitualStateResponse);
    }

    // Transform to response format
    const prepItems: Record<string, boolean> = {};
    for (const item of ritualSession.prepItems) {
      prepItems[item.itemKey] = item.done;
    }

    const decisions: Record<string, { resolved: boolean; resolution?: string }> = {};
    for (const decision of ritualSession.decisions) {
      decisions[decision.conflictId] = {
        resolved: decision.resolved,
        resolution: decision.resolution || undefined,
      };
    }

    return NextResponse.json({
      weekKey: ritualSession.weekKey,
      currentStep: ritualSession.currentStep,
      prepItems,
      decisions,
      completedAt: ritualSession.completedAt?.toISOString(),
    } as RitualStateResponse);
  } catch (error) {
    console.error('Failed to load ritual state:', error);
    return NextResponse.json(
      { error: 'Failed to load ritual state' },
      { status: 500 }
    );
  }
}

interface UpdateStateRequest {
  weekKey?: string;
  currentStep?: number;
  prepItems?: Record<string, boolean>;
  decisions?: Record<string, { resolved: boolean; resolution?: string }>;
  completedAt?: string | null;
}

/**
 * PUT - Save/update ritual state
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: UpdateStateRequest = await request.json();
    const weekKey = body.weekKey || getWeekKey();

    // Upsert the ritual session
    const ritualSession = await prisma.ritualSession.upsert({
      where: {
        userId_weekKey: {
          userId: session.user.id,
          weekKey,
        },
      },
      update: {
        currentStep: body.currentStep,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
      },
      create: {
        userId: session.user.id,
        weekKey,
        currentStep: body.currentStep || 1,
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
      },
    });

    // Update prep items if provided
    if (body.prepItems) {
      for (const [itemKey, done] of Object.entries(body.prepItems)) {
        await prisma.prepItemState.upsert({
          where: {
            ritualSessionId_itemKey: {
              ritualSessionId: ritualSession.id,
              itemKey,
            },
          },
          update: { done },
          create: {
            ritualSessionId: ritualSession.id,
            itemKey,
            done,
          },
        });
      }
    }

    // Update decisions if provided
    if (body.decisions) {
      for (const [conflictId, state] of Object.entries(body.decisions)) {
        await prisma.decisionState.upsert({
          where: {
            ritualSessionId_conflictId: {
              ritualSessionId: ritualSession.id,
              conflictId,
            },
          },
          update: {
            resolved: state.resolved,
            resolution: state.resolution || null,
          },
          create: {
            ritualSessionId: ritualSession.id,
            conflictId,
            resolved: state.resolved,
            resolution: state.resolution || null,
          },
        });
      }
    }

    return NextResponse.json({ success: true, weekKey });
  } catch (error) {
    console.error('Failed to save ritual state:', error);
    return NextResponse.json(
      { error: 'Failed to save ritual state' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Reset/clear a week's ritual state
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekKey = searchParams.get('week') || getWeekKey();

    await prisma.ritualSession.deleteMany({
      where: {
        userId: session.user.id,
        weekKey,
      },
    });

    return NextResponse.json({ success: true, weekKey });
  } catch (error) {
    console.error('Failed to reset ritual state:', error);
    return NextResponse.json(
      { error: 'Failed to reset ritual state' },
      { status: 500 }
    );
  }
}
