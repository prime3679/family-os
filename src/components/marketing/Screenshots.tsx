const screenshots = [
  {
    title: 'This Week view',
    description: 'Your family\'s week at a glance',
  },
  {
    title: 'Conflicts panel',
    description: 'Spot scheduling issues early',
  },
  {
    title: 'Checklist example',
    description: 'AI-generated prep lists',
  },
];

export default function Screenshots() {
  return (
    <section className="bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            See it in action
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            A clean, calm interface designed for quick weekly check-ins
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {screenshots.map((screenshot) => (
            <div key={screenshot.title} className="group">
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow group-hover:shadow-md">
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 p-4">
                  <div className="text-center">
                    <div className="mx-auto h-12 w-12 rounded-lg bg-slate-200" />
                    <p className="mt-4 text-sm text-slate-400">Screenshot placeholder</p>
                  </div>
                </div>
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {screenshot.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {screenshot.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
