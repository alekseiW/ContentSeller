import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2, Search } from 'lucide-react'
import { guidesApi } from '@/lib/api'
import { getGuideBrand } from '@/lib/brand'
import { formatPrice } from '@/lib/utils'

interface CatalogGuide {
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
  author: { fullName: string; username: string; avatarUrl: string | null }
}

const sortOptions = [
  { value: 'newest', label: 'Newest arrivals' },
  { value: 'popular', label: 'Most purchased' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [guides, setGuides] = useState<CatalogGuide[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })

  const q = searchParams.get('q') || ''
  const sort = searchParams.get('sort') || 'newest'
  const page = parseInt(searchParams.get('page') || '1', 10)

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const result = await guidesApi.getCatalog({ q, sort, page, limit: 20 })
      setGuides(result.guides as CatalogGuide[])
      setPagination(result.pagination as { page: number; limit: number; total: number; totalPages: number })
    } catch {
      setGuides([])
    } finally {
      setLoading(false)
    }
  }, [page, q, sort])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  const updateParams = (updates: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    if (resetPage) next.set('page', '1')
    setSearchParams(next)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--gh-bg)' }}>
      <section className="gh-page pb-8 pt-8 lg:pt-12">
        <div className="max-w-3xl">
          <p className="gh-kicker">GuideHub catalog</p>
          <h1 className="mt-3 max-w-4xl">A mixed marketplace for polished expertise.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8" style={{ color: 'var(--gh-muted)' }}>
            Explore travel guides, structured programs, creator playbooks, and premium knowledge products from
            independent experts.
          </p>
        </div>
      </section>

      <section className="gh-page pt-0">
        <div className="gh-filter-bar sticky top-[72px] z-20 p-4 lg:top-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--gh-muted)' }} />
              <input
                value={q}
                onChange={(event) => updateParams({ q: event.target.value })}
                placeholder="Search for a city guide, a program, or a playbook..."
                className="input-base pl-11"
              />
            </div>
            <select
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value })}
              className="input-base w-full lg:w-[240px]"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="gh-meta">{loading ? 'Refreshing catalog' : `${pagination.total || guides.length} published items`}</p>
          <Link to="/create" className="btn-secondary hidden sm:inline-flex">
            Publish your own
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : guides.length === 0 ? (
          <div className="gh-empty-state mt-8 px-6 py-20 text-center">
            <p className="gh-kicker">Nothing matched your search</p>
            <h2 className="mt-3 text-[2.4rem]">Try a broader term or clear the filters.</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7" style={{ color: 'var(--gh-muted)' }}>
              The catalog mixes formats, so broad terms like a niche, topic, or city usually work better than exact titles.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {guides.map((guide) => {
                const brand = getGuideBrand(guide.template, guide.isCourse)
                const initials = guide.author.fullName
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)

                return (
                  <Link
                    key={guide.id}
                    to={`/guide/${guide.author.username}/${guide.slug}`}
                    className="gh-product-card group"
                    style={{
                      ['--gh-skin-soft' as string]: brand.soft,
                      ['--gh-skin-accent' as string]: brand.accent,
                    }}
                  >
                    <div className="gh-product-cover aspect-[4/5] p-5">
                      <div className="relative z-10 flex items-start justify-between gap-3">
                        <span className="gh-cover-label">{brand.label}</span>
                        <span className="gh-pill border-0 bg-white/60 px-3 py-2" style={{ color: brand.accent }}>
                          {formatPrice(guide.price)}
                        </span>
                      </div>

                      {guide.coverImage ? (
                        <img
                          src={guide.coverImage}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="relative mt-20 flex h-full flex-col justify-between">
                          <div>
                            <p className="gh-kicker" style={{ color: brand.accent }}>{guide.author.fullName}</p>
                            <h3 className="mt-2 max-w-[14rem] text-3xl leading-none">{guide.title}</h3>
                          </div>
                          <p className="max-w-[14rem] text-sm leading-6" style={{ color: 'var(--gh-muted)' }}>
                            {guide.description || brand.description}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="gh-meta" style={{ color: brand.accent }}>{brand.eyebrow}</p>
                        <h3 className="mt-2 text-[2rem] leading-none">{guide.title}</h3>
                        <p className="mt-3 line-clamp-3 text-sm leading-7" style={{ color: 'var(--gh-muted)' }}>
                          {guide.description || brand.description}
                        </p>
                      </div>
                      <span className="gh-meta whitespace-nowrap">{guide.sales} sales</span>
                    </div>

                    <div className="flex items-center gap-3 rounded-[20px] bg-white/55 px-3 py-3">
                      {guide.author.avatarUrl ? (
                        <img src={guide.author.avatarUrl} alt="" className="h-10 w-10 rounded-[14px] object-cover" />
                      ) : (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-[14px] text-xs font-semibold"
                          style={{ background: 'rgba(23, 19, 16, 0.06)', color: 'var(--gh-ink)' }}
                        >
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: 'var(--gh-ink)' }}>
                          {guide.author.fullName}
                        </p>
                        <p className="truncate text-xs" style={{ color: 'var(--gh-muted)' }}>
                          @{guide.author.username}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0" style={{ color: brand.accent }} />
                    </div>
                  </Link>
                )
              })}
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-10 flex flex-wrap justify-center gap-2">
                {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((current) => (
                  <button
                    key={current}
                    onClick={() => updateParams({ page: String(current) }, false)}
                    className="gh-pill min-w-[44px] justify-center"
                    style={
                      current === page
                        ? { background: 'rgba(184, 92, 56, 0.12)', color: 'var(--gh-brand)', borderColor: 'rgba(184, 92, 56, 0.28)' }
                        : undefined
                    }
                  >
                    {String(current).padStart(2, '0')}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
