import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileUp, Sparkles, Loader2 } from 'lucide-react'
import { useGuideStore } from '@/stores/guideStore'
import { aiApi } from '@/lib/api'
import { createStoredSectionContent, escapeHtml } from '@/lib/editorContent'

import { TEMPLATES, ACCENT_COLORS } from '@/config/constants'

const STEPS = [
  { num: 1, label: 'Content' },
  { num: 2, label: 'Design' },
  { num: 3, label: 'Product' },
  { num: 4, label: 'Publish' },
]

export function CreateGuidePage() {
  const navigate = useNavigate()
  const createGuide = useGuideStore((s) => s.createGuide)
  const guideLoading = useGuideStore((s) => s.loading)

  const [step, setStep] = useState(1)
  const [content, setContent] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)

  // Step 2: Design
  const [selectedTemplate, setSelectedTemplate] = useState('minimal')
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0].value)
  const [coverUrl, setCoverUrl] = useState('')
  const [coverGenerating, setCoverGenerating] = useState(false)

  // Step 3: Product
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(490)
  const [showPreview, setShowPreview] = useState(false)
  const [isCourse, setIsCourse] = useState(false)
  const [priceSuggesting, setPriceSuggesting] = useState(false)

  // Generated sections from step 1
  const [sections, setSections] = useState<Array<{ title: string; content: unknown; hidden_until_payment: boolean }>>([])

  const handleNext = async () => {
    if (step === 1) {
      if (content.trim()) {
        try {
          const result = await aiApi.structure(content) as { sections: Array<{ title: string; content: string }> }
          setSections(
            (result.sections ?? []).map((s, i) => ({
              title: s.title,
              content: createStoredSectionContent(`<p>${escapeHtml(s.content || '')}</p>`, null),
              hidden_until_payment: i > 1,
            }))
          )
          if (!title.trim()) setTitle('Untitled Guide')
        } catch {
          // If AI fails, create a single section from the raw content
          setSections([
            {
              title: 'Content',
              content: createStoredSectionContent(`<p>${escapeHtml(content)}</p>`, null),
              hidden_until_payment: false,
            },
          ])
          if (!title.trim()) setTitle('Untitled Guide')
        }
      }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      setStep(4)
    }
  }

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return
    try {
      const result = await aiApi.generate(aiPrompt) as { title: string; sections: Array<{ title: string; content: string }>; description?: string }
      setTitle(result.title || 'AI Generated Guide')
      setDescription(result.description || '')
      setSections(
        (result.sections ?? []).map((s, i) => ({
          title: s.title,
          content: createStoredSectionContent(`<p>${escapeHtml(s.content || '')}</p>`, null),
          hidden_until_payment: i > 1,
        }))
      )
      setStep(2)
   } catch {
      setAiError('AI generation failed. You can still create your guide manually.')
      if (!title.trim()) setTitle('My Guide')
      if (sections.length === 0) {
        setSections([{ title: 'Introduction', content: createStoredSectionContent('<p></p>', null), hidden_until_payment: false }])
      }
      setStep(2)
    }
  }

  const handleSuggestPrice = async () => {
    if (!title.trim() || !description.trim()) return
    setPriceSuggesting(true)
    try {
      const result = await aiApi.suggestPrice(title, description, 1000) as { suggested_price: number }
      if (result.suggested_price) setPrice(result.suggested_price)
    } catch {
      // Keep current price on failure
    } finally {
      setPriceSuggesting(false)
    }
  }

  const [publishError, setPublishError] = useState<string | null>(null)

  const handlePublish = async () => {
    setPublishError(null)
    if (!title.trim()) {
      setPublishError('Title is required')
      return
    }
    try {
      const payload = {
        title,
        description,
        price,
        cover_image: coverUrl || null,
        accent_color: accentColor,
        template: selectedTemplate,
        show_preview: showPreview,
        preview_sections: [],
        is_course: isCourse,
        sections: sections.map((s, i) => ({
          title: s.title,
          content: s.content,
          order: i,
          hidden_until_payment: s.hidden_until_payment,
        })),
      }
      await createGuide(payload)
      navigate('/dashboard')
    } catch (err: any) {
      console.error('[CreateGuide] Publish failed:', err)
      setPublishError(err?.message ?? 'Failed to create guide. Please try again.')
    }
  }

  const handleGenerateCover = async () => {
    if (!title.trim()) return
    setCoverGenerating(true)
    try {
      const result = await aiApi.generateCover(title) as { url: string }
      if (result.url) setCoverUrl(result.url)
    } catch {
      // Cover generation is optional
    } finally {
      setCoverGenerating(false)
    }
  }

  return (
    <div className="bg-[#fafafa]">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <button onClick={() => navigate(-1)} className="btn-ghost h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Create Guide</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Step indicator */}
        <div className="mb-12 flex items-center justify-center">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    s.num === step
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-200/60'
                      : s.num < step
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  {s.num < step ? '✓' : s.num}
                </div>
                <span
                  className={`text-xs font-medium ${
                    s.num === step ? 'text-brand-700' : 'text-neutral-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-3 h-0.5 w-12 rounded-full transition-colors sm:w-16 ${
                    s.num < step ? 'bg-brand-400' : 'bg-neutral-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Content */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                What&apos;s your source content?
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Start with your existing notes or generate something new with AI
              </p>
            </div>

            {/* Textarea + upload */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <label className="mb-3 block text-sm font-medium text-neutral-700">
                Paste your draft
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your draft from notes, Telegram, or Google Docs..."
                rows={8}
                className="input-base resize-none placeholder:text-neutral-300"
              />
              <p className="mt-1.5 text-xs text-neutral-400">{content.length} characters</p>

              <div className="mt-5">
                <label className="mb-3 block text-sm font-medium text-neutral-700">
                  Or upload a file
                </label>
                <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-8 transition-colors hover:border-brand-400 hover:bg-brand-50/30">
                  <div className="text-center">
                    <FileUp className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
                    <p className="text-sm text-neutral-500">
                      Click to upload or drag and drop
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      .txt, .md, .docx, .pdf — max 10 MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-neutral-200" />
              <span className="text-sm font-medium text-neutral-400">— OR —</span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>

            {/* AI generation */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand-500" />
                <h3 className="text-sm font-semibold text-neutral-900">Generate with AI</h3>
              </div>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder='e.g. "Istanbul travel guide for 3 days with budget tips"'
                className="input-base mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleGenerateAI}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </button>
              </div>
            </div>
              {aiError && (
                <p className="mt-3 text-sm text-red-600 text-center">{aiError}</p>
              )}

            <button
              onClick={handleNext}
              disabled={guideLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {guideLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Next: Design
            </button>
          </div>
        )}

        {/* Step 2: Design */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                Choose a template
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Pick a visual style for your guide
              </p>
            </div>

            {/* Templates */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`rounded-xl border-2 p-4 text-center transition-all ${
                    selectedTemplate === t.id
                      ? 'border-brand-500 bg-brand-50 shadow-sm'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <div className="mb-2 text-2xl">{t.preview}</div>
                  <div className="text-xs font-medium text-neutral-700">{t.name}</div>
                </button>
              ))}
            </div>

            {/* Accent color */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <label className="mb-3 block text-sm font-medium text-neutral-700">Accent color</label>
              <div className="flex gap-3">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setAccentColor(c.value)}
                    className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                      accentColor === c.value ? 'ring-2 ring-offset-2' : ''
                    }`}
                    style={{
                      backgroundColor: c.value,
                      ...(accentColor === c.value ? { boxShadow: `0 0 0 2px ${c.value}` } : {}),
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Cover */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <label className="mb-3 block text-sm font-medium text-neutral-700">Cover image</label>
              {coverUrl ? (
                <div className="relative">
                  <img src={coverUrl} alt="Cover" className="h-40 w-full rounded-xl object-cover" />
                  <button
                    onClick={() => setCoverUrl('')}
                    className="absolute right-2 top-2 rounded-lg bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerateCover}
                  disabled={coverGenerating}
                  className="w-full rounded-xl border-2 border-dashed border-neutral-300 p-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/30"
                >
                  {coverGenerating ? (
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-500" />
                  ) : (
                    <>
                      <Sparkles className="mx-auto mb-2 h-6 w-6 text-neutral-300" />
                      <p className="text-sm text-neutral-500">Generate cover with AI</p>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
              <button onClick={handleNext} className="btn-primary flex-1">Next: Product</button>
            </div>
          </div>
        )}

        {/* Step 3: Product */}
        {step === 3 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                Set up your product
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Title, description, and pricing for your guide
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Your guide title"
                  className="input-base"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of what readers will learn..."
                  rows={3}
                  className="input-base resize-none"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-neutral-700">Price (₽)</label>
                  <button
                    onClick={handleSuggestPrice}
                    disabled={priceSuggesting || !title.trim()}
                    className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" />
                    {priceSuggesting ? 'Analyzing...' : 'Suggest price'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="input-base pr-10"
                    min={0}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">₽</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <ToggleRow
                  label="Preview mode"
                  description="Show a free preview before purchase"
                  checked={showPreview}
                  onChange={setShowPreview}
                />
                <ToggleRow
                  label="This is a course"
                  description="Enable course-specific features like progress tracking"
                  checked={isCourse}
                  onChange={setIsCourse}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
              <button onClick={handleNext} className="btn-primary flex-1">Review & Publish</button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Publish */}
        {step === 4 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                Review & Publish
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Check everything looks good before publishing
              </p>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-neutral-900">{title || 'Untitled Guide'}</h3>
              {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-400">Template</span>
                  <p className="font-medium text-neutral-700 capitalize">{selectedTemplate}</p>
                </div>
                <div>
                  <span className="text-neutral-400">Price</span>
                  <p className="font-semibold text-neutral-700">{price} ₽</p>
                </div>
                <div>
                  <span className="text-neutral-400">Sections</span>
                  <p className="font-medium text-neutral-700">{sections.length}</p>
                </div>
                <div>
                  <span className="text-neutral-400">Preview mode</span>
                  <p className="font-medium text-neutral-700">{showPreview ? 'On' : 'Off'}</p>
                </div>
              </div>

              {sections.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-medium text-neutral-700">Sections</h4>
                  <div className="space-y-1">
                    {sections.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                        <span className="text-neutral-400">{i + 1}.</span>
                        {s.title}
                        {s.hidden_until_payment && (
                          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                            Paid
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="btn-secondary flex-1">Back</button>
              <button
                onClick={handlePublish}
                disabled={guideLoading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {guideLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {guideLoading ? 'Creating...' : 'Create & Publish'}
              </button>
            </div>
            {publishError && (
              <p className="mt-3 text-sm text-red-600 text-center">{publishError}</p>
            )}
          </div>
        )}
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
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-neutral-300'}`}
      >
        <span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}
