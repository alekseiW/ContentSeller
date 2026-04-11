import { useState } from 'react'
import { Camera, Globe, Link2, CreditCard, Bell, Shield, Mail, TrendingUp, User, Key, Trash2, AlertTriangle, Check } from 'lucide-react'

type TabType = 'profile' | 'payments' | 'notifications' | 'plan' | 'account'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [username, setUsername] = useState('alex_creator')
  const [emailNotif, setEmailNotif] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(true)
  const [reviewNotif, setReviewNotif] = useState(false)

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'plan', label: 'Plan', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'account', label: 'Account', icon: <Shield className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <h1 className="text-xl font-bold text-neutral-900">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Tabs */}
          <nav className="lg:w-56 shrink-0">
            <div className="sticky top-24 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 space-y-6 min-w-0">
            {/* Profile */}
            {activeTab === 'profile' && (
              <>
                <SectionCard title="Profile Information">
                  {/* Avatar */}
                  <div className="flex items-center gap-5 mb-6">
                    <div className="relative">
                      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-200 to-purple-200 flex items-center justify-center">
                        <User className="h-8 w-8 text-brand-500" />
                      </div>
                      <button className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow ring-1 ring-neutral-200 hover:bg-neutral-50">
                        <Camera className="h-3.5 w-3.5 text-neutral-500" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Profile photo</p>
                      <p className="text-xs text-neutral-500">JPG, PNG. 400x400px recommended.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full Name" defaultValue="Alex Creator" />
                      <div>
                        <Field label="Username" value={username} onChange={setUsername} />
                        <p className="mt-1 text-xs text-neutral-400">platform.ru/u/{username}</p>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-neutral-700">Bio</label>
                      <textarea
                        rows={3}
                        defaultValue="Digital creator helping others grow their audience."
                        className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Social Links">
                  <div className="space-y-4">
                    <SocialField icon="TG" label="Telegram" placeholder="https://t.me/username" />
                    <SocialField icon="IG" label="Instagram" placeholder="https://instagram.com/username" />
                    <SocialField icon="YT" label="YouTube" placeholder="https://youtube.com/@channel" />
                  </div>
                </SectionCard>

                <div className="flex justify-end">
                  <button className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm">
                    Save Changes
                  </button>
                </div>
              </>
            )}

            {/* Payments */}
            {activeTab === 'payments' && (
              <SectionCard title="Payment Methods">
                <div className="space-y-6">
                  {/* Status */}
                  <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                        <Check className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">Self-employed verified</p>
                        <p className="text-xs text-emerald-600">Status confirmed • Updated Dec 2025</p>
                      </div>
                    </div>
                  </div>

                  {/* Provider buttons */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-neutral-700">Payment provider</h4>
                    {/* Connected */}
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-800">YooKassa</p>
                          <p className="text-xs text-emerald-600">Connected ✓</p>
                        </div>
                      </div>
                      <button className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50">
                        Settings
                      </button>
                    </div>

                    {/* Not connected */}
                    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-200">
                          <CreditCard className="h-5 w-5 text-neutral-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-700">Prodamus</p>
                          <p className="text-xs text-neutral-500">Not connected</p>
                        </div>
                      </div>
                      <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors">
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <SectionCard title="Email Notifications">
                <div className="space-y-4">
                  <ToggleRow label="Purchase notifications" description="Receive an email every time someone buys your guide" checked={emailNotif} onChange={setEmailNotif} />
                  <ToggleRow label="Weekly reports" description="Summary of revenue, views, and sales every Monday" checked={weeklyReport} onChange={setWeeklyReport} />
                  <ToggleRow label="New reviews" description="Get notified when someone leaves a review" checked={reviewNotif} onChange={setReviewNotif} />
                  <ToggleRow label="Product updates" description="Learn about new GuideHub features and improvements" checked={false} onChange={() => {}} />
                </div>
              </SectionCard>
            )}

            {/* Plan */}
            {activeTab === 'plan' && (
              <SectionCard title="Current Plan">
                <div className="rounded-xl border border-neutral-200 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100">
                        <TrendingUp className="h-6 w-6 text-brand-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900">Free Plan</p>
                        <p className="text-xs text-neutral-500">5% commission per sale</p>
                      </div>
                    </div>
                    <button className="rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-brand-700 hover:to-purple-700 transition-all shadow-sm">
                      Upgrade to Pro — 790₽/mo
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3 border-t border-neutral-100 pt-4">
                    {['2% commission', 'Advanced analytics', 'Custom domain', 'Email collection', 'Priority support'].slice(0, 3).map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                        <Check className="h-4 w-4 text-brand-600 flex-shrink-0" />{f}
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Account */}
            {activeTab === 'account' && (
              <>
                <SectionCard title="Security">
                  <div className="space-y-4">
                    <Field label="Current Email" defaultValue="alex@creator.ru" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="New Password" type="password" placeholder="Enter new password" />
                      <Field label="Confirm Password" type="password" placeholder="Confirm new password" />
                    </div>
                    <div className="flex justify-end">
                      <button className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 transition-colors">
                        <Key className="h-3.5 w-3.5" /> Update Password
                      </button>
                    </div>
                  </div>
                </SectionCard>

                {/* Danger zone */}
                <SectionCard title="Danger Zone" danger>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <h4 className="text-sm font-semibold text-red-700">Delete account</h4>
                      </div>
                      <p className="mt-1 text-xs text-red-600/80">This action cannot be undone. All guides, data, and revenue will be permanently deleted.</p>
                    </div>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" /> Delete Account
                    </button>
                  </div>
                </SectionCard>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function SectionCard({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-6 bg-white shadow-sm transition-colors', danger ? 'border-red-200 bg-red-50/30' : 'border-neutral-200')}>
      <h3 className={cn('text-base font-semibold mb-4', danger ? 'text-red-800' : 'text-neutral-900')}>{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, value, defaultValue, type = 'text', placeholder, onChange }: {
  label: string; value?: string; defaultValue?: string; type?: string; placeholder?: string; onChange?: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</label>
      <input
        type={type} value={value} defaultValue={defaultValue} placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-colors"
      />
    </div>
  )
}

function SocialField({ icon, label, placeholder }: { icon: string; label: string; placeholder: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</label>
      <div className="flex items-center rounded-lg border border-neutral-300 bg-neutral-50 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30 transition-colors overflow-hidden">
        <span className="flex h-9 w-9 items-center justify-center bg-neutral-100 text-[10px] font-bold text-neutral-500 border-r border-neutral-200">{icon}</span>
        <input placeholder={placeholder} className="flex-1 bg-transparent px-3 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none" />
      </div>
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-neutral-800">{label}</p>
        <p className="text-xs text-neutral-500">{description}</p>
      </div>
      <button
        role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-brand-600' : 'bg-neutral-300')}
      >
        <span className={cn('absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform', checked && 'translate-x-5')} />
      </button>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
