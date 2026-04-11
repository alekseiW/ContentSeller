import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileText,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-brand-600" />
            <span className="text-xl font-bold">GuideHub</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-neutral-200 bg-white">
        <div className="absolute -left-24 top-[-100px] h-80 w-80 rounded-full bg-brand-200/30 blur-3xl" />
        <div className="absolute -right-20 top-8 h-72 w-72 rounded-full bg-cyan-200/25 blur-3xl" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              <Sparkles className="h-4 w-4" />
              AI-powered publishing
            </div>
            <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Turn any draft into a
              <span className="bg-gradient-to-r from-brand-600 to-cyan-500 bg-clip-text text-transparent"> paid guide </span>
              in 5 minutes
            </h1>
            <p className="mt-5 max-w-xl text-lg text-neutral-600">
              Paste text, polish with AI, set a price, and share one link. Built for creators who sell knowledge, not
              software.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-200 transition hover:bg-brand-700"
              >
                Create your first guide - free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/guide/demo/istanbul-guide"
                className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50"
              >
                See example page
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-6 text-sm text-neutral-500">
              <span>Local payments</span>
              <span>Auto delivery</span>
              <span>AI packaging</span>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl shadow-neutral-300/30">
            <div className="rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 p-6 text-white">
              <p className="text-xs uppercase tracking-wide text-white/80">Guide Preview</p>
              <h3 className="mt-2 text-2xl font-bold">Istanbul in 3 Days</h3>
              <p className="mt-2 text-sm text-white/90">Food spots, routes, transport hacks, and budget tips.</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="h-3 w-4/5 rounded bg-neutral-200" />
              <div className="h-3 w-3/5 rounded bg-neutral-200" />
              <div className="h-3 w-5/6 rounded bg-neutral-200" />
              <div className="mt-6 flex items-center justify-between rounded-xl border border-neutral-200 p-4">
                <span className="text-2xl font-bold">490 RUB</span>
                <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Buy guide</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold">How it works</h2>
          <p className="mt-2 text-neutral-600">From draft to sales in three steps</p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { icon: FileText, title: 'Paste text', desc: 'Import draft from notes, Telegram, or Google Docs.' },
            { icon: CreditCard, title: 'Set price', desc: 'Choose template, cover, and pricing in one screen.' },
            { icon: Share2, title: 'Publish link', desc: 'Share in Telegram and get paid instantly.' },
          ].map(({ icon: Icon, title, desc }, index) => (
            <article key={title} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Step {index + 1}</p>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-neutral-600">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-5 px-6 py-16 md:grid-cols-2">
          {[
            { icon: Users, title: 'Creators and bloggers', desc: 'Sell mini-guides, checklists, and niche bundles.' },
            { icon: TrendingUp, title: 'Experts and consultants', desc: 'Package your frameworks into paid digital products.' },
            { icon: BookOpen, title: 'Coaches and educators', desc: 'Launch mini-courses without complex LMS tools.' },
            { icon: Sparkles, title: 'Teams and studios', desc: 'Create premium playbooks and internal paid resources.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-neutral-200 p-5">
              <div className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                <Icon className="h-5 w-5 text-neutral-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-neutral-600">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold">Simple pricing</h2>
          <p className="mt-2 text-neutral-600">Start free. Upgrade when sales grow.</p>
        </div>
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-neutral-200 bg-white p-7">
            <h3 className="text-xl font-semibold">Free</h3>
            <p className="mt-3 text-4xl font-extrabold">0 RUB</p>
            <p className="mt-1 text-sm text-neutral-500">5% commission per sale</p>
            <ul className="mt-5 space-y-2 text-sm text-neutral-700">
              {['1 active product', 'Basic analytics', 'Local payment support'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-600" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/register" className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold">
              Start free
            </Link>
          </article>

          <article className="relative rounded-2xl bg-neutral-900 p-7 text-white shadow-xl">
            <span className="absolute right-5 top-4 rounded-full bg-brand-500 px-2.5 py-1 text-xs font-semibold">Recommended</span>
            <h3 className="text-xl font-semibold">Pro</h3>
            <p className="mt-3 text-4xl font-extrabold">790 RUB</p>
            <p className="mt-1 text-sm text-neutral-300">2% commission per sale</p>
            <ul className="mt-5 space-y-2 text-sm text-neutral-200">
              {['Unlimited products', 'AI cover generation', 'Custom domain', 'Anti-piracy tools'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-300" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900"
            >
              Upgrade to Pro
            </Link>
          </article>
        </div>
      </section>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <div className="flex items-center gap-2 text-neutral-800">
            <BookOpen className="h-5 w-5 text-brand-600" />
            <span className="font-semibold">GuideHub</span>
          </div>
          <div className="text-sm text-neutral-500">© 2026 GuideHub</div>
        </div>
      </footer>
    </div>
  )
}
