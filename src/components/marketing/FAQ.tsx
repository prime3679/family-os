'use client';

import { useState } from 'react';

const faqs = [
  {
    question: 'Is this replacing Google Calendar?',
    answer: 'No. Family OS sits on top of your existing calendars to give you a household-level view. Your calendars stay exactly where they are — we just read from them to build your weekly picture.',
  },
  {
    question: 'Does it auto-reschedule things?',
    answer: 'Not in v1. It surfaces conflicts and proposes changes; you stay in control. We believe the weekly planning ritual is about having a conversation with your co-parent, not delegating decisions to software.',
  },
  {
    question: 'Who can see our data?',
    answer: 'For v1, just you (and your co-parent if you share a household). Everything is stored in a private database and used only to generate your weekly plans and checklists. We don\'t sell data or use it for advertising.',
  },
  {
    question: 'How long does the weekly ritual take?',
    answer: 'Most families complete their weekly planning in 10-15 minutes. The AI summary and recommendations are designed to surface what matters so you can focus on decisions, not data gathering.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-12 divide-y divide-slate-200">
          {faqs.map((faq, index) => (
            <div key={faq.question} className="py-6">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-start justify-between text-left"
              >
                <span className="text-base font-medium text-slate-900">
                  {faq.question}
                </span>
                <span className="ml-6 flex h-7 items-center">
                  <svg
                    className={`h-5 w-5 text-slate-500 transition-transform ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>
              {openIndex === index && (
                <p className="mt-4 text-slate-600 leading-relaxed">
                  {faq.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
