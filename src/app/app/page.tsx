import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getOnboardingStatus() {
  const session = await auth();
  if (!session?.user?.id) {
    return { needsOnboarding: false };
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

  // User needs onboarding if they don't have connected calendars or verified phone
  const hasConnectedCalendars = (user?.familyMember?.calendars?.length ?? 0) > 0;
  const hasVerifiedPhone = user?.phoneVerified ?? false;

  return {
    needsOnboarding: !hasConnectedCalendars || !hasVerifiedPhone,
  };
}

export default async function AppIndex() {
  const { needsOnboarding } = await getOnboardingStatus();

  if (needsOnboarding) {
    redirect('/app/onboarding');
  }

  redirect('/app/ritual');
}
