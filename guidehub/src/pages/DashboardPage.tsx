import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, DollarSign, Eye, Plus, ShoppingBag, TrendingUp, Loader2 } from 'lucide-react'
import { useGuideStore } from '@/stores/guideStore'
import type { Guide } from '@/types'

export function DashboardPage() {
  const guides = useGuideStore((s) => s.guides)
  const loading = useGuideStore((s) => s.loading)
  const fetchGuides = useGuideStore((s) => s.fetchGuides)
  const deleteGuide = useGuideStore((s) => s.deleteGuide)
  const navigate = useNavigate()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchGuides()
  }, [fetchGuides])

  const handleDelete = useCallback((id: string) => {
    setPendingDeleteId(id)
    setShowDeleteModal(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return
    setDeletingId(pendingDeleteId)
    try {
      await deleteGuide(pendingDeleteId)
    } catch {
      // Error is stored in the guideStore
    } finally {
      setDeletingId(null)
    }
    setShowDeleteModal(false)
    setPendingDeleteId(null)
  }, [pendingDeleteId, deleteGuide])

  const isEmpty = !loading && guides.length === 0

  // Compute real stats from guides array
  const totalRevenue = guides.reduce((sum, g) => sum + (g.revenue || 0), 0)
  const totalSales = guides.reduce((sum, g) => sum + (g.sales || 0), 0)
  const totalViews = guides.reduce((sum, g) => sum + (g.views || 0), 0)

  return (
    <div className="bg-[#fafafa]">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">My Guides</h1>
          <Link to="/create" className="btn-primary">
            <Plus className="h-4 w-4" />
            New Guide
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Stat cards */}
        {loading ? (
          <div className="mb-10 grid gap-5 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-neutral-200" />
            ))}
          </div>
        ) : (
          <div className="mb-10 grid gap-5 sm:grid-cols-3">
            <StatCard
              label="Revenue"
              value={`${totalRevenue.toLocaleString()} ₽`}
              change="+12%"
              up
              icon={DollarSign}
            />
            <StatCard
              label="Sales"
              value={`${totalSales}`}
              change="+8%"
              up
              icon={ShoppingBag}
            />
            <StatCard
              label="Views"
              value={`${totalViews.toLocaleString()}`}
              change="+23%"
              up
              icon={Eye}
            />
          </div>
        )}

        {/* Guides grid */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-20 text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
              <BookOpen className="h-6 w-6 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">No guides yet</h3>
            <p className="mt-1.5 text-sm text-neutral-500">
              Create your first guide and start sharing your expertise
            </p>
            <Link to="/create" className="btn-primary mt-6">
              <Plus className="h-4 w-4" />
              Create Guide
            </Link>
          </div>
        ) : loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-neutral-200" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                onDelete={() => handleDelete(guide.id)}
                isDeleting={deletingId === guide.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-neutral-900">Delete Guide</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Are you sure you want to delete this guide? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setPendingDeleteId(null) }}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingId === pendingDeleteId}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId === pendingDeleteId ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                  </span>
                ) : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- sub-components ---------- */

function StatCard({ label, value, change, up, icon: Icon }: {
  label: string
  value: string
  change: string
  up: boolean
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-500">{label}</span>
        <Icon className="h-5 w-5 text-neutral-300" />
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-neutral-900">{value}</p>
      <div className="mt-2 flex items-center gap-1.5 text-sm font-medium">
        <TrendingUp className={`h-3.5 w-3.5 ${up ? 'text-emerald-600' : 'rotate-180 text-red-500'}`} />
        <span className={up ? 'text-emerald-600' : 'text-red-500'}>{change}</span>
        <span className="text-neutral-400">vs last period</span>
      </div>
    </div>
  )
}

function GuideCard({ guide, onDelete, isDeleting }: {
  guide: Guide
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-shadow hover:shadow-lg">
      {/* Cover area */}
      <div className="relative h-40 rounded-t-xl bg-gradient-to-br from-neutral-100 to-neutral-200">
        {guide.cover_image ? (
          <img src={guide.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-neutral-300 transition-colors group-hover:text-neutral-400" />
          </div>
        )}

        {/* Status badge */}
        <div className="absolute right-3 top-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${
            guide.status === 'published'
              ? 'bg-emerald-50/90 text-emerald-700 ring-1 ring-emerald-200/60'
              : guide.status === 'archived'
                ? 'bg-neutral-200/90 text-neutral-600 ring-1 ring-neutral-300/60'
                : 'bg-white/90 text-neutral-500 ring-1 ring-neutral-200/60'
          }`}>
            {guide.status === 'published' ? 'Published' : guide.status === 'archived' ? 'Archived' : 'Draft'}
          </span>
        </div>

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/20 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
          <Link
            to={`/editor/${guide.id}`}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
          >
            Edit
          </Link>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5">
        <h3 className="mb-3 line-clamp-2 text-sm font-semibold text-neutral-900">
          {guide.title}
        </h3>
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {guide.views.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" />
            {guide.sales}
          </span>
          {guide.revenue > 0 && (
            <span className="ml-auto font-semibold text-neutral-700">
              {guide.revenue.toLocaleString()} ₽
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
