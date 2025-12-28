import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * ⚠️ DEVELOPMENT ONLY ⚠️
 *
 * Development helper: Get authenticated user ID, falling back to test user in development
 * This allows testing APIs without going through OAuth flow
 *
 * IMPORTANT: This file should NEVER be used in production.
 * The test user fallback is ONLY available in NODE_ENV=development
 */
export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

  // CRITICAL: Development-only fallback
  // In production, this will always return null if no session exists
  if (process.env.NODE_ENV === 'development') {
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@familyos.app' },
      select: { id: true },
    });
    if (testUser) {
      console.log('[Auth Dev] Using test user fallback - development only');
      return testUser.id;
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Log warning if this function is called without session in production
    console.error('[Auth Dev] WARNING: Development auth helper called in production without valid session');
  }

  return null;
}

/**
 * ⚠️ DEVELOPMENT ONLY ⚠️
 *
 * Get authenticated user with household ID
 *
 * This function uses getAuthUserId() which has a development-only test user fallback
 */
export async function getAuthUserWithHousehold(): Promise<{ userId: string; householdId: string } | null> {
  const userId = await getAuthUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { householdId: true },
  });

  if (!user?.householdId) return null;

  return { userId, householdId: user.householdId };
}
