const features = [
  'Multi-calendar aware (both parents)',
  'Kid-centric: daycare, doctors, activities',
  'Weekly ritual > real-time nagging',
];

export default function ForParents() {
  return (
    <section className="bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Designed for dual-career parents
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              Family OS is built for dual-career parents with young kids — the ones juggling daycare drop-offs, travel, meetings and bedtime all in the same 48 hours. It&apos;s not a generic planner. It&apos;s an operating system for one very specific kind of chaos.
            </p>
            <ul className="mt-8 space-y-4">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <svg
                    className="mt-1 h-5 w-5 flex-shrink-0 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-slate-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 p-8">
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="text-6xl font-bold text-primary/20">10-15</div>
                <div className="mt-2 text-lg font-medium text-slate-700">minutes per week</div>
                <div className="mt-1 text-sm text-slate-500">is all it takes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
