import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/

export function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selfEmployed, setSelfEmployed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const signUp = useAuthStore((s) => s.signUp)
  const loading = useAuthStore((s) => s.loading)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const state = location.state as { from?: string } | null
  const nextFromQuery = new URLSearchParams(location.search).get('next')
  const redirectTo = state?.from || nextFromQuery || '/dashboard'

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!username.trim()) {
      newErrors.username = 'Username is required'
    } else if (!USERNAME_REGEX.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores'
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!EMAIL_REGEX.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    try {
      await signUp(email, password, fullName, username, selfEmployed)
      navigate(redirectTo, { replace: true })
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, form: err?.message ?? 'Something went wrong. Try again.' }))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900">GuideHub</span>
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Create your account</h1>
            <p className="mt-2 text-sm text-neutral-500">Start selling digital guides in minutes</p>
          </div>

          {errors.form && (
            <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-600 ring-1 ring-red-100">
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="mb-2 block text-sm font-medium text-neutral-700">
                Full name
              </label>
              <input
                id="reg-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ivan Petrov"
                className="input-base"
              />
              {errors.fullName && <p className="mt-1.5 text-xs text-red-500">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="reg-username" className="mb-2 block text-sm font-medium text-neutral-700">
                Username
              </label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ivan_creator"
                className="input-base"
              />
              {errors.username && <p className="mt-1.5 text-xs text-red-500">{errors.username}</p>}
              <p className="mt-1.5 text-xs text-neutral-400">
                Your page will be <span className="font-mono text-neutral-500">guidehub.ru/u/{username || 'username'}</span>
              </p>
            </div>

            <div>
              <label htmlFor="reg-email" className="mb-2 block text-sm font-medium text-neutral-700">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-base"
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="reg-password" className="mb-2 block text-sm font-medium text-neutral-700">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="input-base"
              />
              {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
            </div>

            {/* Self-employed toggle */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-neutral-800">I am self-employed (НПД)</span>
                <p className="text-xs text-neutral-500">Enables simplified tax reporting for payments</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={selfEmployed}
                onClick={() => setSelfEmployed(!selfEmployed)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${selfEmployed ? 'bg-brand-600' : 'bg-neutral-300'}`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm`}
                  style={{ transform: selfEmployed ? 'translateX(22px)' : 'translateX(2px)', transition: 'transform 150ms' }}
                />
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link to="/login" state={{ from: redirectTo }} className="font-medium text-brand-600 hover:text-brand-700 transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
