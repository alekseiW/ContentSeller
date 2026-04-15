import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Check, Loader2, Lock, Users } from 'lucide-react'
import { guidesApi, analyticsApi, paymentsApi } from '@/lib/api'
import { getGuideBrand } from '@/lib/brand'
import { extractSectionHtml, redactPaidInlineHtml, redactPaidBlocksHtml, sanitizeRichHtml } from '@/lib/editorContent'
import { formatPrice } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

interface GuideData {
  id: string
  title: string
  description: string
  cover_image: string | null
  accent_color: string
  template: string
  show_preview: boolean
  is_course: boolean
  price: number
  author: {
    name: string
    username: string
    bio: string
    avatar_url: string
  }
  sections: Array<{
    id: string
    title: string
    content: unknown
    order: number
    hidden_until_payment: boolean
  }>
  hasPurchased?: boolean
}

export function PublicGuidePage() {
  const { username, slug } = useParams<{ username: string; slug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [guide, setGuide] = useState<GuideData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasPurchased, setHasPurchased] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const initialized = useAuthStore((s) => s.initialized)

  const markGuideAsPurchased = (guideId: string) => {
    const purchasedGuides: string[] = JSON.parse(localStorage.getItem('purchased_guides') || '[]')
    if (!purchasedGuides.includes(guideId)) {
      localStorage.setItem('purchased_guides', JSON.stringify([...purchasedGuides, guideId]))
    }
    setHasPurchased(true)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const orderIdFromUrl = params.get('orderId')

    async function load() {
      if (!username || !slug) return
      setLoading(true)
      setPaymentError(null)
      try {
        const data = await guidesApi.getPublic(username, slug) as unknown as GuideData
        setGuide(data)

        const purchasedGuides: string[] = JSON.parse(localStorage.getItem('purchased_guides') || '[]')
        const guidePurchased = purchasedGuides.includes(data.id)
        if (guidePurchased || params.get('purchased') === 'true' || data.hasPurchased) {
          setHasPurchased(true)
        }

        if (orderIdFromUrl) {
          try {
            const order = await paymentsApi.getStatus(orderIdFromUrl)
            if (order.status === 'completed') {
              markGuideAsPurchased(data.id)
              setPaymentInfo('Payment confirmed. Full access unlocked.')
              await analyticsApi.track(data.id, 'purchase', {
                source: 'payment_return',
                orderId: order.id,
              }).catch(() => undefined)
            } else if (order.status === 'pending' || order.status === 'waiting') {
              setPaymentInfo('Payment is still processing. Please refresh in a few seconds.')
            }
          } catch {
            setPaymentError('Could not verify payment status yet.')
          }
        }

        try {
          await analyticsApi.track(data.id, 'view', { source: 'direct' })
        } catch {
          // Analytics tracking is non-critical
        }
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load guide')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [location.search, slug, username])

  const handleBuy = async () => {
    if (!guide) return

    setPaymentError(null)
    setPaymentInfo(null)

    if (!initialized) return

    if (!user) {
      const nextPath = `${location.pathname}${location.search}`
      navigate('/login', { state: { from: nextPath } })
      return
    }

    setPaymentLoading(true)
    try {
      await analyticsApi.track(guide.id, 'checkout_start', { source: 'public_page' }).catch(() => undefined)

      const payment = await paymentsApi.create(
        guide.id,
        user.email,
        profile?.full_name || undefined,
      )

      if (payment.confirmation_url) {
        window.location.href = payment.confirmation_url
        return
      }

      const order = await paymentsApi.getStatus(payment.orderId)
      if (order.status === 'completed') {
        markGuideAsPurchased(guide.id)
        setPaymentInfo('Payment completed. Full access unlocked.')
      } else {
        setPaymentInfo('Order created. Complete payment in the opened checkout.')
      }
    } catch (err: any) {
      setPaymentError(err?.message ?? 'Failed to start payment. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--gh-bg)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (error || !guide) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6" style={{ background: 'var(--gh-bg)' }}>
        <div className="gh-empty-state max-w-xl px-8 py-12 text-center">
          <p className="gh-kicker">GuideHub product page</p>
          <h1 className="mt-3 text-[2.8rem]">Guide not found</h1>
          <p className="mt-4 text-base leading-7" style={{ color: 'var(--gh-muted)' }}>
            {error || 'The guide you are looking for does not exist anymore.'}
          </p>
          <Link to="/catalog" className="btn-primary mt-8 inline-flex">
            Back to catalog
          </Link>
        </div>
      </div>
    )
  }

  const brand = getGuideBrand(guide.template, guide.is_course)
  const previewEnabled = guide.show_preview && !hasPurchased
  const previewSections = previewEnabled ? guide.sections.filter((section) => !section.hidden_until_payment) : []
  const hiddenSections = hasPurchased
    ? []
    : guide.sections.filter((section) => !previewEnabled || section.hidden_until_payment)
  const visibleSections = hasPurchased ? guide.sections : previewSections
  const initials = guide.author.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const renderContent = (content: unknown) => {
    const html = extractSectionHtml(content)
    const redacted = hasPurchased ? html : redactPaidBlocksHtml(redactPaidInlineHtml(html))
    const safeHtml = sanitizeRichHtml(redacted)

    return <div className="gh-public-content" dangerouslySetInnerHTML={{ __html: safeHtml }} />
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'var(--gh-bg)',
        ['--gh-skin-soft' as string]: brand.soft,
        ['--gh-skin-accent' as string]: brand.accent,
      }}
    >
      <section className="gh-page pb-10 pt-8 lg:pt-10">
        <Link to="/catalog" className="btn-ghost mb-6 inline-flex">
          <ArrowLeft className="h-4 w-4" />
          Back to catalog
        </Link>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="gh-surface-featured p-6 sm:p-8 lg:p-10">
            <p className="gh-kicker" style={{ color: brand.accent }}>{brand.eyebrow}</p>
            <h1 className="mt-4 max-w-4xl">{guide.title}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8" style={{ color: 'var(--gh-muted)' }}>
              {guide.description || brand.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="gh-pill" style={{ color: brand.accent }}>{brand.label}</span>
              <span className="gh-pill">{guide.sections.length} chapters</span>
              <span className="gh-pill">Lifetime access</span>
            </div>

            <div className="mt-10 flex items-center gap-4">
              {guide.author.avatar_url ? (
                <img src={guide.author.avatar_url} alt="" className="h-14 w-14 rounded-[18px] object-cover" />
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-[18px] text-sm font-semibold"
                  style={{ background: 'rgba(23, 19, 16, 0.06)', color: 'var(--gh-ink)' }}
                >
                  {initials}
                </div>
              )}
              <div>
                <Link to={`/author/${guide.author.username}`} className="text-base font-semibold" style={{ color: 'var(--gh-ink)' }}>
                  {guide.author.name}
                </Link>
                <p className="mt-1 text-sm" style={{ color: 'var(--gh-muted)' }}>
                  {guide.author.bio || 'Independent creator publishing premium digital products.'}
                </p>
              </div>
            </div>
          </div>

          <aside className="gh-purchase-rail xl:sticky xl:top-6 xl:self-start">
            <div className="gh-product-cover aspect-[4/5] p-5">
              {guide.cover_image ? (
                <img src={guide.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <span className="gh-cover-label">{brand.label}</span>
                  <div>
                    <p className="gh-kicker" style={{ color: brand.accent }}>GuideHub Edition</p>
                    <h2 className="mt-2 text-[2.4rem] leading-none">{guide.title}</h2>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <p className="gh-kicker">One-time access</p>
              <p className="gh-price mt-3">{formatPrice(guide.price)}</p>
              <p className="mt-3 text-sm leading-7" style={{ color: 'var(--gh-muted)' }}>
                {hasPurchased
                  ? 'This product is unlocked on your account.'
                  : previewEnabled
                    ? 'Preview what is visible, then unlock the full product when you are ready.'
                    : 'Preview is hidden. Purchase to unlock the full experience immediately.'}
              </p>

              <button onClick={handleBuy} disabled={paymentLoading || hasPurchased} className="btn-primary mt-5 w-full">
                {hasPurchased ? 'Access unlocked' : paymentLoading ? 'Redirecting to checkout...' : user ? 'Unlock full access' : 'Log in to buy'}
              </button>

              {paymentError && (
                <p className="mt-3 text-sm" style={{ color: 'var(--gh-danger)' }}>
                  {paymentError}
                </p>
              )}
              {paymentInfo && !paymentError && (
                <p className="mt-3 text-sm" style={{ color: 'var(--gh-success)' }}>
                  {paymentInfo}
                </p>
              )}

              <div className="mt-6">
                <div className="gh-ledger-row">
                  <span className="gh-meta">Format</span>
                  <span>{brand.label}</span>
                </div>
                <div className="gh-ledger-row">
                  <span className="gh-meta">Sections</span>
                  <span>{guide.sections.length}</span>
                </div>
                <div className="gh-ledger-row">
                  <span className="gh-meta">Preview</span>
                  <span>{guide.show_preview ? 'Enabled' : 'Hidden'}</span>
                </div>
                <div className="gh-ledger-row">
                  <span className="gh-meta">Publisher</span>
                  <span>@{guide.author.username}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="gh-page pt-0">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="gh-surface p-6 sm:p-8">
              <p className="gh-kicker">Product map</p>
              <h2 className="mt-3">What is inside</h2>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {guide.sections.map((section, index) => {
                  const locked = !hasPurchased && (!guide.show_preview || section.hidden_until_payment)
                  return (
                    <div key={section.id} className="gh-surface-muted flex items-start gap-3 p-4">
                      <div
                        className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                        style={
                          locked
                            ? { background: 'rgba(23, 19, 16, 0.08)', color: 'var(--gh-muted)' }
                            : { background: 'rgba(184, 92, 56, 0.12)', color: 'var(--gh-brand)' }
                        }
                      >
                        {locked ? <Lock className="h-4 w-4" /> : String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--gh-ink)' }}>{section.title}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--gh-muted)' }}>
                          {locked ? 'Locked until purchase' : 'Preview available'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="gh-surface p-6 sm:p-8">
              <p className="gh-kicker">{hasPurchased ? 'Unlocked product' : guide.show_preview ? 'Preview' : 'Locked preview'}</p>
              <h2 className="mt-3">{hasPurchased ? 'Full product content' : 'Preview reading'}</h2>

              {visibleSections.length > 0 ? (
                <div className="mt-8 space-y-10">
                  {visibleSections.map((section) => (
                    <article key={section.id}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-[2rem] leading-none">{section.title}</h3>
                        {!hasPurchased && section.hidden_until_payment && (
                          <span className="gh-pill" style={{ color: brand.accent }}>Paid chapter</span>
                        )}
                      </div>
                      {renderContent(section.content)}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="gh-surface-muted mt-8 p-6">
                  <p className="gh-kicker">Preview disabled</p>
                  <p className="mt-3 text-base leading-7" style={{ color: 'var(--gh-muted)' }}>
                    This product does not expose a free preview. Purchase it to unlock every section immediately.
                  </p>
                </div>
              )}

              {!hasPurchased && hiddenSections.length > 0 && (
                <div className="gh-surface-featured mt-10 p-6 sm:p-8">
                  <p className="gh-kicker" style={{ color: brand.accent }}>Still locked</p>
                  <h3 className="mt-3 text-[2.2rem] leading-none">Unlock {hiddenSections.length} more section{hiddenSections.length > 1 ? 's' : ''}.</h3>
                  <p className="mt-4 max-w-2xl text-base leading-7" style={{ color: 'var(--gh-muted)' }}>
                    The remainder of this product stays behind the purchase wall so the full framework, route, or program keeps its value.
                  </p>
                  <div className="mt-6 space-y-3">
                    {hiddenSections.map((section) => (
                      <div key={section.id} className="gh-surface-muted flex items-center gap-3 px-4 py-3">
                        <Lock className="h-4 w-4" style={{ color: brand.accent }} />
                        <span className="text-sm" style={{ color: 'var(--gh-ink)' }}>{section.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="gh-surface p-6 sm:p-8">
              <p className="gh-kicker">About the creator</p>
              <div className="mt-5 flex flex-col gap-5 sm:flex-row">
                {guide.author.avatar_url ? (
                  <img src={guide.author.avatar_url} alt="" className="h-20 w-20 rounded-[24px] object-cover" />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-[24px] text-lg font-semibold"
                    style={{ background: 'rgba(23, 19, 16, 0.06)', color: 'var(--gh-ink)' }}
                  >
                    {initials}
                  </div>
                )}
                <div>
                  <h3 className="text-[2rem] leading-none">{guide.author.name}</h3>
                  <Link to={`/author/${guide.author.username}`} className="mt-2 inline-flex text-sm font-medium" style={{ color: brand.accent }}>
                    @{guide.author.username}
                  </Link>
                  <p className="mt-4 max-w-2xl text-base leading-7" style={{ color: 'var(--gh-muted)' }}>
                    {guide.author.bio || 'An independent creator publishing expertise in premium digital format.'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <div className="gh-surface p-6">
              <p className="gh-kicker">Section index</p>
              <div className="mt-5 space-y-3">
                {guide.sections.map((section, index) => (
                  <div key={section.id} className="flex items-center gap-3 rounded-[18px] bg-white/60 px-3 py-3">
                    <span className="gh-meta">{String(index + 1).padStart(2, '0')}</span>
                    <span className="text-sm" style={{ color: 'var(--gh-text)' }}>{section.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="gh-surface p-6">
              <p className="gh-kicker">Trust layer</p>
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3 rounded-[18px] bg-white/60 px-4 py-4">
                  <Check className="mt-0.5 h-4 w-4 text-brand-600" />
                  <p className="text-sm leading-6" style={{ color: 'var(--gh-text)' }}>
                    Instant access after payment. No recurring billing.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-[18px] bg-white/60 px-4 py-4">
                  <Users className="mt-0.5 h-4 w-4 text-brand-600" />
                  <p className="text-sm leading-6" style={{ color: 'var(--gh-text)' }}>
                    Product sold directly by the creator through GuideHub.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
