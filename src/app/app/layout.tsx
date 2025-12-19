import { AppShell } from '@/components/layout';
import SessionProvider from '@/components/providers/SessionProvider';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getFamilyName(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) return 'Your Family';

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { household: { select: { name: true } } },
  });

  return user?.household?.name || 'Your Family';
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const familyName = await getFamilyName();

  return (
    <SessionProvider>
      <AppShell familyName={familyName} maxWidth="wide" centered>
        {children}
      </AppShell>
    </SessionProvider>
  );
}
