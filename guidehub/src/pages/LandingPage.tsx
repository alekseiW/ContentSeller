import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CheckCircle2, Dumbbell, FileText, Map, Sparkles } from 'lucide-react'

const showcaseCards = [
  {
    title: 'Weekend in Istanbul',
    label: 'Journey Guide',
    meta: 'Travel creator',
    note: 'Routes, food stops, maps, logistics.',
    accent: '#1F7A8C',
    soft: '#E4F3F5',
  },
  {
    title: 'Hybrid Strength Cycle',
    label: 'Protocol Program',
    meta: 'Fitness coach',
    note: 'Phases, weekly sessions, progression.',
    accent: '#6A8A24',
    soft: '#F1F5DF',
  },
  {
    title: 'Launch Playbook',
    label: 'Tactical Playbook',
    meta: 'Creator strategist',
    note: 'Frameworks, templates, launch checklists.',
    accent: '#3458D8',
    soft: '#E7ECFF',
  },
]

const formatCards = [
  {
    icon: Map,
    title: 'Journey-led products',
    description: 'Travel guides, relocation packs, destination handbooks, and route-based content.',
  },
  {
    icon: Dumbbell,
    title: 'Protocol-led products',
    description: 'Training programs, nutrition systems, performance plans, and structured progression.',
  },
  {
    icon: FileText,
    title: 'Playbook-led products',
    description: 'Creator systems, operational manuals, checklists, and expert frameworks.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--gh-bg)', color: 'var(--gh-text)' }}>
      <header
        className="sticky top-0 z-30 border-b"
        style={{ borderColor: 'var(--gh-line)', background: 'rgba(251, 248, 243, 0.9)', backdropFilter: 'blur(12px)' }}
      >
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="gh-brand-mark">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="gh-kicker">Studio Catalog</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--gh-ink)' }}>GuideHub</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-3 sm:flex">
            <Link to="/catalog" className="btn-ghost">Catalog</Link>
            <Link to="/login" className="btn-ghost">Log in</Link>
            <Link to="/register" className="btn-primary">
              Start publishing
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="gh-page pt-10 lg:pt-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)] lg:items-end">
            <div>
              <p className="gh-kicker">Sell packaged expertise with range, not a niche lock-in</p>
              <h1 className="max-w-5xl">
                Guides, programs, and playbooks that feel designed to be bought.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8" style={{ color: 'var(--gh-muted)' }}>
                GuideHub gives creators one place to package expertise into premium digital products.
                Travel bloggers can sell city guides, trainers can sell structured programs, and specialists can
                publish tactical playbooks without forcing everything into the same template.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="btn-primary">
                  Create your first guide
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/catalog" className="btn-secondary">
                  Explore the catalog
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {['Travel guides', 'Workout programs', 'Creator playbooks', 'Paid checklists'].map((item) => (
                  <span key={item} className="gh-pill">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="gh-surface-featured p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="gh-kicker">Cover-first marketplace</p>
                  <p className="text-sm" style={{ color: 'var(--gh-muted)' }}>
                    Each product carries its own visual character.
                  </p>
                </div>
                <span className="gh-pill">GuideHub</span>
              </div>

              <div className="grid gap-4">
                {showcaseCards.map((card) => (
                  <article key={card.title} className="gh-product-card" style={{ ['--gh-skin-soft' as string]: card.soft }}>
                    <div className="gh-product-cover aspect-[5/3] p-5">
                      <span className="gh-cover-label">{card.label}</span>
                      <div className="mt-16 max-w-[16rem]">
                        <p className="gh-kicker" style={{ color: card.accent }}>{card.meta}</p>
                        <h3 className="mt-2 text-3xl">{card.title}</h3>
                        <p className="mt-3 text-sm leading-6" style={{ color: 'var(--gh-muted)' }}>
                          {card.note}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y" style={{ borderColor: 'var(--gh-line)' }}>
          <div className="gh-page py-12">
            <div className="mb-10 max-w-2xl">
              <p className="gh-kicker">One platform, multiple product languages</p>
              <h2 className="mt-3">Built for mixed expertise, not one creator archetype.</h2>
              <p className="gh-section-copy mt-4">
                The platform stays consistent and trustworthy. The product page adapts its rhythm to the format:
                journey, protocol, or playbook.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {formatCards.map(({ icon: Icon, title, description }) => (
                <article key={title} className="gh-surface p-6">
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/75 text-brand-600 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-[2rem]">{title}</h3>
                  <p className="mt-4 text-sm leading-7" style={{ color: 'var(--gh-muted)' }}>
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="gh-page py-12">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="gh-surface p-6 sm:p-8">
              <p className="gh-kicker">Why creators stay</p>
              <h2 className="mt-3 max-w-3xl">The platform feels premium before you even click the buy button.</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  ['Cover-first storefront', 'Products feel like designed editions, not uploaded files.'],
                  ['Flexible formats', 'You can sell a guide, a program, or a playbook without changing tools.'],
                  ['Single publishing flow', 'Draft, price, preview, and publish from the same studio.'],
                ].map(([title, copy]) => (
                  <div key={title} className="gh-surface-muted p-4">
                    <p className="gh-kicker">0{title.charCodeAt(0) % 9}</p>
                    <p className="mt-3 text-base font-semibold" style={{ color: 'var(--gh-ink)' }}>
                      {title}
                    </p>
                    <p className="mt-2 text-sm leading-6" style={{ color: 'var(--gh-muted)' }}>
                      {copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="gh-surface-featured p-6 sm:p-8">
              <p className="gh-kicker">What publishing looks like</p>
              <div className="mt-5 space-y-4">
                {[
                  'Paste existing notes or generate a first draft with AI.',
                  'Choose a visual direction that matches the product format.',
                  'Set price, preview rules, and publish a page that looks made to sell.',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[20px] bg-white/70 px-4 py-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand-600" />
                    <p className="text-sm leading-7" style={{ color: 'var(--gh-text)' }}>{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-[24px] border px-4 py-5" style={{ borderColor: 'rgba(23, 19, 16, 0.08)', background: 'rgba(23, 19, 16, 0.04)' }}>
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-brand-600" />
                  <p className="text-sm font-semibold" style={{ color: 'var(--gh-ink)' }}>
                    Creator tools stay structured. Public pages stay expressive.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gh-page pt-0">
          <div className="gh-surface-featured p-6 text-center sm:p-10">
            <p className="gh-kicker">Start with GuideHub</p>
            <h2 className="mt-3">Turn what you know into a product people want to keep.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8" style={{ color: 'var(--gh-muted)' }}>
              Publish your first guide now, then expand into programs or playbooks when your catalog grows.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register" className="btn-primary">Open your studio</Link>
              <Link to="/guide/demo/istanbul-3-days" className="btn-secondary">See a live example</Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
