import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-white">F</span>
            </div>
            <span className="font-semibold text-slate-900">Family OS</span>
          </div>

          <nav className="flex gap-6 text-sm">
            <Link href="/privacy" className="text-slate-600 hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/terms" className="text-slate-600 hover:text-slate-900">
              Terms
            </Link>
            <Link href="/app" className="text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-8 text-center">
          <p className="text-sm text-slate-500">
            Built by a product leader experimenting with AI-native planning tools.
          </p>
        </div>
      </div>
    </footer>
  );
}
