'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ChildInfo {
  name: string;
  color: string;
  avatarEmoji?: string;
  age?: number;
}

interface ParentContact {
  name: string;
  email: string;
  phoneNumber?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  period: string;
  ownerName: string;
  calendar: string;
}

interface CaretakerData {
  caretakerName: string;
  householdName: string;
  children: ChildInfo[];
  parents: ParentContact[];
  todayEvents: CalendarEvent[];
  validUntil: string;
  notes?: string;
}

export default function CaretakerAccessPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<CaretakerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/caretaker/${token}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Invalid or expired access link');
          return;
        }

        setData(result);
      } catch {
        setError('Failed to load caretaker information');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent-warm border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-4xl mb-4">🔒</div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              Access Not Available
            </h1>
            <p className="text-slate-600 mb-6">
              {error || 'This link may have expired or is invalid.'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-accent-primary px-6 py-3 text-white hover:bg-accent-primary/90 transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const periodEmoji: Record<string, string> = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌙',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary/10 mx-auto mb-4">
            <span className="text-2xl">👨‍👩‍👧‍👦</span>
          </div>
          <h1 className="text-2xl font-serif text-slate-900 mb-2">
            {data.householdName}
          </h1>
          <p className="text-slate-600">
            Hello, <span className="font-medium">{data.caretakerName}</span>!
          </p>
          <p className="text-sm text-slate-500 mt-1">{today}</p>
        </div>

        {/* Special notes */}
        {data.notes && (
          <div className="mb-6 rounded-xl bg-accent-warm/10 border border-accent-warm/30 p-4">
            <h3 className="font-medium text-slate-900 mb-2">Special Notes</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {data.notes}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Children */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Children
            </h2>
            <div className="space-y-3">
              {data.children.length > 0 ? (
                data.children.map((child, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-white font-medium"
                      style={{ backgroundColor: child.color }}
                    >
                      {child.avatarEmoji || child.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{child.name}</p>
                      {child.age !== undefined && (
                        <p className="text-sm text-slate-600">{child.age} years old</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm">No children information</p>
              )}
            </div>
          </section>

          {/* Today's Schedule */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Today&apos;s Schedule
            </h2>
            <div className="space-y-3">
              {data.todayEvents.length > 0 ? (
                data.todayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200"
                  >
                    <div className="text-xl">
                      {periodEmoji[event.period] || '📅'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{event.title}</p>
                      <p className="text-sm text-slate-600">{event.time}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {event.ownerName} • {event.calendar}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">
                  No events scheduled for today
                </p>
              )}
            </div>
          </section>

          {/* Parent Contacts */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Parent Contacts
            </h2>
            <div className="space-y-3">
              {data.parents.map((parent, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-parent-a to-parent-b text-white font-medium">
                    {parent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{parent.name}</p>
                    <p className="text-sm text-slate-600">{parent.email}</p>
                    {parent.phoneNumber && (
                      <a
                        href={`tel:${parent.phoneNumber}`}
                        className="text-sm text-accent-primary hover:underline mt-1 inline-block"
                      >
                        {parent.phoneNumber}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>
            This access link is valid until{' '}
            {new Date(data.validUntil).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p className="mt-2">Powered by Family OS</p>
        </div>
      </div>
    </div>
  );
}
