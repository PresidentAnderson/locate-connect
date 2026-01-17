import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">LocateConnect</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              Sign In
            </Link>
            <Link href="/cases/new" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">
              Report Missing Person
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center rounded-full bg-cyan-100 px-4 py-1.5 text-sm font-medium text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400">
              <span className="mr-2 h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
              Platform Under Development
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Helping Reunite
              <span className="block text-cyan-600">Missing Persons</span>
              with Their Families
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              LocateConnect is a comprehensive platform connecting families, law enforcement,
              and communities to coordinate missing persons investigations across Canada.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/cases/new"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 text-base font-medium text-white shadow-lg shadow-cyan-600/25 hover:bg-cyan-700 sm:w-auto"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Report Missing Person
              </Link>
              <Link
                href="/cases"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:w-auto"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Active Cases
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-white">
              How LocateConnect Works
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">File a Report</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Submit detailed missing person reports with photos, descriptions, and last known locations.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Real-time Alerts</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Receive notifications about case updates, new leads, and community tips.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Community Network</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Connect volunteers, law enforcement, and families in coordinated search efforts.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Law Enforcement Tools</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Dedicated dashboards for verified law enforcement to manage and prioritize cases.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/30">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Family Support</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Resources, peer support, and direct communication with assigned liaisons.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">Anonymous Tips</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Submit tips anonymously with AI-powered verification to help solve cases.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access Section */}
        <section className="border-t border-slate-200 py-16 dark:border-slate-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/law-enforcement" className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-cyan-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-600">
                <h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 dark:text-white">Law Enforcement</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Access LE dashboard and tools</p>
              </Link>
              <Link href="/family-support" className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-cyan-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-600">
                <h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 dark:text-white">Family Support</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Resources and peer connections</p>
              </Link>
              <Link href="/indigenous-liaison" className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-cyan-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-600">
                <h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 dark:text-white">Indigenous Liaison</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">MMIWG cases and community support</p>
              </Link>
              <Link href="/developers" className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-cyan-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-600">
                <h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 dark:text-white">Developers</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">API access and integrations</p>
              </Link>
            </div>
          </div>
        </section>

        {/* Emergency Banner */}
        <section className="border-t border-red-200 bg-red-50 py-8 dark:border-red-900 dark:bg-red-950/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                  <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-red-800 dark:text-red-300">In an emergency?</p>
                  <p className="text-sm text-red-700 dark:text-red-400">Call 911 immediately if someone is in danger</p>
                </div>
              </div>
              <a href="tel:911" className="rounded-lg bg-red-600 px-6 py-2.5 font-medium text-white hover:bg-red-700">
                Call 911
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">LocateConnect</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              A platform dedicated to reuniting missing persons with their families.
            </p>
            <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400">
              <Link href="/research-portal" className="hover:text-slate-900 dark:hover:text-white">Research</Link>
              <Link href="/archive" className="hover:text-slate-900 dark:hover:text-white">Archive</Link>
              <Link href="/settings/privacy" className="hover:text-slate-900 dark:hover:text-white">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
