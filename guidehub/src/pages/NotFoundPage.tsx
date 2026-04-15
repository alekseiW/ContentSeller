import { Link } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-brand-600 mb-4">404</p>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Page not found</h1>
        <p className="text-neutral-500 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => window.history.back()} className="btn-ghost">
            <ArrowLeft className="h-4 w-4 mr-1" /> Go back
          </button>
          <Link to="/" className="btn-primary">
            <Home className="h-4 w-4 mr-1" /> Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
