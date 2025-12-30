import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Dashboard from '@/components/dashboard/Dashboard';

export const dynamic = 'force-dynamic';

async function getOnboardingStatus() {
  const session = await auth();
  if (!session?.user?.id) {
    return { needsOnboarding: false, authenticated: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      familyMember: {
        include: {
          calendars: { where: { included: true } },
        },
      },
    },
  });

  // User needs onboarding if they don't have connected calendars
  const hasConnectedCalendars = (user?.familyMember?.calendars?.length ?? 0) > 0;

  return {
    needsOnboarding: !hasConnectedCalendars,
    authenticated: true,
  };
}

export default async function AppIndex() {
  const { needsOnboarding, authenticated } = await getOnboardingStatus();

  if (!authenticated) {
    redirect('/api/auth/signin');
  }

  if (needsOnboarding) {
    redirect('/app/onboarding');
  }

  // Show dashboard instead of redirecting
  return <Dashboard />;
}
