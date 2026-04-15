import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { guidesApi } from '@/lib/api'
import { getGuideBrand } from '@/lib/brand'
import { formatPrice } from '@/lib/utils'

interface AuthorData {
  author: { fullName: string; username: string; bio: string; avatarUrl: string | null }
  guides: Array<{
    id: string
    title: string
    slug: string
    description: string
    coverImage: string | null
    accentColor: string
    template: string
    isCourse: boolean
    price: number
    sales: number
  }>
}

export function AuthorProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<AuthorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username) return
    setLoading(true)
    guidesApi.getAuthor(username)
      .then((result) => setData(result as AuthorData))
      .catch((err: any) => setError(err?.message ?? 'Failed to load author'))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--gh-bg)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6" style={{ background: 'var(--gh-bg)' }}>
        <div className="gh-empty-state max-w-xl px-8 py-12 text-center">
          <p className="gh-kicker">Creator profile</p>
          <h1 className="mt-3 text-[2.8rem]">Author not found</h1>
          <p className="mt-4 text-base leading-7" style={{ color: 'var(--gh-muted)' }}>
            {error || 'The author you are looking for does not exist anymore.'}
          </p>
          <button onClick={() => navigate('/catalog')} className="btn-primary mt-8">
            Back to catalog
          </button>
        </div>
      </div>
    )
  }

  const initials = data.author.fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen" style={{ background: 'var(--gh-bg)' }}>
      <section className="gh-page pb-8 pt-8 lg:pt-10">
        <button onClick={() => navigate(-1)} className="btn-ghost mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="gh-surface-featured p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {data.author.avatarUrl ? (
              <img src={data.author.avatarUrl} alt="" className="h-24 w-24 rounded-[28px] object-cover" />
            ) : (
              <div
                className="flex h-24 w-24 items-center justify-center rounded-[28px] text-2xl font-semibold"
                style={{ background: 'rgba(23, 19, 16, 0.06)', color: 'var(--gh-ink)' }}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="gh-kicker">GuideHub publisher</p>
              <h1 className="mt-3 text-[3rem]">{data.author.fullName}</h1>
              <p className="mt-2 text-sm font-medium" style={{ color: 'var(--gh-brand)' }}>
                @{data.author.username}
              </p>
              {data.author.bio && (
                <p className="mt-4 max-w-3xl text-base leading-7" style={{ color: 'var(--gh-muted)' }}>
                  {data.author.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="gh-page pt-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="gh-kicker">Published work</p>
            <h2 className="mt-2">{data.guides.length} product{data.guides.length === 1 ? '' : 's'} in the catalog.</h2>
          </div>
        </div>

        {data.guides.length === 0 ? (
          <div className="gh-empty-state mt-8 px-6 py-16 text-center">
            <p className="gh-kicker">Nothing published yet</p>
            <p className="mt-4 text-base leading-7" style={{ color: 'var(--gh-muted)' }}>
              This creator has not released any public products so far.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.guides.map((guide) => {
              const brand = getGuideBrand(guide.template, guide.isCourse)
              return (
                <Link
                  key={guide.id}
                  to={`/guide/${data.author.username}/${guide.slug}`}
                  className="gh-product-card"
                  style={{ ['--gh-skin-soft' as string]: brand.soft }}
                >
                  <div className="gh-product-cover aspect-[4/5] p-5">
                    <span className="gh-cover-label relative z-10">{brand.label}</span>
                    {guide.coverImage ? (
                      <img src={guide.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="relative z-10 mt-20">
                        <p className="gh-kicker" style={{ color: brand.accent }}>@{data.author.username}</p>
                        <h3 className="mt-2 text-[2.2rem] leading-none">{guide.title}</h3>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="gh-meta" style={{ color: brand.accent }}>{brand.eyebrow}</p>
                    <h3 className="mt-2 text-[2rem] leading-none">{guide.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-7" style={{ color: 'var(--gh-muted)' }}>
                      {guide.description || brand.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-[20px] bg-white/55 px-3 py-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--gh-ink)' }}>{formatPrice(guide.price)}</span>
                    <span className="gh-meta">{guide.sales} sales</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
