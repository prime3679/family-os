import { AppShell } from '@/components/layout';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell familyName="The Lumley Family" maxWidth="wide" centered>
      {children}
    </AppShell>
  );
}
