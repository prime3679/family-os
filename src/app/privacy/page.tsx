import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | FamilyOS',
  description: 'Privacy policy for FamilyOS - how we handle your family data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link href="/" className="text-accent-primary hover:underline">
            &larr; Back to FamilyOS
          </Link>
          <h1 className="mt-4 font-serif text-3xl text-text-primary">Privacy Policy</h1>
          <p className="mt-2 text-text-secondary">Last updated: December 2024</p>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Overview</h2>
            <p className="text-text-secondary mb-4">
              FamilyOS is designed with your family&apos;s privacy as a core principle. We collect
              only the data necessary to help coordinate your family&apos;s schedule and
              communicate effectively between parents.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Information We Collect</h2>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>
                <strong>Account Information:</strong> Email address and name when you sign up
                with Google
              </li>
              <li>
                <strong>Calendar Data:</strong> Events from calendars you explicitly connect,
                used to detect scheduling conflicts and coordinate logistics
              </li>
              <li>
                <strong>Phone Number:</strong> If you opt-in to SMS notifications for daily
                briefings and alerts
              </li>
              <li>
                <strong>Children&apos;s Names:</strong> First names only, used to personalize
                reminders about activities
              </li>
              <li>
                <strong>Email Content:</strong> If you connect Gmail, we analyze email subjects
                and snippets for family-relevant information (school notices, activities, etc.)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">How We Use Your Data</h2>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Send daily briefings about your family&apos;s schedule</li>
              <li>Detect and alert you to scheduling conflicts</li>
              <li>Provide intelligent reminders for preparation tasks</li>
              <li>Enable the FamilyOS chat assistant to answer questions about your week</li>
              <li>Improve our service through anonymized, aggregated usage patterns</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Data Security</h2>
            <p className="text-text-secondary mb-4">
              Your data is encrypted in transit (HTTPS) and at rest. We use industry-standard
              security practices and never sell your data to third parties.
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>OAuth 2.0 for secure Google Calendar and Gmail access</li>
              <li>Encrypted database storage</li>
              <li>Access tokens refreshed automatically and stored securely</li>
              <li>No data sharing with advertisers or data brokers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Third-Party Services</h2>
            <p className="text-text-secondary mb-4">We use the following services:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>
                <strong>Google:</strong> Calendar and Gmail integration (OAuth)
              </li>
              <li>
                <strong>Twilio:</strong> SMS notifications (phone numbers are shared only for
                message delivery)
              </li>
              <li>
                <strong>Anthropic:</strong> AI-powered insights and chat (email content is
                processed but not stored by Anthropic)
              </li>
              <li>
                <strong>Vercel:</strong> Hosting and infrastructure
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Your Rights</h2>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>
                <strong>Access:</strong> View all data we have about your family
              </li>
              <li>
                <strong>Delete:</strong> Request complete deletion of your account and data
              </li>
              <li>
                <strong>Disconnect:</strong> Revoke calendar or email access at any time
              </li>
              <li>
                <strong>Export:</strong> Download your data in a portable format
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Children&apos;s Privacy</h2>
            <p className="text-text-secondary mb-4">
              FamilyOS is designed for adult users (parents/guardians). We only store
              children&apos;s first names for personalization purposes. We do not collect any
              data directly from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Contact</h2>
            <p className="text-text-secondary">
              Questions about privacy? Contact us at{' '}
              <a href="mailto:privacy@familyos.app" className="text-accent-primary hover:underline">
                privacy@familyos.app
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface mt-12">
        <div className="mx-auto max-w-3xl px-4 py-6 text-center text-text-tertiary text-sm">
          <Link href="/terms" className="hover:text-text-primary">
            Terms of Service
          </Link>
          <span className="mx-2">|</span>
          <Link href="/" className="hover:text-text-primary">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
