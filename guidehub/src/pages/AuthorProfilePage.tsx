import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { BookOpen, Loader2, ArrowLeft } from 'lucide-react'
import { guidesApi } from '@/lib/api'

interface AuthorData {
  author: { fullName: string; username: string; bio: string; avatarUrl: string | null }
  guides: Array<{
    id: string; title: string; slug: string; description: string
    coverImage: string | null; accentColor: string; price: number; sales: number
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
      .then(setData)
      .catch((err: any) => setError(err?.message ?? 'Failed to load author'))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Author not found</h1>
          <p className="mt-2 text-neutral-500">{error || 'The author you\'re looking for doesn\'t exist.'}</p>
          <button onClick={() => navigate('/')} className="mt-4 btn-ghost">
            <ArrowLeft className="h-4 w-4 mr-1" /> Go home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Author header */}
      <div className="border-b border-neutral-200 bg-gradient-to-br from-brand-50 to-purple-50">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <button onClick={() => navigate(-1)} className="mb-6 btn-ghost text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </button>
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-brand-200 flex items-center justify-center text-2xl font-bold text-brand-700">
              {data.author.avatarUrl ? (
                <img src={data.author.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                data.author.fullName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{data.author.fullName}</h1>
              <p className="text-sm text-neutral-500">@{data.author.username}</p>
              {data.author.bio && <p className="mt-2 text-neutral-600 max-w-lg">{data.author.bio}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Guides grid */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4">
          Guides ({data.guides.length})
        </h2>
        {data.guides.length === 0 ? (
          <p className="text-neutral-500 text-center py-12">No published guides yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.guides.map((guide) => (
              <Link
                key={guide.id}
                to={`/guide/${data.author.username}/${guide.slug}`}
                className="group block rounded-xl border border-neutral-200 p-4 transition-all hover:border-brand-300 hover:shadow-md"
              >
                <h3 className="font-semibold text-neutral-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                  {guide.title}
                </h3>
                {guide.description && (
                  <p className="mt-1 text-sm text-neutral-500 line-clamp-2">{guide.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand-600">{guide.price} ?</span>
                  {guide.sales > 0 && (
                    <span className="text-xs text-neutral-400 flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {guide.sales} sales
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
