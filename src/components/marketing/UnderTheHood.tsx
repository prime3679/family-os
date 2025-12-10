const systemFeatures = [
  'Merges calendars',
  'Detects overlaps',
  'Groups events by day/time',
  'Tracks logistics constraints',
];

const aiFeatures = [
  'Writes the weekly summary',
  'Suggests 3–5 recommendations',
  'Generates checklists for key routines',
  'Learns your family patterns',
];

export default function UnderTheHood() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Under the hood
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            AI without the magic smoke
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {/* System column */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">What the system does</h3>
            </div>
            <ul className="mt-6 space-y-3">
              {systemFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* AI column */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Where AI steps in</h3>
            </div>
            <ul className="mt-6 space-y-3">
              {aiFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-600">
          The logic is transparent: you can see the events and conflicts the AI is working from.
        </p>
      </div>
    </section>
  );
}
