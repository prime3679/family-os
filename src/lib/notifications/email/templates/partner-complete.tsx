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

interface PartnerCompleteEmailProps {
  recipientName: string;
  partnerName: string;
  weekRange: string;
  ritualUrl: string;
  unsubscribeUrl: string;
}

export function PartnerCompleteEmail({
  recipientName,
  partnerName,
  weekRange,
  ritualUrl,
  unsubscribeUrl,
}: PartnerCompleteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{partnerName} finished their weekly planning - time to sync!</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>Family OS</Heading>
          </Section>

          {/* Content */}
          <Section style={contentSection}>
            <div style={emojiContainer}>
              <span style={emoji}>&#10024;</span>
            </div>
            <Heading style={h1}>Time to sync up, {recipientName}!</Heading>
            <Text style={mainText}>
              {partnerName} just finished their weekly planning ritual for {weekRange}.
            </Text>
            <Text style={subText}>
              Complete your ritual so you can compare notes and sync on any decisions that differ.
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={ctaSection}>
            <Button style={ctaButton} href={ritualUrl}>
              Finish Your Ritual
            </Button>
            <Text style={ctaSubtext}>
              Then you&apos;ll be able to sync up together
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this because you enabled partner notifications in Family OS.
            </Text>
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Turn off partner completion emails
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

const contentSection = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '32px',
  textAlign: 'center' as const,
  marginBottom: '32px',
  borderTop: '4px solid #6B9E8C',
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
  color: '#3D3630',
  margin: '0 0 12px',
  lineHeight: '1.5',
};

const subText = {
  fontSize: '15px',
  color: '#5C534A',
  margin: '0',
  lineHeight: '1.5',
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

export default PartnerCompleteEmail;
