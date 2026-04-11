import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Loader2, ArrowLeft } from 'lucide-react'
import { guidesApi } from '@/lib/api'

interface CatalogGuide {
  id: string; title: string; slug: string; description: string
  coverImage: string | null; accentColor: string; price: number; sales: number
  author: { fullName: string; username: string; avatarUrl: string | null }
}

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
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
  const page = parseInt(searchParams.get('page') || '1')

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    try {
      const result = await guidesApi.getCatalog({ q, sort, page, limit: 20 })
      setGuides(result.guides)
      setPagination(result.pagination as { page: number; limit: number; total: number; totalPages: number })
    } catch {
      setGuides([])
    } finally {
      setLoading(false)
    }
  }, [q, sort, page])

  useEffect(() => { loadCatalog() }, [loadCatalog])

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([k, v]) => {
      if (v) next.set(k, v); else next.delete(k)
    })
    if ('page' in updates) next.set('page', '1')
    setSearchParams(next)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-gradient-to-br from-brand-50 to-purple-50">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Guide Catalog</h1>
          <p className="text-neutral-500">Discover guides from all authors</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              value={q}
              onChange={(e) => updateParams({ q: e.target.value })}
              placeholder="Search guides..."
              className="input-base pl-10"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="input-base w-auto sm:w-48"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
        ) : guides.length === 0 ? (
          <p className="text-neutral-500 text-center py-16">No guides found.</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((guide) => (
                <Link
                  key={guide.id}
                  to={`/guide/${guide.author.username}/${guide.slug}`}
                  className="group block rounded-xl border border-neutral-200 overflow-hidden transition-all hover:border-brand-300 hover:shadow-lg"
                >
                  {guide.coverImage && (
                    <div className="aspect-video bg-neutral-100 overflow-hidden">
                      <img src={guide.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-neutral-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                      {guide.title}
                    </h3>
                    <p className="mt-1 text-xs text-neutral-400">by {guide.author.fullName}</p>
                    {guide.description && (
                      <p className="mt-2 text-sm text-neutral-500 line-clamp-2">{guide.description}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-brand-600">{guide.price} ?</span>
                      {guide.sales > 0 && (
                        <span className="text-xs text-neutral-400">{guide.sales} sales</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => updateParams({ page: String(p) })}
                    className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                      p === page ? 'bg-brand-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
