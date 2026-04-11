import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BookOpen, Check, Users, Loader2 } from 'lucide-react'
import { guidesApi, analyticsApi, paymentsApi } from '@/lib/api'
import { extractSectionHtml, redactPaidInlineHtml, redactPaidBlocksHtml, sanitizeRichHtml } from '@/lib/editorContent'
import { useAuthStore } from '@/stores/authStore'

interface GuideData {
  id: string
  title: string
  description: string
  cover_image: string | null
  accent_color: string
  price: number
  author: { name: string; username: string; bio: string; avatar_url: string }
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

        // Already purchased from local state
        const purchasedGuides: string[] = JSON.parse(localStorage.getItem('purchased_guides') || '[]')
        const guidePurchased = purchasedGuides.includes(data.id)
        if (guidePurchased || params.get('purchased') === 'true' || data.hasPurchased) {
          setHasPurchased(true)
        }

        // Returned from payment with orderId in URL
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

        // Track view analytics
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
  }, [username, slug, location.search])

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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (error || !guide) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Guide not found</h1>
          <p className="mt-2 text-neutral-500">{error || 'The guide you\'re looking for doesn\'t exist.'}</p>
        </div>
      </div>
    )
  }

  const previewSections = guide.sections.filter((s) => !s.hidden_until_payment || hasPurchased)
  const hiddenSections = guide.sections.filter((s) => s.hidden_until_payment && !hasPurchased)

  // Format content for display
  const renderContent = (content: unknown) => {
    const html = extractSectionHtml(content)
    const redacted = hasPurchased ? html : redactPaidBlocksHtml(redactPaidInlineHtml(html))
    const safeHtml = sanitizeRichHtml(redacted)

    return (
      <div
        className="gh-public-content"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${guide.accent_color}, ${guide.accent_color}dd, #6d28d9)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 text-white sm:px-6 sm:py-24 md:px-8 md:py-32">
          <div className="mb-6 flex items-center gap-2 text-sm text-white/70">
            <BookOpen className="h-4 w-4" />
            Guide
          </div>
          <h1 className="text-2xl font-bold tracking-tight leading-tight sm:text-4xl md:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/80 leading-relaxed">
            {guide.description}
          </p>

          <div className="mt-8 flex items-center gap-3">
            {guide.author.avatar_url ? (
              <img src={guide.author.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white ring-2 ring-white/30">
                {guide.author.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            )}
            <div>
              <Link to={`/author/${guide.author.username}`} className="hover:underline">{guide.author.name}</Link>
              <p className="text-xs text-white/60">{guide.author.bio || 'Guide author'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* What's inside */}
        <section className="py-16">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            What&apos;s inside
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Here&apos;s what you&apos;ll get with this guide
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {guide.sections.map((section) => (
              <div
                key={section.id}
                className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-5 py-3.5"
              >
                {hasPurchased || !section.hidden_until_payment ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />
                )}
                <span className="text-sm text-neutral-700">{section.title}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Preview content */}
        <section className="py-8">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Preview</h2>
          <div className="mt-6 space-y-8">
            {previewSections.map((section) => (
              <div key={section.id}>
                <h3 className="text-lg font-semibold text-neutral-900">{section.title}</h3>
                {renderContent(section.content)}
              </div>
            ))}
          </div>

          {/* Curtain overlay for hidden sections */}
          {hiddenSections.length > 0 && (
            <div className="relative mt-12">
              <div className="overflow-hidden rounded-2xl">
                <div className="rounded-2xl bg-gradient-to-b from-neutral-100 to-neutral-200 p-8">
                  <div className="space-y-3">
                    <div className="h-4 w-3/4 rounded-full bg-neutral-300" />
                    <div className="h-4 w-1/2 rounded-full bg-neutral-300" />
                    <div className="h-4 w-5/6 rounded-full bg-neutral-300" />
                    <div className="h-4 w-2/3 rounded-full bg-neutral-300" />
                  </div>
                </div>
              </div>
              <div
                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-b from-white/80 via-white/90 to-white/95"
                style={{ backdropFilter: 'blur(8px)' }}
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
                    <BookOpen className="h-6 w-6 text-brand-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    Get full access to read the rest
                  </h3>
                  <p className="mt-1.5 text-sm text-neutral-500">
                    Purchase this guide to unlock all {guide.sections.length} sections
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Locked section placeholders */}
          {hiddenSections.map((section) => (
            <div key={section.id} className="gh-locked-block mt-6">
              <div className="gh-locked-block-icon">&#128274;</div>
              <div className="gh-locked-block-text">{section.title}</div>
              <div className="gh-locked-block-hint">Purchase this guide to unlock</div>
            </div>
          ))}
        </section>

        {/* Purchase block */}
        {!hasPurchased && (
          <section className="py-16">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-8 py-10 text-center">
              <p className="text-sm font-medium text-neutral-500">Full guide access</p>
              <p className="mt-2 text-5xl font-bold tracking-tight text-neutral-900">
                {guide.price} {'\u20BD'}
              </p>
              <p className="mt-2 text-sm text-neutral-400">One-time payment, lifetime access</p>
              <button
                onClick={handleBuy}
                disabled={paymentLoading}
                className="btn-primary mx-auto mt-8 block w-full sm:w-auto sm:max-w-sm py-3 text-base disabled:opacity-60"
              >
                {paymentLoading
                  ? 'Redirecting to checkout...'
                  : user
                    ? 'Buy guide'
                    : 'Log in to buy'}
              </button>
              {paymentError && (
                <p className="mt-3 text-sm text-red-600">
                  {paymentError}
                </p>
              )}
              {paymentInfo && !paymentError && (
                <p className="mt-3 text-sm text-emerald-700">
                  {paymentInfo}
                </p>
              )}
              <p className="mt-3 text-xs text-neutral-400">
                Instant access after payment - Secure checkout
              </p>
            </div>
          </section>
        )}

        {hasPurchased && (
          <section className="py-8">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-center">
              <p className="text-sm font-semibold text-emerald-700">
                You have full access to this guide
              </p>
            </div>
            <div className="mt-6 space-y-8">
              {hiddenSections.map((section) => (
                <div key={section.id}>
                  <h3 className="text-lg font-semibold text-neutral-900">{section.title}</h3>
                  {renderContent(section.content)}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        <section className="py-16">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Reviews</h2>
              <p className="mt-1 text-sm text-neutral-500">What buyers are saying</p>
            </div>
          </div>

          <div className="mt-4 text-sm text-neutral-400">
            No reviews yet. Be the first to review this guide!
          </div>
        </section>

        {/* About author */}
        <section className="py-16">
          <div className="rounded-2xl border border-neutral-200 bg-white p-8">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {guide.author.avatar_url ? (
                <img src={guide.author.avatar_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-lg font-semibold text-brand-700">
                  {guide.author.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold tracking-tight text-neutral-900">About the author</h2>
                <Link to={`/author/${guide.author.username}`} className="hover:text-brand-600 transition-colors">{guide.author.name}</Link>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  {guide.author.bio || 'An experienced content creator sharing their knowledge.'}
                </p>
                <div className="mt-4 flex items-center gap-4 text-sm text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    @{guide.author.username}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-neutral-50 py-8 text-center">
        <p className="text-xs text-neutral-400">
          Powered by <span className="font-semibold text-neutral-500">GuideHub</span>
        </p>
      </footer>
    </div>
  )
}
