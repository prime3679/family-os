import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface UserEmailProps {
  senderName: string;
  recipientEmail: string;
  subject: string;
  body: string;
}

export function UserEmail({
  senderName,
  recipientEmail,
  subject,
  body,
}: UserEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Email Content */}
          <Section style={contentSection}>
            <Text style={bodyText}>{body}</Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Sent on behalf of {senderName} via Family OS
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#FFFFFF',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '580px',
};

const contentSection = {
  marginBottom: '32px',
};

const bodyText = {
  fontSize: '16px',
  color: '#333333',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap' as const,
};

const hr = {
  borderColor: '#E8E4E0',
  margin: '32px 0',
};

const footer = {
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '12px',
  color: '#999999',
  margin: '0',
};

export default UserEmail;
