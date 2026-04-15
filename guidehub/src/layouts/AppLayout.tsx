import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { BarChart3, BookOpen, Globe, Loader2, LogOut, Plus, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const navItems = [
  { to: '/catalog', label: 'Catalog', icon: Globe },
  { to: '/dashboard', label: 'Library', icon: BookOpen },
  { to: '/create', label: 'Create', icon: Plus },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const initAuth = useAuthStore((s) => s.init)
  const initialized = useAuthStore((s) => s.initialized)
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    initAuth()
  }, [initAuth])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  useEffect(() => {
    if (initialized && !user) {
      navigate('/login', { replace: true })
    }
  }, [initialized, user, navigate])

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--gh-bg)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName = profile?.full_name || user.email || 'User'
  const displayUsername = profile?.username || ''
  const avatarUrl = profile?.avatar_url || null
  const initials = displayName
    .split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="min-h-screen" style={{ background: 'var(--gh-bg)', color: 'var(--gh-text)' }}>
      <header
        className="sticky top-0 z-30 border-b lg:hidden"
        style={{ borderColor: 'var(--gh-line)', background: 'rgba(251, 248, 243, 0.92)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="gh-brand-mark">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="gh-kicker">Creator Studio</p>
              <p className="text-base font-semibold" style={{ color: 'var(--gh-ink)' }}>GuideHub</p>
            </div>
          </Link>
          <button onClick={handleSignOut} className="btn-ghost px-2.5">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1520px] lg:px-6 xl:px-8">
        <aside className="hidden lg:block lg:w-[300px] lg:shrink-0 lg:pr-6">
          <div className="sticky top-0 flex h-screen flex-col py-6">
            <Link to="/dashboard" className="flex items-center gap-4 px-2">
              <span className="gh-brand-mark">
                <BookOpen className="h-5 w-5" />
              </span>
              <div>
                <p className="gh-kicker">Creator Studio</p>
                <p className="text-lg font-semibold" style={{ color: 'var(--gh-ink)' }}>GuideHub</p>
              </div>
            </Link>

            <div className="gh-surface-featured mt-6 flex flex-1 flex-col p-4">
              <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'rgba(23, 19, 16, 0.08)' }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-12 w-12 rounded-[18px] object-cover" />
                ) : (
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-[18px] text-sm font-semibold"
                    style={{ background: 'rgba(184, 92, 56, 0.14)', color: 'var(--gh-brand)' }}
                  >
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--gh-ink)' }}>
                    {displayName}
                  </p>
                  <p className="truncate text-xs" style={{ color: 'var(--gh-muted)' }}>
                    {displayUsername ? `@${displayUsername}` : user.email}
                  </p>
                </div>
              </div>

              <nav className="mt-5 space-y-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.to
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-center justify-between gap-3 rounded-[20px] px-4 py-3 text-sm font-medium transition-colors"
                      style={
                        isActive
                          ? { background: 'rgba(184, 92, 56, 0.12)', color: 'var(--gh-brand)' }
                          : { color: 'var(--gh-muted)' }
                      }
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className="h-[18px] w-[18px]" />
                        {item.label}
                      </span>
                      <span className="gh-meta">0{navItems.indexOf(item) + 1}</span>
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-auto border-t pt-4" style={{ borderColor: 'rgba(23, 19, 16, 0.08)' }}>
                <button onClick={handleSignOut} className="btn-secondary w-full justify-between px-4">
                  <span>Sign out</span>
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 pt-0 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t lg:hidden"
        style={{ borderColor: 'var(--gh-line)', background: 'rgba(251, 248, 243, 0.96)', backdropFilter: 'blur(12px)' }}
      >
        <div className="grid grid-cols-5 gap-1 px-3 py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-[11px] font-medium"
                style={
                  isActive
                    ? { background: 'rgba(184, 92, 56, 0.12)', color: 'var(--gh-brand)' }
                    : { color: 'var(--gh-muted)' }
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
