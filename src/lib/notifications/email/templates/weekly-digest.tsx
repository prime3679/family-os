import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from '@react-email/components';

interface WeeklyDigestEmailProps {
  userName: string;
  weekRange: string;
  aiNarrative: string;
  stats: {
    totalEvents: number;
    conflicts: number;
    handoffs: number;
    heaviestDay: string;
  };
  conflicts?: Array<{
    title: string;
    day: string;
    type: string;
  }>;
  ritualUrl: string;
  unsubscribeUrl: string;
}

export function WeeklyDigestEmail({
  userName,
  weekRange,
  aiNarrative,
  stats,
  conflicts = [],
  ritualUrl,
  unsubscribeUrl,
}: WeeklyDigestEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your week at a glance - {weekRange}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>Family OS</Heading>
            <Text style={tagline}>Weekly Planning Companion</Text>
          </Section>

          {/* Greeting */}
          <Section style={section}>
            <Heading style={h1}>Good morning, {userName}!</Heading>
            <Text style={subtitle}>Here&apos;s your week at a glance: {weekRange}</Text>
          </Section>

          {/* AI Narrative */}
          <Section style={narrativeSection}>
            <Text style={narrative}>{aiNarrative}</Text>
          </Section>

          {/* Stats Grid */}
          <Section style={statsSection}>
            <table style={statsTable}>
              <tbody>
                <tr>
                  <td style={statCell}>
                    <Text style={statValue}>{stats.totalEvents}</Text>
                    <Text style={statLabel}>Events</Text>
                  </td>
                  <td style={statCell}>
                    <Text style={statValue}>{stats.conflicts}</Text>
                    <Text style={statLabel}>Conflicts</Text>
                  </td>
                  <td style={statCell}>
                    <Text style={statValue}>{stats.handoffs}</Text>
                    <Text style={statLabel}>Handoffs</Text>
                  </td>
                  <td style={statCell}>
                    <Text style={statValue}>{stats.heaviestDay}</Text>
                    <Text style={statLabel}>Busiest Day</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Conflicts Preview */}
          {conflicts.length > 0 && (
            <Section style={section}>
              <Heading style={h2}>Needs Your Attention</Heading>
              {conflicts.slice(0, 3).map((conflict, i) => (
                <div key={i} style={conflictCard}>
                  <Text style={conflictTitle}>{conflict.title}</Text>
                  <Text style={conflictMeta}>
                    {conflict.day} &bull; {conflict.type}
                  </Text>
                </div>
              ))}
              {conflicts.length > 3 && (
                <Text style={moreText}>+{conflicts.length - 3} more to review</Text>
              )}
            </Section>
          )}

          {/* CTA Button */}
          <Section style={ctaSection}>
            <Button style={ctaButton} href={ritualUrl}>
              Start Your Weekly Ritual
            </Button>
            <Text style={ctaSubtext}>
              Takes about 5 minutes to review and plan your week together
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this because you enabled weekly digests in Family OS.
            </Text>
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Unsubscribe from weekly digests
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#F8F6F4',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '580px',
};

const header = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logo = {
  fontFamily: 'Georgia, serif',
  fontSize: '28px',
  fontWeight: 'normal' as const,
  color: '#7C6A5D',
  margin: '0',
};

const tagline = {
  fontSize: '14px',
  color: '#8B8178',
  margin: '4px 0 0',
};

const section = {
  marginBottom: '32px',
};

const h1 = {
  fontFamily: 'Georgia, serif',
  fontSize: '24px',
  fontWeight: 'normal' as const,
  color: '#3D3630',
  margin: '0 0 8px',
};

const h2 = {
  fontFamily: 'Georgia, serif',
  fontSize: '18px',
  fontWeight: 'normal' as const,
  color: '#3D3630',
  margin: '0 0 16px',
};

const subtitle = {
  fontSize: '16px',
  color: '#5C534A',
  margin: '0',
};

const narrativeSection = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '32px',
  borderLeft: '4px solid #B8A99A',
};

const narrative = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#3D3630',
  margin: '0',
};

const statsSection = {
  marginBottom: '32px',
};

const statsTable = {
  width: '100%',
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  overflow: 'hidden',
};

const statCell = {
  textAlign: 'center' as const,
  padding: '20px 12px',
  borderRight: '1px solid #E8E4E0',
};

const statValue = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#7C6A5D',
  margin: '0 0 4px',
};

const statLabel = {
  fontSize: '12px',
  color: '#8B8178',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0',
};

const conflictCard = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
  borderLeft: '3px solid #E88B5A',
};

const conflictTitle = {
  fontSize: '15px',
  fontWeight: '500' as const,
  color: '#3D3630',
  margin: '0 0 4px',
};

const conflictMeta = {
  fontSize: '13px',
  color: '#8B8178',
  margin: '0',
};

const moreText = {
  fontSize: '14px',
  color: '#8B8178',
  textAlign: 'center' as const,
  margin: '8px 0 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const ctaButton = {
  backgroundColor: '#7C6A5D',
  borderRadius: '8px',
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: '500' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
};

const ctaSubtext = {
  fontSize: '14px',
  color: '#8B8178',
  marginTop: '12px',
};

const hr = {
  borderColor: '#E8E4E0',
  margin: '32px 0',
};

const footer = {
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '13px',
  color: '#8B8178',
  margin: '0 0 8px',
};

const unsubscribeLink = {
  fontSize: '13px',
  color: '#7C6A5D',
  textDecoration: 'underline',
};

export default WeeklyDigestEmail;
