'use client';

import { useState, useEffect } from 'react';
import { Card, Input } from '@/components/shared';

interface PhoneVerificationStatus {
  phoneNumber: string | null;
  phoneVerified: boolean;
}

export default function SMSSettingsPage() {
  const [status, setStatus] = useState<PhoneVerificationStatus>({
    phoneNumber: null,
    phoneVerified: false,
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [phoneError, setPhoneError] = useState('');
  const [codeError, setCodeError] = useState('');

  // Fetch current verification status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/sms/verify');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
          if (data.phoneNumber) {
            setPhoneNumber(data.phoneNumber);
          }
        }
      } catch (error) {
        console.error('Failed to fetch phone verification status:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStatus();
  }, []);

  // Show toast notification
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Send verification code
  const handleSendCode = async () => {
    setPhoneError('');

    if (!phoneNumber.trim()) {
      setPhoneError('Please enter a phone number');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setCodeSent(true);
        // The API will have formatted the phone number
        if (data.phoneNumber) {
          setPhoneNumber(data.phoneNumber);
          setStatus({ phoneNumber: data.phoneNumber, phoneVerified: false });
        }
        showToast('success', 'Verification code sent to your phone');
      } else {
        setPhoneError(data.error || 'Failed to send verification code');
        showToast('error', data.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Failed to send code:', error);
      setPhoneError('Failed to send verification code');
      showToast('error', 'Failed to send verification code');
    } finally {
      setIsSending(false);
    }
  };

  // Verify code
  const handleVerifyCode = async () => {
    setCodeError('');

    if (!verificationCode.trim()) {
      setCodeError('Please enter the verification code');
      return;
    }

    if (verificationCode.length !== 6) {
      setCodeError('Code must be 6 digits');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ ...status, phoneVerified: true });
        setCodeSent(false);
        setVerificationCode('');
        showToast('success', 'Phone number verified successfully');
      } else {
        setCodeError(data.error || 'Invalid verification code');
        showToast('error', data.error || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Failed to verify code:', error);
      setCodeError('Failed to verify code');
      showToast('error', 'Failed to verify code');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle phone number change
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
    setPhoneError('');
    if (status.phoneVerified) {
      setStatus({ ...status, phoneVerified: false });
    }
    if (codeSent) {
      setCodeSent(false);
    }
  };

  // Handle verification code change
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
    setCodeError('');
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-b border-border bg-surface px-6 py-4">
          <h1 className="font-serif text-xl text-text-primary">SMS Settings</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-text-tertiary">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface px-6 py-4">
        <h1 className="font-serif text-xl text-text-primary">SMS Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Verify your phone number to receive SMS notifications
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Toast Notification */}
          {toast && (
            <div className="fixed top-4 right-4 z-50">
              <div
                className={`${
                  toast.type === 'success' ? 'bg-accent-calm' : 'bg-accent-alert'
                } text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in-up`}
              >
                <p className="text-sm font-medium">{toast.message}</p>
              </div>
            </div>
          )}

          {/* Phone Verification */}
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Phone Number Verification
            </h2>

            <Card className="space-y-6">
              {/* Verification Status */}
              {status.phoneNumber && (
                <div className="flex items-center gap-3 pb-6 border-b border-border">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      status.phoneVerified
                        ? 'bg-accent-calm/10'
                        : 'bg-accent-alert/10'
                    }`}
                  >
                    {status.phoneVerified ? (
                      <svg className="h-5 w-5 text-accent-calm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-accent-alert" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">
                      {status.phoneVerified ? 'Verified' : 'Not Verified'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {status.phoneNumber}
                    </p>
                  </div>
                  {status.phoneVerified && (
                    <div className="px-3 py-1 rounded-full bg-accent-calm/10 text-accent-calm text-xs font-medium">
                      Active
                    </div>
                  )}
                </div>
              )}

              {/* Phone Number Input */}
              <div>
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+1 555 123 4567"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  error={phoneError}
                  disabled={isSending || (status.phoneVerified && status.phoneNumber === phoneNumber)}
                />
                <p className="text-xs text-text-tertiary mt-1">
                  Enter your phone number in international format (e.g., +1 for US)
                </p>
              </div>

              {/* Send Code Button */}
              <button
                onClick={handleSendCode}
                disabled={isSending || !phoneNumber || (status.phoneVerified && status.phoneNumber === phoneNumber)}
                className={`w-full px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  isSending || !phoneNumber || (status.phoneVerified && status.phoneNumber === phoneNumber)
                    ? 'bg-text-tertiary/20 text-text-tertiary cursor-not-allowed'
                    : 'bg-accent-primary text-white hover:bg-accent-primary/90'
                }`}
              >
                {isSending ? 'Sending...' : codeSent ? 'Resend Code' : 'Send Verification Code'}
              </button>

              {/* Verification Code Input (shown after code sent) */}
              {codeSent && !status.phoneVerified && (
                <>
                  <div className="border-t border-border pt-6" />

                  <div className="bg-accent-calm/5 border border-accent-calm/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-accent-calm mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-text-primary">Code sent!</p>
                        <p className="text-sm text-text-secondary mt-0.5">
                          Check your phone for a 6-digit verification code. The code expires in 10 minutes.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Input
                      label="Verification Code"
                      type="text"
                      inputMode="numeric"
                      placeholder="123456"
                      value={verificationCode}
                      onChange={handleCodeChange}
                      error={codeError}
                      maxLength={6}
                    />
                  </div>

                  <button
                    onClick={handleVerifyCode}
                    disabled={isVerifying || verificationCode.length !== 6}
                    className={`w-full px-4 py-2.5 rounded-lg font-medium transition-colors ${
                      isVerifying || verificationCode.length !== 6
                        ? 'bg-text-tertiary/20 text-text-tertiary cursor-not-allowed'
                        : 'bg-accent-calm text-white hover:bg-accent-calm/90'
                    }`}
                  >
                    {isVerifying ? 'Verifying...' : 'Verify Code'}
                  </button>
                </>
              )}
            </Card>
          </section>

          {/* SMS Notification Info */}
          {status.phoneVerified && (
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                SMS Notifications
              </h2>
              <Card>
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-accent-calm mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-text-primary">SMS notifications enabled</p>
                    <p className="text-sm text-text-secondary mt-1">
                      You will receive proactive insights and important updates via SMS at {status.phoneNumber}.
                    </p>
                  </div>
                </div>
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
