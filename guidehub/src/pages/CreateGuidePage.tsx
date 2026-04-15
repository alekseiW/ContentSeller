import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileUp, Loader2, Sparkles } from 'lucide-react'
import { useGuideStore } from '@/stores/guideStore'
import { aiApi } from '@/lib/api'
import { getGuideBrand } from '@/lib/brand'
import { createStoredSectionContent, escapeHtml } from '@/lib/editorContent'
import { formatPrice } from '@/lib/utils'
import { TEMPLATES, ACCENT_COLORS } from '@/config/constants'

const STEPS = [
  { num: 1, label: 'Manuscript' },
  { num: 2, label: 'Format' },
  { num: 3, label: 'Offer' },
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

  const [selectedTemplate, setSelectedTemplate] = useState('minimal')
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0].value)
  const [coverUrl, setCoverUrl] = useState('')
  const [coverGenerating, setCoverGenerating] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState(490)
  const [showPreview, setShowPreview] = useState(false)
  const [isCourse, setIsCourse] = useState(false)
  const [priceSuggesting, setPriceSuggesting] = useState(false)

  const [sections, setSections] = useState<Array<{ title: string; content: unknown; hidden_until_payment: boolean }>>([])
  const [publishError, setPublishError] = useState<string | null>(null)

  const brand = getGuideBrand(selectedTemplate, isCourse)
  const previewTitle = title.trim() || 'Untitled Guide'
  const previewDescription = description.trim() || brand.description

  const handleNext = async () => {
    if (step === 1) {
      if (content.trim()) {
        try {
          const result = await aiApi.structure(content) as { sections: Array<{ title: string; content: string }> }
          setSections(
            (result.sections ?? []).map((section, index) => ({
              title: section.title,
              content: createStoredSectionContent(`<p>${escapeHtml(section.content || '')}</p>`, null),
              hidden_until_payment: index > 1,
            }))
          )
          if (!title.trim()) setTitle('Untitled Guide')
        } catch {
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
    setAiError(null)
    try {
      const result = await aiApi.generate(aiPrompt) as {
        title: string
        sections: Array<{ title: string; content: string }>
        description?: string
      }
      setTitle(result.title || 'AI Generated Guide')
      setDescription(result.description || '')
      setSections(
        (result.sections ?? []).map((section, index) => ({
          title: section.title,
          content: createStoredSectionContent(`<p>${escapeHtml(section.content || '')}</p>`, null),
          hidden_until_payment: index > 1,
        }))
      )
      setStep(2)
    } catch {
      setAiError('AI generation failed. You can still create your guide manually.')
      if (!title.trim()) setTitle('My Guide')
      if (sections.length === 0) {
        setSections([
          {
            title: 'Introduction',
            content: createStoredSectionContent('<p></p>', null),
            hidden_until_payment: false,
          },
        ])
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

  const handlePublish = async () => {
    setPublishError(null)
    if (!title.trim()) {
      setPublishError('Title is required')
      return
    }

    try {
      await createGuide({
        title,
        description,
        price,
        cover_image: coverUrl || null,
        accent_color: accentColor,
        template: selectedTemplate,
        show_preview: showPreview,
        preview_sections: [],
        is_course: isCourse,
        sections: sections.map((section, index) => ({
          title: section.title,
          content: section.content,
          order: index,
          hidden_until_payment: section.hidden_until_payment,
        })),
      })
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
    <div
      className="min-h-screen"
      style={{
        background: 'var(--gh-bg)',
        ['--gh-skin-soft' as string]: brand.soft,
      }}
    >
      <div className="gh-page pb-10 pt-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="btn-ghost h-10 w-10 p-0">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="gh-kicker">GuideHub publishing studio</p>
              <h1 className="mt-2 text-[2.8rem]">Create a guide that feels ready to sell.</h1>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-3 rounded-[28px] border p-4 md:grid-cols-4" style={{ borderColor: 'var(--gh-line)', background: 'rgba(251, 248, 243, 0.72)' }}>
          {STEPS.map((item) => {
            const active = item.num === step
            const complete = item.num < step
            return (
              <div
                key={item.num}
                className="flex items-center gap-3 rounded-[20px] px-4 py-3"
                style={
                  active
                    ? { background: 'rgba(184, 92, 56, 0.12)' }
                    : complete
                      ? { background: 'rgba(75, 107, 82, 0.12)' }
                      : { background: 'rgba(255, 255, 255, 0.45)' }
                }
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                  style={
                    active
                      ? { background: 'var(--gh-brand)', color: '#fff' }
                      : complete
                        ? { background: 'var(--gh-success)', color: '#fff' }
                        : { background: 'rgba(23, 19, 16, 0.08)', color: 'var(--gh-muted)' }
                  }
                >
                  {complete ? '✓' : item.num}
                </div>
                <div>
                  <p className="gh-kicker">Step {item.num}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--gh-ink)' }}>{item.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            {step === 1 && (
              <>
                <div className="gh-surface p-6 sm:p-8">
                  <p className="gh-kicker">Step 1: Manuscript</p>
                  <h2 className="mt-3">Bring in your source material.</h2>
                  <p className="mt-4 max-w-2xl text-base leading-7" style={{ color: 'var(--gh-muted)' }}>
                    Start from a rough draft, notes, or a structured AI prompt. The system will turn it into sections you can package later.
                  </p>

                  <div className="mt-8 space-y-4">
                    <div>
                      <label className="label-base">Paste your draft</label>
                      <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="Paste source material from notes, a Telegram post, a workout protocol, or a draft article..."
                        rows={10}
                        className="input-base resize-none"
                      />
                      <p className="mt-2 text-xs" style={{ color: 'var(--gh-muted)' }}>{content.length} characters</p>
                    </div>

                    <div className="gh-surface-muted flex items-center justify-center rounded-[24px] border-2 border-dashed p-8 text-center" style={{ borderColor: 'rgba(23, 19, 16, 0.12)' }}>
                      <div>
                        <FileUp className="mx-auto mb-3 h-8 w-8" style={{ color: 'var(--gh-muted)' }} />
                        <p className="text-sm font-medium" style={{ color: 'var(--gh-ink)' }}>Upload will land here next</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--gh-muted)' }}>.txt, .md, .docx, .pdf up to 10 MB</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="gh-surface p-6 sm:p-8">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-600" />
                    <p className="gh-kicker">Alternative input</p>
                  </div>
                  <h3 className="mt-3 text-[2rem]">Generate a structured first draft with AI.</h3>
                  <p className="mt-3 text-sm leading-7" style={{ color: 'var(--gh-muted)' }}>
                    Useful when you know the format and promise, but you have not assembled the full material yet.
                  </p>

                  <div className="mt-6 space-y-4">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(event) => setAiPrompt(event.target.value)}
                      placeholder='e.g. "4-week hybrid strength plan for busy founders"'
                      className="input-base"
                    />
                    <button onClick={handleGenerateAI} className="btn-primary w-full sm:w-auto">
                      <Sparkles className="h-4 w-4" />
                      Generate draft
                    </button>
                    {aiError && (
                      <p className="text-sm" style={{ color: 'var(--gh-danger)' }}>{aiError}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleNext} disabled={guideLoading} className="btn-primary flex-1">
                    {guideLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Continue to format
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="gh-surface p-6 sm:p-8">
                  <p className="gh-kicker">Step 2: Format</p>
                  <h2 className="mt-3">Choose the product direction.</h2>
                  <p className="mt-4 max-w-2xl text-base leading-7" style={{ color: 'var(--gh-muted)' }}>
                    The visual language changes the way the guide feels in the catalog and on the public product page.
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {TEMPLATES.map((template) => {
                      const active = selectedTemplate === template.id
                      const templateBrand = getGuideBrand(template.id, template.id === 'course' ? true : isCourse)
                      return (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className="gh-product-card text-left"
                          style={{
                            ['--gh-skin-soft' as string]: templateBrand.soft,
                            borderColor: active ? 'rgba(184, 92, 56, 0.4)' : undefined,
                            boxShadow: active ? 'var(--gh-shadow-md)' : undefined,
                          }}
                        >
                          <div className="gh-product-cover aspect-[4/5] p-4">
                            <span className="gh-cover-label">{templateBrand.label}</span>
                            <div className="relative z-10 mt-16">
                              <p className="gh-kicker" style={{ color: templateBrand.accent }}>{template.name}</p>
                              <h3 className="mt-2 text-[1.9rem] leading-none">{template.preview}</h3>
                            </div>
                          </div>
                          <div>
                            <p className="text-base font-semibold" style={{ color: 'var(--gh-ink)' }}>{template.name}</p>
                            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--gh-muted)' }}>
                              {templateBrand.description}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                  <div className="gh-surface p-6 sm:p-8">
                    <label className="label-base">Accent color</label>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {ACCENT_COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => setAccentColor(color.value)}
                          className="h-10 w-10 rounded-full transition-transform hover:scale-105"
                          style={{
                            backgroundColor: color.value,
                            boxShadow: accentColor === color.value ? `0 0 0 3px rgba(255,255,255,0.9), 0 0 0 5px ${color.value}` : 'none',
                          }}
                          aria-label={color.id}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="gh-surface p-6 sm:p-8">
                    <label className="label-base">Cover image</label>
                    {coverUrl ? (
                      <div className="relative mt-4 overflow-hidden rounded-[20px]">
                        <img src={coverUrl} alt="Cover" className="h-48 w-full object-cover" />
                        <button onClick={() => setCoverUrl('')} className="btn-secondary absolute right-3 top-3 px-3 py-1.5 text-xs">
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleGenerateCover} disabled={coverGenerating} className="gh-surface-muted mt-4 w-full p-8 text-center">
                        {coverGenerating ? (
                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
                        ) : (
                          <>
                            <Sparkles className="mx-auto mb-3 h-6 w-6 text-brand-600" />
                            <p className="text-sm font-medium" style={{ color: 'var(--gh-ink)' }}>Generate a cover with AI</p>
                            <p className="mt-1 text-xs" style={{ color: 'var(--gh-muted)' }}>Uses your title to create a matching storefront image.</p>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                  <button onClick={handleNext} className="btn-primary flex-1">Continue to offer</button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="gh-surface p-6 sm:p-8">
                  <p className="gh-kicker">Step 3: Offer</p>
                  <h2 className="mt-3">Frame the product and set the price.</h2>
                  <div className="mt-8 space-y-5">
                    <div>
                      <label className="label-base">Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Give the product a clear promise"
                        className="input-base"
                      />
                    </div>
                    <div>
                      <label className="label-base">Description</label>
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="What will buyers get, and why is it useful?"
                        rows={4}
                        className="input-base resize-none"
                      />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="label-base mb-0">Price</label>
                        <button onClick={handleSuggestPrice} disabled={priceSuggesting || !title.trim()} className="btn-ghost px-0 text-xs">
                          <Sparkles className="h-3.5 w-3.5" />
                          {priceSuggesting ? 'Analyzing...' : 'Suggest with AI'}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={price}
                          onChange={(event) => setPrice(Number(event.target.value))}
                          className="input-base pr-12"
                          min={0}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--gh-muted)' }}>RUB</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="gh-surface p-6 sm:p-8">
                  <p className="gh-kicker">Access rules</p>
                  <div className="mt-5 space-y-4">
                    <ToggleRow
                      label="Show free preview"
                      description="Let visitors read public sections before they buy."
                      checked={showPreview}
                      onChange={setShowPreview}
                    />
                    <ToggleRow
                      label="Treat this as a course"
                      description="Use a more program-oriented visual language for the public page."
                      checked={isCourse}
                      onChange={setIsCourse}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="btn-secondary flex-1">Back</button>
                  <button onClick={handleNext} className="btn-primary flex-1">Continue to publish</button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="gh-surface p-6 sm:p-8">
                  <p className="gh-kicker">Step 4: Publish</p>
                  <h2 className="mt-3">Review the storefront before it goes live.</h2>

                  <div className="mt-8 space-y-4">
                    <div className="gh-surface-muted p-4">
                      <p className="gh-kicker">Title</p>
                      <p className="mt-3 text-lg font-semibold" style={{ color: 'var(--gh-ink)' }}>{previewTitle}</p>
                    </div>
                    <div className="gh-surface-muted p-4">
                      <p className="gh-kicker">Description</p>
                      <p className="mt-3 text-sm leading-7" style={{ color: 'var(--gh-muted)' }}>{previewDescription}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="gh-surface-muted p-4">
                        <p className="gh-kicker">Format</p>
                        <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--gh-ink)' }}>{brand.label}</p>
                      </div>
                      <div className="gh-surface-muted p-4">
                        <p className="gh-kicker">Price</p>
                        <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--gh-ink)' }}>{formatPrice(price)}</p>
                      </div>
                      <div className="gh-surface-muted p-4">
                        <p className="gh-kicker">Sections</p>
                        <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--gh-ink)' }}>{sections.length}</p>
                      </div>
                      <div className="gh-surface-muted p-4">
                        <p className="gh-kicker">Preview</p>
                        <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--gh-ink)' }}>{showPreview ? 'Enabled' : 'Hidden'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="gh-surface p-6 sm:p-8">
                  <p className="gh-kicker">Section list</p>
                  <div className="mt-5 space-y-3">
                    {sections.length > 0 ? (
                      sections.map((section, index) => (
                        <div key={`${section.title}-${index}`} className="gh-surface-muted flex items-center gap-3 px-4 py-3">
                          <span className="gh-meta">{String(index + 1).padStart(2, '0')}</span>
                          <span className="min-w-0 flex-1 text-sm" style={{ color: 'var(--gh-text)' }}>{section.title}</span>
                          {section.hidden_until_payment && (
                            <span className="gh-pill" style={{ color: brand.accent }}>Paid</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="gh-surface-muted p-4 text-sm" style={{ color: 'var(--gh-muted)' }}>
                        No sections yet. You can still publish a single-page guide and refine it later.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(3)} className="btn-secondary flex-1">Back</button>
                  <button onClick={handlePublish} disabled={guideLoading} className="btn-primary flex-1">
                    {guideLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {guideLoading ? 'Publishing...' : 'Create & publish'}
                  </button>
                </div>

                {publishError && (
                  <p className="text-sm" style={{ color: 'var(--gh-danger)' }}>{publishError}</p>
                )}
              </>
            )}
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <div className="gh-purchase-rail">
              <p className="gh-kicker">Live preview</p>
              <div className="gh-product-cover mt-5 aspect-[4/5] p-5">
                {coverUrl ? (
                  <img src={coverUrl} alt="Cover" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <span className="gh-cover-label">{brand.label}</span>
                    <div>
                      <p className="gh-kicker" style={{ color: accentColor }}>{brand.eyebrow}</p>
                      <h2 className="mt-2 text-[2.4rem] leading-none">{previewTitle}</h2>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <p className="gh-price">{formatPrice(price)}</p>
                <p className="mt-3 text-sm leading-7" style={{ color: 'var(--gh-muted)' }}>
                  {previewDescription}
                </p>

                <div className="mt-6">
                  <div className="gh-ledger-row">
                    <span className="gh-meta">Format</span>
                    <span>{brand.label}</span>
                  </div>
                  <div className="gh-ledger-row">
                    <span className="gh-meta">Sections</span>
                    <span>{sections.length || 1}</span>
                  </div>
                  <div className="gh-ledger-row">
                    <span className="gh-meta">Preview</span>
                    <span>{showPreview ? 'Enabled' : 'Hidden'}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {sections.slice(0, 4).map((section, index) => (
                    <div key={`${section.title}-${index}`} className="gh-surface-muted flex items-center gap-3 px-4 py-3">
                      <span className="gh-meta">{String(index + 1).padStart(2, '0')}</span>
                      <span className="min-w-0 flex-1 text-sm" style={{ color: 'var(--gh-text)' }}>{section.title}</span>
                    </div>
                  ))}
                  {sections.length === 0 && (
                    <div className="gh-surface-muted px-4 py-4 text-sm" style={{ color: 'var(--gh-muted)' }}>
                      Your section outline will appear here as soon as the guide has structure.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[24px] border px-4 py-4" style={{ borderColor: 'rgba(23, 19, 16, 0.08)', background: 'rgba(255, 255, 255, 0.58)' }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--gh-ink)' }}>{label}</p>
        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--gh-muted)' }}>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 rounded-full transition-colors"
        style={{ background: checked ? 'var(--gh-brand)' : 'rgba(23, 19, 16, 0.18)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}
