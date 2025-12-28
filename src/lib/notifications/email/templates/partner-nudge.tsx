import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from '@react-email/components';

interface PartnerNudgeEmailProps {
  recipientName: string;
  senderName: string;
  message?: string;
  ritualUrl: string;
  unsubscribeUrl: string;
}

export function PartnerNudgeEmail({
  recipientName,
  senderName,
  message,
  ritualUrl,
  unsubscribeUrl,
}: PartnerNudgeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{senderName} is ready to plan the week with you!</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>Family OS</Heading>
          </Section>

          {/* Nudge Content */}
          <Section style={nudgeSection}>
            <div style={emojiContainer}>
              <span style={emoji}>&#128075;</span>
            </div>
            <Heading style={h1}>Hey {recipientName}!</Heading>
            <Text style={mainText}>
              {senderName} is ready to sync up on this week&apos;s plan.
            </Text>
            {message && (
              <div style={messageBox}>
                <Text style={messageText}>&ldquo;{message}&rdquo;</Text>
              </div>
            )}
          </Section>

          {/* CTA Button */}
          <Section style={ctaSection}>
            <Button style={ctaButton} href={ritualUrl}>
              Start Your Weekly Ritual
            </Button>
            <Text style={ctaSubtext}>
              Takes about 5 minutes - then you can sync up together
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this because {senderName} sent you a nudge from Family OS.
            </Text>
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Stop receiving nudge notifications
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

const nudgeSection = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '32px',
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const emojiContainer = {
  marginBottom: '16px',
};

const emoji = {
  fontSize: '48px',
};

const h1 = {
  fontFamily: 'Georgia, serif',
  fontSize: '24px',
  fontWeight: 'normal' as const,
  color: '#3D3630',
  margin: '0 0 16px',
};

const mainText = {
  fontSize: '16px',
  color: '#5C534A',
  margin: '0',
  lineHeight: '1.5',
};

const messageBox = {
  backgroundColor: '#F8F6F4',
  borderRadius: '8px',
  padding: '16px',
  marginTop: '20px',
};

const messageText = {
  fontSize: '15px',
  color: '#5C534A',
  fontStyle: 'italic' as const,
  margin: '0',
};

const ctaSection = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const ctaButton = {
  backgroundColor: '#6B9E8C',
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

export default PartnerNudgeEmail;
