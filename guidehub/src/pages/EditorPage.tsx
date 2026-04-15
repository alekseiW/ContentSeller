import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Youtube from '@tiptap/extension-youtube'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  ImageIcon,
  Link as LinkIcon,
  Video,
  Lock,
  Eye,
  Save,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  Undo,
  Redo,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Plus,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Wand2,
} from 'lucide-react'
import { useGuideStore } from '@/stores/guideStore'
import { useAuthStore } from '@/stores/authStore'
import { aiApi, sectionsApi, uploadApi } from '@/lib/api'
import { buildEditorContentFromSections, createStoredSectionContent } from '@/lib/editorContent'
import { PaidText } from '@/editor/extensions/paidText'
import { PaidBlock } from '@/editor/extensions/paidBlock'
import { Callout } from '@/editor/extensions/callout'
import { ImageCaption } from '@/editor/extensions/imageCaption'
import type { Guide } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPTAP_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Image.configure({
    inline: false,
    allowBase64: true,
  }),
  ImageCaption,
  LinkExt.configure({
    openOnClick: false,
  }),
  Underline,
  Youtube.configure({
    controls: true,
    nocookie: true,
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Placeholder.configure({
    placeholder: 'Start writing your guide...',
  }),
  PaidText,
  PaidBlock,
  Callout,
]

const ACCENT_COLORS = [
  { id: 'indigo', value: '#6366f1' },
  { id: 'violet', value: '#8b5cf6' },
  { id: 'blue', value: '#3b82f6' },
  { id: 'emerald', value: '#10b981' },
  { id: 'amber', value: '#f59e0b' },
  { id: 'rose', value: '#f43f5e' },
  { id: 'slate', value: '#475569' },
  { id: 'cyan', value: '#06b6d4' },
]

const SLASH_COMMANDS = [
  { id: 'h1', label: 'Heading 1', icon: Heading1, shortcut: '# ' },
  { id: 'h2', label: 'Heading 2', icon: Heading2, shortcut: '## ' },
  { id: 'h3', label: 'Heading 3', icon: Heading3, shortcut: '### ' },
  { id: 'ul', label: 'Bullet List', icon: List, shortcut: '- ' },
  { id: 'ol', label: 'Numbered List', icon: ListOrdered, shortcut: '1. ' },
  { id: 'task', label: 'Task List', icon: CheckSquare, shortcut: '[ ] ' },
  { id: 'quote', label: 'Quote', icon: Quote, shortcut: '> ' },
  { id: 'code', label: 'Code Block', icon: Code, shortcut: '```' },
  { id: 'image', label: 'Image', icon: ImageIcon, shortcut: '![image]' },
  { id: 'video', label: 'Video (YouTube)', icon: Video, shortcut: '<video>' },
  { id: 'paid', label: 'Paid Snippet', icon: Lock, shortcut: '$paid' },
  { id: 'paid-block', label: 'Paid Block', icon: Lock, shortcut: '$block' },
  { id: 'divider', label: 'Divider', icon: MoreHorizontal, shortcut: '---' },
  { id: 'callout', label: 'Callout', icon: Wand2, shortcut: '!callout' },
]

// ─── SlashMenu ───────────────────────────────────────────────────────────────

interface SlashMenuProps {
  commands: typeof SLASH_COMMANDS
  query: string
  activeIndex: number
  onIndexChange: (idx: number) => void
  onSelect: (cmd: (typeof SLASH_COMMANDS)[number]) => void
  position: { top: number; left: number }
  menuRef: React.RefObject<HTMLDivElement | null>
}

function SlashMenu({ commands, query, activeIndex, onIndexChange, onSelect, position, menuRef }: SlashMenuProps) {
  const filtered = useMemo(
    () =>
      commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.id.toLowerCase().includes(query.toLowerCase()),
      ),
    [commands, query],
  )

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      onIndexChange(0)
    }
  }, [filtered.length, activeIndex, onIndexChange])

  if (filtered.length === 0 || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={menuRef}
      className="gh-slash-menu"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 120,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {filtered.map((cmd, idx) => {
        const Icon = cmd.icon
        return (
          <button
            key={cmd.id}
            className={`gh-slash-menu-item ${idx === activeIndex ? 'active' : ''}`}
            onMouseEnter={() => onIndexChange(idx)}
            onClick={() => onSelect(cmd)}
          >
            <Icon className="gh-slash-menu-icon" size={16} />
            <span className="gh-slash-menu-label">{cmd.label}</span>
            <span className="gh-slash-menu-shortcut">{cmd.shortcut}</span>
          </button>
        )
      })}
    </div>,
    document.body,
  )
}

// ─── BlockInsertHandle ───────────────────────────────────────────────────────

interface BlockInsertHandleProps {
  onSelect: (cmd: (typeof SLASH_COMMANDS)[number]) => void
  position: { top: number; left: number } | null
}

function BlockInsertHandle({ onSelect, position }: BlockInsertHandleProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) {
        return
      }

      setOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => {
    if (!position) {
      setOpen(false)
    }
  }, [position])

  if (!position || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div ref={rootRef} className="gh-block-insert-handle">
      <button
        className="gh-block-insert-btn"
        onClick={() => setOpen(!open)}
        onMouseDown={(e) => e.preventDefault()}
        title="Insert block"
        style={{ position: 'fixed', top: position.top, left: position.left }}
      >
        <Plus size={14} />
      </button>
      {open && (
        <div
          className="gh-block-insert-menu"
          onMouseDown={(e) => e.preventDefault()}
          style={{ position: 'fixed', top: position.top + 36, left: position.left }}
        >
          {SLASH_COMMANDS.map((cmd) => {
            const Icon = cmd.icon
            return (
              <button
                key={cmd.id}
                className="gh-block-insert-menu-item"
                onClick={() => {
                  onSelect(cmd)
                  setOpen(false)
                }}
              >
                <Icon size={14} />
                <span>{cmd.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>,
    document.body,
  )
}

// ─── BubbleMenuComponent ─────────────────────────────────────────────────────

interface BubbleMenuComponentProps {
  editor: ReturnType<typeof useEditor>
  scrollTarget?: HTMLElement | Window | null
  onAiEdit: () => void
  onTogglePaid: () => void
  onSetLink: () => void
}

function BubbleMenuComponent({ editor, scrollTarget, onAiEdit, onTogglePaid, onSetLink }: BubbleMenuComponentProps) {
  if (!editor) return null

  return (
    <BubbleMenu
      editor={editor}
      className="gh-bubble-menu-host"
      appendTo={() => document.body}
      options={{
        strategy: 'fixed',
        placement: 'top',
        offset: 10,
        flip: { padding: 12 },
        shift: { padding: 12 },
        scrollTarget: scrollTarget ?? window,
      }}
      shouldShow={({ editor }) => !editor.state.selection.empty}
    >
      <div className="gh-bubble-menu">
        <button
          className={`gh-bubble-btn ${editor.isActive('bold') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          className={`gh-bubble-btn ${editor.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={14} />
        </button>
        <button
          className={`gh-bubble-btn ${editor.isActive('underline') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon size={14} />
        </button>
        <button
          className={`gh-bubble-btn ${editor.isActive('strike') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <Strikethrough size={14} />
        </button>
        <div className="gh-bubble-divider" />
        <button
          className={`gh-bubble-btn ${editor.isActive('link') ? 'active' : ''}`}
          onClick={onSetLink}
          title="Link"
        >
          <LinkIcon size={14} />
        </button>
        <button
          className={`gh-bubble-btn ${editor.isActive('paidText') ? 'active' : ''}`}
          onClick={onTogglePaid}
          title="Mark as paid content"
        >
          <Lock size={14} />
        </button>
        <div className="gh-bubble-divider" />
        <button
          className="gh-bubble-btn gh-bubble-ai"
          onClick={onAiEdit}
          title="AI improve"
        >
          <Sparkles size={14} />
          <span>Improve</span>
        </button>
      </div>
    </BubbleMenu>
  )
}

// ─── ToolbarBtn ──────────────────────────────────────────────────────────────

interface ToolbarBtnProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

function ToolbarBtn({ icon, label, active, disabled, onClick }: ToolbarBtnProps) {
  return (
    <button
      className={`gh-toolbar-btn ${active ? 'active' : ''}`}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="gh-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="gh-toggle-input"
      />
      <span className="gh-toggle-track">
        <span className={`gh-toggle-thumb ${checked ? 'checked' : ''}`} />
      </span>
      <span className="gh-toggle-label">{label}</span>
    </label>
  )
}

// ─── EditorPage ──────────────────────────────────────────────────────────────

export default function EditorPage() {
  const { guideId } = useParams<{ guideId: string }>()

  const { currentGuide, sections, loading, fetchGuide, updateGuide, publishGuide } = useGuideStore()
  const { profile } = useAuthStore()

  // ── State ────────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showSlash, setShowSlash] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashPos, setSlashPos] = useState<number | null>(null)
  const [slashActiveIdx, setSlashActiveIdx] = useState(0)

  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  )
  const [rightPanelOpen, setRightPanelOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  )
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiWorking, setAiWorking] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiInfo, setAiInfo] = useState<string | null>(null)

  const [showAi, setShowAi] = useState(false)
  const [aiGeneratePrompt, setAiGeneratePrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [hideSections, setHideSections] = useState<Set<string>>(new Set())
  const [price, setPrice] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccessUrl, setPublishSuccessUrl] = useState<string | null>(null)

  const [mediaUploading, setMediaUploading] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  // ── Refs ─────────────────────────────────────────────────────────────────
  const editorCanvasRef = useRef<HTMLDivElement>(null)
  const slashMenuRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHydratingRef = useRef(false)
  const lastHydratedSignatureRef = useRef<string | null>(null)
  const lastSavedHtmlRef = useRef<string | null>(null)
  const [menuViewportTick, setMenuViewportTick] = useState(0)

  const openSidebar = useCallback(() => {
    setSidebarOpen(true)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setRightPanelOpen(false)
    }
  }, [])

  const openRightPanel = useCallback(() => {
    setRightPanelOpen(true)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const closeRightPanel = useCallback(() => setRightPanelOpen(false), [])

  const closeSlashMenu = useCallback(() => {
    setShowSlash(false)
    setSlashPos(null)
    setSlashQuery('')
    setSlashActiveIdx(0)
  }, [])

  // ── Fetch guide on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!guideId) return
    fetchGuide(guideId)
  }, [guideId, fetchGuide])

  // ── Populate metadata when guide changes ─────────────────────────────────
  useEffect(() => {
    if (currentGuide) {
      setTitle(currentGuide.title)
      setPrice(currentGuide.price)
    }
  }, [currentGuide])

  // ── Reset hydration refs on guideId change ───────────────────────────────
  useEffect(() => {
    isHydratingRef.current = false
    lastHydratedSignatureRef.current = null
    lastSavedHtmlRef.current = null
  }, [guideId])

  // ── Editor ───────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: buildEditorContentFromSections(sections),
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Detect slash command trigger
      const text = editor.state.doc.textBetween(
        Math.max(0, editor.state.selection.from - 10),
        editor.state.selection.from,
        '\n',
      )
      const match = text.match(/(\w*)$/)
      if (match && match.index !== undefined && text[match.index - 1] === '/') {
        setSlashQuery(match[1])
        setSlashPos(editor.state.selection.from)
        setShowSlash(true)
        setSlashActiveIdx(0)
      } else {
        closeSlashMenu()
      }

      // Auto-save with debounce
      if (!isHydratingRef.current) {
        setSaveStatus('saving')
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
          handleSave()
        }, 2000)
      }
    },
    onSelectionUpdate: ({ editor }) => {
      // Re-check slash on cursor move
      const text = editor.state.doc.textBetween(
        Math.max(0, editor.state.selection.from - 10),
        editor.state.selection.from,
        '\n',
      )
      const match = text.match(/(\w*)$/)
      if (match && match.index !== undefined && text[match.index - 1] === '/') {
        setSlashQuery(match[1])
        setSlashPos(editor.state.selection.from)
        setShowSlash(true)
        setSlashActiveIdx(0)
      } else {
        closeSlashMenu()
      }
    },
    onBlur: () => {
      closeSlashMenu()
    },
  })

  // ── Hydrate editor content from sections ─────────────────────────────────
  useEffect(() => {
    if (!editor || !sections.length || isHydratingRef.current) return

    const signature = sections.map((s) => `${s.id}:${s.order}:${s.updated_at}`).join('|')
    if (signature === lastHydratedSignatureRef.current) return

    isHydratingRef.current = true
    const html = buildEditorContentFromSections(sections)
    editor.commands.setContent(html)
    lastHydratedSignatureRef.current = signature

    setTimeout(() => {
      isHydratingRef.current = false
    }, 100)
  }, [editor, sections])

  // ── Slash command keyboard navigation ────────────────────────────────────
  useEffect(() => {
    if (!showSlash) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashActiveIdx((prev) => {
          const filtered = SLASH_COMMANDS.filter(
            (c) =>
              c.label.toLowerCase().includes(slashQuery.toLowerCase()) ||
              c.id.toLowerCase().includes(slashQuery.toLowerCase()),
          )
          return prev < filtered.length - 1 ? prev + 1 : 0
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashActiveIdx((prev) => {
          const filtered = SLASH_COMMANDS.filter(
            (c) =>
              c.label.toLowerCase().includes(slashQuery.toLowerCase()) ||
              c.id.toLowerCase().includes(slashQuery.toLowerCase()),
          )
          return prev > 0 ? prev - 1 : filtered.length - 1
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const filtered = SLASH_COMMANDS.filter(
          (c) =>
            c.label.toLowerCase().includes(slashQuery.toLowerCase()) ||
            c.id.toLowerCase().includes(slashQuery.toLowerCase()),
        )
        if (filtered[slashActiveIdx]) {
          handleSlashCommand(filtered[slashActiveIdx])
        }
      } else if (e.key === 'Escape') {
        closeSlashMenu()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showSlash, slashQuery, slashActiveIdx, closeSlashMenu])

  useEffect(() => {
    if (!showSlash) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null

      if (target && slashMenuRef.current?.contains(target)) {
        return
      }

      closeSlashMenu()
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    return () => window.removeEventListener('pointerdown', handlePointerDown, true)
  }, [showSlash, closeSlashMenu])

  // ── Cleanup save timer on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true)
      }
      if (window.innerWidth >= 1024) {
        setRightPanelOpen(true)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isMobileDrawerOpen = (sidebarOpen && window.innerWidth < 768) || (rightPanelOpen && window.innerWidth < 1024)
    const previousOverflow = document.body.style.overflow

    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [sidebarOpen, rightPanelOpen])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openImagePicker = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const insertImageByUrl = useCallback(
    (url: string) => {
      if (!editor || !url) return
      editor.chain().focus().setImage({ src: url }).run()
    },
    [editor],
  )

  const insertVideoByUrl = useCallback(
    (url: string) => {
      if (!editor || !url) return
      const videoId = extractYoutubeId(url)
      if (videoId) {
        editor.chain().focus().setYoutubeVideo({ src: url }).run()
      }
    },
    [editor],
  )

  const handleImageInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setMediaUploading(true)
      try {
        const result = await uploadApi.upload(file)
        insertImageByUrl(result.url)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setAiError(message)
      } finally {
        setMediaUploading(false)
        if (imageInputRef.current) imageInputRef.current.value = ''
      }
    },
    [insertImageByUrl],
  )

  const runAiEdit = useCallback(async () => {
    if (!editor || !aiPrompt.trim()) return

    setAiWorking(true)
    setAiError(null)
    setAiInfo(null)

    try {
      const selection = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        '\n',
      )

      if (!selection) {
        setAiError('No text selected. Please select some text first.')
        return
      }

      const result = await aiApi.editSelection(selection, 'improve', aiPrompt)
      if (result.editedText) {
        editor.chain().focus().insertContent(result.editedText).run()
        setAiInfo('AI changes applied (replaced selection).')
        setAiPrompt('')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI edit failed'
      setAiError(message)
    } finally {
      setAiWorking(false)
    }
  }, [editor, aiPrompt])

  const handleAiGenerate = useCallback(async () => {
    if (!editor || !aiGeneratePrompt.trim()) return
    setAiGenerating(true)
    setAiError(null)
    setAiInfo(null)
    try {
      const result = await aiApi.generateContent(aiGeneratePrompt.trim())
      if (!result.content.trim()) {
        throw new Error('AI returned empty content')
      }
      editor.chain().focus().insertContent(result.content).run()
      setAiInfo(result.mock ? 'Generated AI draft (mock mode).' : 'AI content inserted.')
      setAiGeneratePrompt('')
    } catch (err: any) {
      setAiError(err?.message ?? 'Failed to generate content.')
    } finally {
      setAiGenerating(false)
    }
  }, [editor, aiGeneratePrompt])

  const executeEditorCommand = useCallback(
    (cmd: (typeof SLASH_COMMANDS)[number], removeSlashTrigger = false) => {
      if (!editor) return

      if (removeSlashTrigger && slashPos !== null) {
        const from = slashPos - slashQuery.length - 1
        editor.chain().focus().deleteRange({ from, to: slashPos }).run()
      } else {
        editor.chain().focus().run()
      }

      switch (cmd.id) {
        case 'h1':
          editor.chain().focus().toggleHeading({ level: 1 }).run()
          break
        case 'h2':
          editor.chain().focus().toggleHeading({ level: 2 }).run()
          break
        case 'h3':
          editor.chain().focus().toggleHeading({ level: 3 }).run()
          break
        case 'ul':
          editor.chain().focus().toggleBulletList().run()
          break
        case 'ol':
          editor.chain().focus().toggleOrderedList().run()
          break
        case 'task':
          editor.chain().focus().toggleTaskList().run()
          break
        case 'quote':
          editor.chain().focus().toggleBlockquote().run()
          break
        case 'code':
          editor.chain().focus().toggleCodeBlock().run()
          break
        case 'image':
          openImagePicker()
          break
        case 'video': {
          const url = prompt('Enter YouTube URL:')
          if (url) insertVideoByUrl(url)
          break
        }
        case 'paid':
          editor.chain().focus().setMark('paidText').run()
          break
        case 'paid-block':
          editor.chain().focus().togglePaidBlock().run()
          break
        case 'divider':
          editor.chain().focus().setHorizontalRule().run()
          break
        case 'callout':
          editor.chain().focus().setCallout('info').run()
          break
      }
    },
    [editor, slashPos, slashQuery, openImagePicker, insertVideoByUrl],
  )

  const handleSlashCommand = useCallback(
    (cmd: (typeof SLASH_COMMANDS)[number]) => {
      if (!editor || slashPos === null) return
      executeEditorCommand(cmd, true)
      closeSlashMenu()
    },
    [editor, slashPos, executeEditorCommand, closeSlashMenu],
  )

  const handleBlockInsertCommand = useCallback(
    (cmd: (typeof SLASH_COMMANDS)[number]) => {
      executeEditorCommand(cmd)
    },
    [executeEditorCommand],
  )

  useEffect(() => {
    const notifyViewportChange = () => {
      setMenuViewportTick((value) => value + 1)
    }

    const canvas = editorCanvasRef.current

    window.addEventListener('resize', notifyViewportChange)
    window.addEventListener('scroll', notifyViewportChange, true)
    canvas?.addEventListener('scroll', notifyViewportChange, { passive: true })

    return () => {
      window.removeEventListener('resize', notifyViewportChange)
      window.removeEventListener('scroll', notifyViewportChange, true)
      canvas?.removeEventListener('scroll', notifyViewportChange)
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (!editor || !guideId || !currentGuide) return

    setSaveStatus('saving')

    try {
      const html = editor.getHTML()
      const json = editor.getJSON()

      // Update title if changed
      if (title !== currentGuide.title) {
        await updateGuide(guideId, { title })
      }

      // Save sections
      if (sections.length > 0) {
        const firstSection = sections[0]
        const content = createStoredSectionContent(html, json)
        await sectionsApi.update(firstSection.id, { content })
      } else {
        // Create first section if none exist
        const content = createStoredSectionContent(html, json)
        await sectionsApi.create(guideId, {
          title: 'Introduction',
          content,
          order: 0,
          hidden_until_payment: false,
        })
      }

      lastSavedHtmlRef.current = html
      setSaveStatus('saved')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed'
      setAiError(message)
      setSaveStatus('idle')
    }
  }, [editor, guideId, currentGuide, title, updateGuide, sections])

  const handlePublish = useCallback(async () => {
    if (!guideId) return

    setPublishing(true)
    setPublishError(null)
    setPublishSuccessUrl(null)

    try {
      // Save first
      await handleSave()

      // Publish
      await publishGuide(guideId)

      if (currentGuide) {
        const url = `/guide/${profile?.username || 'author'}/${currentGuide.slug}`
        setPublishSuccessUrl(url)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Publish failed'
      setPublishError(message)
    } finally {
      setPublishing(false)
    }
  }, [guideId, handleSave, publishGuide, currentGuide, profile])

  // ── Drag & drop image handlers ────────────────────────────────────────
  const handleEditorDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true)
    }
  }, [])

  const handleEditorDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)
  }, [])

  const handleEditorDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingFile(false)

    if (!editor) return

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))

    for (const file of imageFiles) {
      try {
        setMediaUploading(true)
        const uploaded = await uploadApi.upload(file)
        editor.chain().focus().setImageWithCaption({
          src: uploaded.url,
          alt: file.name,
        }).run()
      } catch (err) {
        console.error('[Editor] Failed to upload dropped image:', err)
      } finally {
        setMediaUploading(false)
      }
    }
  }, [editor])

  // ── Outline items ────────────────────────────────────────────────────────
  const outlineItems = useMemo(() => {
    if (!editor) return []
    const items: Array<{ level: number; text: string; pos: number }> = []
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const text = node.textContent
        if (text) {
          items.push({ level: node.attrs.level, text, pos })
        }
      }
    })
    return items
  }, [editor?.state.doc])

  // ── Slash menu position ──────────────────────────────────────────────────
  const slashMenuPosition = useMemo(() => {
    if (!showSlash || !editor || slashPos === null || typeof window === 'undefined') {
      return { top: 0, left: 0 }
    }

    try {
      const coords = editor.view.coordsAtPos(slashPos)
      const menuWidth = window.innerWidth >= 640 ? 256 : 224
      const menuHeight = 320
      const padding = 12
      const preferredTop = coords.bottom + 8
      const hasRoomBelow = preferredTop + menuHeight <= window.innerHeight - padding

      return {
        top: hasRoomBelow ? preferredTop : Math.max(padding, coords.top - menuHeight - 8),
        left: Math.max(padding, Math.min(coords.left, window.innerWidth - menuWidth - padding)),
      }
    } catch {
      return { top: 0, left: 0 }
    }
  }, [showSlash, slashPos, editor, menuViewportTick])

  const blockInsertPosition = useMemo(() => {
    if (!editor || typeof window === 'undefined') {
      return null
    }

    try {
      const selectionPos = editor.state.selection.from
      const coords = editor.view.coordsAtPos(selectionPos)
      const canvasRect = editorCanvasRef.current?.getBoundingClientRect()
      const contentLeft = canvasRect ? canvasRect.left + Math.max((canvasRect.width - 720) / 2, 0) : coords.left
      const mobile = window.innerWidth < 640

      if (canvasRect && (coords.top < canvasRect.top - 8 || coords.top > canvasRect.bottom + 8)) {
        return null
      }

      return {
        top: Math.max(88, coords.top - 3),
        left: mobile
          ? Math.max(8, Math.min(window.innerWidth - 42, coords.left - 8))
          : Math.max(8, contentLeft - 42),
      }
    } catch {
      return null
    }
  }, [editor, editor?.state.selection.from, menuViewportTick])

  // ── Accent color ─────────────────────────────────────────────────────────
  const selectedAccent = useMemo(
    () => ACCENT_COLORS.find((c) => c.value === currentGuide?.accent_color) || ACCENT_COLORS[0],
    [currentGuide?.accent_color],
  )

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading && !currentGuide) {
    return (
      <div className="gh-editor-loading">
        <Loader2 className="animate-spin" size={32} />
        <p>Loading guide...</p>
      </div>
    )
  }

  return (
    <div className="gh-editor-page">
      {/* Hidden file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageInputChange}
      />

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="gh-editor-topbar">
        <div className="gh-editor-topbar-left">
          <Link to="/dashboard" className="gh-editor-back-btn">
            <ArrowLeft size={18} />
          </Link>
          <input
            className="gh-editor-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Guide title"
          />
          <span className={`gh-save-status gh-save-status-${saveStatus}`}>
            {saveStatus === 'idle' && 'Unsaved'}
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="animate-spin" size={12} />
                Saving...
              </>
            )}
            {saveStatus === 'saved' && 'Saved'}
          </span>
        </div>
        <div className="gh-editor-topbar-right">
          <button
            className="gh-topbar-btn"
            onClick={() => setShowPreview(!showPreview)}
            title="Preview"
          >
            <Eye size={16} />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <button
            className="gh-topbar-btn gh-topbar-btn-save"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            className="gh-topbar-btn gh-topbar-btn-publish"
            onClick={handlePublish}
            disabled={publishing}
          >
            {publishing ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            <span className="hidden sm:inline">{publishing ? 'Publishing...' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {/* ── Publish Error Banner ────────────────────────────────────────── */}
      {publishError && (
        <div className="gh-publish-banner gh-publish-banner-error">
          <span>{publishError}</span>
          <button onClick={() => setPublishError(null)}>Dismiss</button>
        </div>
      )}

      {/* ── Publish Success Banner ──────────────────────────────────────── */}
      {publishSuccessUrl && (
        <div className="gh-publish-banner gh-publish-banner-success">
          <CheckCircle2 size={16} />
          <span>Guide published successfully!</span>
          <Link to={publishSuccessUrl} className="gh-publish-banner-link">
            <ExternalLink size={14} />
            View guide
          </Link>
        </div>
      )}

      {/* ── Main Layout ─────────────────────────────────────────────────── */}
      <div className="gh-editor-layout">
        {/* ── Left Sidebar (Outline) ──────────────────────────────────── */}
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="gh-mobile-backdrop md:hidden"
            onClick={closeSidebar}
          />
        )}
        <aside
          className={`gh-editor-sidebar ${
            sidebarOpen
              ? 'block fixed inset-y-0 left-0 z-50 w-64 md:static md:w-[220px]'
              : 'hidden md:block'
          }`}
        >
            <div className="gh-sidebar-header">
              <h3>Outline</h3>
              <button
                className="gh-sidebar-toggle"
                onClick={closeSidebar}
              >
                <ChevronLeft size={16} />
              </button>
            </div>
            <nav className="gh-sidebar-nav">
              {outlineItems.length === 0 && (
                <p className="gh-sidebar-empty">No headings yet</p>
              )}
              {outlineItems.map((item, idx) => (
                <button
                  key={idx}
                  className={`gh-sidebar-item gh-sidebar-item-h${item.level}`}
                  onClick={() => {
                    if (editor) {
                      editor.commands.focus(item.pos)
                    }
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                      closeSidebar()
                    }
                  }}
                >
                  <ChevronRight size={12} />
                  <span>{item.text}</span>
                </button>
              ))}
            </nav>
          </aside>

        {/* ── Main Editor Area ────────────────────────────────────────── */}
        <main className="gh-editor-main">
          {/* Toolbar */}
          <div className="gh-editor-toolbar">
            {!sidebarOpen && (
                <button
                  className="gh-toolbar-btn"
                  onClick={openSidebar}
                  title="Show outline"
                >
                  <ChevronRight size={16} />
              </button>
            )}
            <ToolbarBtn
              icon={<Bold size={16} />}
              label="Bold"
              active={editor?.isActive('bold')}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarBtn
              icon={<Italic size={16} />}
              label="Italic"
              active={editor?.isActive('italic')}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
            <ToolbarBtn
              icon={<UnderlineIcon size={16} />}
              label="Underline"
              active={editor?.isActive('underline')}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            />
            <ToolbarBtn
              icon={<Strikethrough size={16} />}
              label="Strikethrough"
              active={editor?.isActive('strike')}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            />
            <div className="gh-toolbar-divider" />
            <ToolbarBtn
              icon={<Heading1 size={16} />}
              label="Heading 1"
              active={editor?.isActive('heading', { level: 1 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <ToolbarBtn
              icon={<Heading2 size={16} />}
              label="Heading 2"
              active={editor?.isActive('heading', { level: 2 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            />
            <ToolbarBtn
              icon={<Heading3 size={16} />}
              label="Heading 3"
              active={editor?.isActive('heading', { level: 3 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            />
            <div className="gh-toolbar-divider" />
            <ToolbarBtn
              icon={<List size={16} />}
              label="Bullet List"
              active={editor?.isActive('bulletList')}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarBtn
              icon={<ListOrdered size={16} />}
              label="Numbered List"
              active={editor?.isActive('orderedList')}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
            <ToolbarBtn
              icon={<CheckSquare size={16} />}
              label="Task List"
              active={editor?.isActive('taskList')}
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
            />
            <div className="gh-toolbar-divider" />
            <ToolbarBtn
              icon={<Quote size={16} />}
              label="Quote"
              active={editor?.isActive('blockquote')}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            />
            <ToolbarBtn
              icon={<Code size={16} />}
              label="Code Block"
              active={editor?.isActive('codeBlock')}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            />
            <div className="gh-toolbar-divider" />
            <ToolbarBtn
              icon={<ImageIcon size={16} />}
              label="Image"
              onClick={openImagePicker}
            />
            <ToolbarBtn
              icon={<Video size={16} />}
              label="Video"
              onClick={() => {
                const url = prompt('Enter YouTube URL:')
                if (url) insertVideoByUrl(url)
              }}
            />
            <ToolbarBtn
              icon={<Lock size={16} />}
              label="Paid Text"
              active={editor?.isActive('paidText')}
              onClick={() => editor?.chain().focus().toggleMark('paidText').run()}
            />
            <ToolbarBtn
              icon={<Lock size={16} />}
              label="Paid Block"
              active={editor?.isActive('paidBlock')}
              onClick={() => editor?.chain().focus().togglePaidBlock().run()}
            />
            <div className="gh-toolbar-divider" />
            <ToolbarBtn
              icon={<Wand2 size={16} />}
              label="Callout"
              onClick={() => editor?.chain().focus().setCallout('info').run()}
            />
            <div className="gh-toolbar-spacer" />
            <ToolbarBtn
              icon={<Undo size={16} />}
              label="Undo"
              onClick={() => editor?.chain().focus().undo().run()}
            />
            <ToolbarBtn
              icon={<Redo size={16} />}
              label="Redo"
              onClick={() => editor?.chain().focus().redo().run()}
            />
            <button
              className="gh-toolbar-btn"
              onClick={() => setShowAi(!showAi)}
              title="AI tools"
            >
              <Sparkles size={16} />
            </button>
            {!rightPanelOpen && (
                <button
                  className="gh-toolbar-btn"
                  onClick={openRightPanel}
                  title="Settings"
                >
                  <ChevronLeft size={16} />
              </button>
            )}
          </div>

          {/* AI Bar */}
          {showAi && (
            <div className="gh-ai-bar">
              <div className="gh-ai-bar-header">
                <Sparkles size={16} />
                <span>AI Assistant</span>
              </div>
              <textarea
                className="gh-ai-bar-input"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe what you want AI to do..."
                rows={3}
              />
              <div className="gh-ai-bar-actions">
                <button
                  className="gh-ai-bar-btn"
                  onClick={runAiEdit}
                  disabled={aiWorking || !aiPrompt.trim()}
                >
                  {aiWorking ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Wand2 size={14} />
                  )}
                  <span>{aiWorking ? 'Working...' : 'Apply to selection'}</span>
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 border-t border-brand-200 pt-2">
                <input
                  value={aiGeneratePrompt}
                  onChange={(e) => setAiGeneratePrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && aiGeneratePrompt.trim()) {
                      handleAiGenerate()
                    }
                  }}
                  placeholder="Generate content: describe what to write..."
                  className="flex-1 bg-transparent text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiGeneratePrompt.trim()}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  {aiGenerating && <Loader2 className="h-3 w-3 animate-spin" />}
                  Generate
                </button>
              </div>
              {aiError && (
                <div className="gh-ai-bar-error">{aiError}</div>
              )}
              {aiInfo && (
                <div className="gh-ai-bar-info">{aiInfo}</div>
              )}
            </div>
          )}

          {/* Editor Canvas */}
          <div
            className="gh-editor-canvas"
            ref={editorCanvasRef}
            onDragOver={handleEditorDragOver}
            onDragLeave={handleEditorDragLeave}
            onDrop={handleEditorDrop}
          >
            {mediaUploading && (
              <div className="gh-media-upload-overlay">
                <Loader2 className="animate-spin" size={24} />
                <span>Uploading media...</span>
              </div>
            )}
            {isDraggingFile && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-brand-500/10 backdrop-blur-sm rounded-xl border-2 border-dashed border-brand-400">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-brand-500" />
                  <p className="mt-2 text-sm font-medium text-brand-600">Drop image to insert</p>
                </div>
              </div>
            )}
            <EditorContent editor={editor} />
            <BlockInsertHandle
              onSelect={handleBlockInsertCommand}
              position={blockInsertPosition}
            />
          </div>
        </main>

        {/* ── Right Panel (Settings) ──────────────────────────────────── */}
        {/* Mobile right panel backdrop */}
        {rightPanelOpen && (
          <div
            className="gh-mobile-backdrop lg:hidden"
            onClick={closeRightPanel}
          />
        )}
        <aside
          className={`gh-editor-right-panel ${
            rightPanelOpen
              ? 'block fixed inset-y-0 right-0 z-50 w-72 lg:static lg:w-[280px]'
              : 'hidden lg:block'
          }`}
        >
            <div className="gh-right-panel-header">
              <h3>Settings</h3>
              <button
                className="gh-right-panel-close"
                onClick={closeRightPanel}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="gh-right-panel-content">
              {/* Price */}
              <div className="gh-setting-group">
                <label className="gh-setting-label">Price</label>
                <div className="gh-setting-price-input">
                  <span className="gh-setting-currency">₽</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    min={0}
                    step={10}
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="gh-setting-group">
                <label className="gh-setting-label">Accent Color</label>
                <div className="gh-setting-colors">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.id}
                      className={`gh-setting-color-swatch ${
                        selectedAccent.id === color.id ? 'active' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={async () => {
                        if (guideId) {
                          await updateGuide(guideId, { accent_color: color.value })
                        }
                      }}
                      title={color.id}
                    />
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="gh-setting-group">
                <Toggle
                  checked={currentGuide?.show_preview ?? true}
                  onChange={async (val) => {
                    if (guideId) {
                      await updateGuide(guideId, { show_preview: val })
                    }
                  }}
                  label="Show preview"
                />
                <Toggle
                  checked={currentGuide?.is_course ?? false}
                  onChange={async (val) => {
                    if (guideId) {
                      await updateGuide(guideId, { is_course: val })
                    }
                  }}
                  label="Is a course"
                />
              </div>

              {/* Hidden Sections */}
              <div className="gh-setting-group">
                <label className="gh-setting-label">Section Visibility</label>
                {sections.map((section) => (
                  <div key={section.id} className="gh-setting-section-row">
                    <span className="gh-setting-section-title">{section.title}</span>
                    <Toggle
                      checked={!hideSections.has(section.id)}
                      onChange={(val) => {
                        setHideSections((prev) => {
                          const next = new Set(prev)
                          if (val) {
                            next.delete(section.id)
                          } else {
                            next.add(section.id)
                          }
                          return next
                        })
                      }}
                      label={hideSections.has(section.id) ? 'Hidden' : 'Visible'}
                    />
                  </div>
                ))}
              </div>
            </div>
          </aside>
      </div>

      {/* ── Slash Menu ──────────────────────────────────────────────────── */}
      {showSlash && (
        <SlashMenu
          commands={SLASH_COMMANDS}
          query={slashQuery}
          activeIndex={slashActiveIdx}
          onIndexChange={setSlashActiveIdx}
          onSelect={handleSlashCommand}
          position={slashMenuPosition}
          menuRef={slashMenuRef}
        />
      )}
      {/* ── Bubble Menu ─────────────────────────────────────────────────── */}
      {editor && (
        <BubbleMenuComponent
          editor={editor}
          scrollTarget={editorCanvasRef.current}
          onAiEdit={() => {
            setShowAi(true)
          }}
          onTogglePaid={() => {
            editor.chain().focus().toggleMark('paidText').run()
          }}
          onSetLink={() => {
            const url = prompt('Enter URL:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
        />
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  )
  return match ? match[1] : null
}








