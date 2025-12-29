import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | FamilyOS',
  description: 'Terms of service for FamilyOS - family coordination platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link href="/" className="text-accent-primary hover:underline">
            &larr; Back to FamilyOS
          </Link>
          <h1 className="mt-4 font-serif text-3xl text-text-primary">Terms of Service</h1>
          <p className="mt-2 text-text-secondary">Last updated: December 2024</p>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Agreement to Terms</h2>
            <p className="text-text-secondary mb-4">
              By accessing or using FamilyOS, you agree to be bound by these Terms of Service.
              If you disagree with any part of these terms, you may not access the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Description of Service</h2>
            <p className="text-text-secondary mb-4">
              FamilyOS is a family coordination platform that helps parents manage schedules,
              communicate about logistics, and stay on top of family activities. The service
              includes:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Calendar synchronization and conflict detection</li>
              <li>Daily briefings via SMS and push notifications</li>
              <li>AI-powered chat assistant for schedule queries</li>
              <li>Email intelligence for family-relevant communications</li>
              <li>Task and reminder management</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Account Requirements</h2>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>You must be 18 years or older to use this service</li>
              <li>You must provide accurate account information</li>
              <li>You are responsible for maintaining account security</li>
              <li>One household account per family unit</li>
              <li>You may invite your co-parent/partner to join your household</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Acceptable Use</h2>
            <p className="text-text-secondary mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Use the service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to systems or data</li>
              <li>Interfere with or disrupt the service</li>
              <li>Share account credentials with unauthorized users</li>
              <li>Use the service to harass or harm others</li>
              <li>Scrape or automatically collect data from the service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Third-Party Integrations</h2>
            <p className="text-text-secondary mb-4">
              FamilyOS integrates with third-party services (Google Calendar, Gmail, etc.).
              Your use of these integrations is also subject to the respective third party&apos;s
              terms of service. We are not responsible for third-party service availability
              or functionality.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">AI Features</h2>
            <p className="text-text-secondary mb-4">
              FamilyOS uses artificial intelligence to provide insights and assistance.
              While we strive for accuracy:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>AI-generated content should be verified for critical decisions</li>
              <li>The AI assistant may occasionally make errors</li>
              <li>You are responsible for verifying schedule information</li>
              <li>AI features may change or be updated without notice</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">SMS Notifications</h2>
            <p className="text-text-secondary mb-4">
              By providing your phone number and opting into SMS notifications:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>You consent to receive automated text messages</li>
              <li>Message frequency varies based on your schedule</li>
              <li>Standard messaging rates may apply</li>
              <li>You can opt out at any time by texting STOP</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Intellectual Property</h2>
            <p className="text-text-secondary mb-4">
              The FamilyOS service, including its design, features, and content, is owned by
              us and protected by copyright and other intellectual property laws. Your data
              remains yours; you grant us a license to use it solely to provide the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Limitation of Liability</h2>
            <p className="text-text-secondary mb-4">
              FamilyOS is provided &quot;as is&quot; without warranties of any kind. We are not
              liable for:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Missed appointments or scheduling conflicts</li>
              <li>Service interruptions or downtime</li>
              <li>Loss of data or unauthorized access</li>
              <li>Actions taken based on AI-generated information</li>
              <li>Third-party service failures</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Termination</h2>
            <p className="text-text-secondary mb-4">
              We reserve the right to suspend or terminate your account for violations of
              these terms. You may delete your account at any time through the settings page.
              Upon termination, your data will be deleted within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Changes to Terms</h2>
            <p className="text-text-secondary mb-4">
              We may update these terms from time to time. Continued use of the service after
              changes constitutes acceptance of the new terms. Material changes will be
              communicated via email.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-xl text-text-primary mb-4">Contact</h2>
            <p className="text-text-secondary">
              Questions about these terms? Contact us at{' '}
              <a href="mailto:legal@familyos.app" className="text-accent-primary hover:underline">
                legal@familyos.app
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface mt-12">
        <div className="mx-auto max-w-3xl px-4 py-6 text-center text-text-tertiary text-sm">
          <Link href="/privacy" className="hover:text-text-primary">
            Privacy Policy
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
