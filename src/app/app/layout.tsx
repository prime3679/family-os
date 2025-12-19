import { AppShell } from '@/components/layout';
import SessionProvider from '@/components/providers/SessionProvider';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface UserSetupStatus {
  familyName: string;
  needsCalendarSetup: boolean;
  isNewMember: boolean;
}

async function getUserSetupStatus(): Promise<UserSetupStatus> {
  const session = await auth();
  if (!session?.user?.id) {
    return { familyName: 'Your Family', needsCalendarSetup: false, isNewMember: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      household: {
        select: {
          name: true,
          users: { select: { id: true } },
        },
      },
      familyMember: {
        include: {
          calendars: { where: { included: true } },
        },
      },
    },
  });

  const familyName = user?.household?.name || 'Your Family';

  // User needs setup if they don't have a FamilyMember with connected calendars
  const hasConnectedCalendars = (user?.familyMember?.calendars?.length ?? 0) > 0;

  // User is a "new member" if there are multiple users in household and they don't have calendars
  const householdHasMultipleUsers = (user?.household?.users?.length ?? 0) > 1;
  const isNewMember = householdHasMultipleUsers && !hasConnectedCalendars;

  return {
    familyName,
    needsCalendarSetup: !hasConnectedCalendars,
    isNewMember,
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { familyName, needsCalendarSetup, isNewMember } = await getUserSetupStatus();

  return (
    <SessionProvider>
      <AppShell
        familyName={familyName}
        maxWidth="wide"
        centered
        needsCalendarSetup={needsCalendarSetup}
        isNewMember={isNewMember}
      >
        {children}
      </AppShell>
    </SessionProvider>
  );
}
