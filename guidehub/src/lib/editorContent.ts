import type { JSONContent } from '@tiptap/core'
import type { GuideSection } from '@/types'

const EMPTY_HTML = '<p></p>'

const PAID_INLINE_REGEX = /<span\b[^>]*data-paid-text\s*=\s*["']?true["']?[^>]*>[\s\S]*?<\/span>/gi

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeHtml(value: string): string {
  const trimmed = value.trim()
  return trimmed ? trimmed : EMPTY_HTML
}

function nodeToText(node: unknown): string {
  if (!isRecord(node)) return ''

  if (typeof node.text === 'string') return node.text

  if (Array.isArray(node.content)) {
    return node.content.map(nodeToText).join(' ').replace(/\s+/g, ' ').trim()
  }

  return ''
}

function docToParagraphHtml(doc: UnknownRecord): string {
  if (!Array.isArray(doc.content)) return EMPTY_HTML

  const blocks = doc.content
    .map(nodeToText)
    .map((text) => text.trim())
    .filter((text) => text.length > 0)

  if (!blocks.length) return EMPTY_HTML

  return blocks.map((text) => `<p>${escapeHtml(text)}</p>`).join('')
}

function plainTextToHtml(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return EMPTY_HTML
  if (trimmed.startsWith('<')) return normalizeHtml(trimmed)
  return `<p>${escapeHtml(trimmed)}</p>`
}

export interface StoredSectionContent {
  version: 2
  format: 'tiptap'
  html: string
  doc: JSONContent | null
}

export function createStoredSectionContent(html: string, doc: JSONContent | null): StoredSectionContent {
  return {
    version: 2,
    format: 'tiptap',
    html: normalizeHtml(html),
    doc,
  }
}

export function extractSectionHtml(content: unknown): string {
  if (!content) return EMPTY_HTML

  if (typeof content === 'string') {
    return plainTextToHtml(content)
  }

  if (!isRecord(content)) {
    return EMPTY_HTML
  }

  const htmlCandidate = content.html
  if (typeof htmlCandidate === 'string') {
    return normalizeHtml(htmlCandidate)
  }

  if (content.type === 'doc' && Array.isArray(content.content)) {
    return docToParagraphHtml(content)
  }

  if (content.version === 2 && content.format === 'tiptap' && isRecord(content.doc)) {
    return docToParagraphHtml(content.doc)
  }

  if (content.type === 'paragraph' && typeof content.content === 'string') {
    return `<p>${escapeHtml(content.content)}</p>`
  }

  if (typeof content.content === 'string') {
    return `<p>${escapeHtml(content.content)}</p>`
  }

  if (Array.isArray(content.content)) {
    const text = content.content
      .map((item) => {
        if (typeof item === 'string') return item
        if (isRecord(item) && typeof item.text === 'string') return item.text
        return ''
      })
      .join(' ')
      .trim()

    return text ? `<p>${escapeHtml(text)}</p>` : EMPTY_HTML
  }

  return EMPTY_HTML
}

export function buildEditorContentFromSections(sectionList: GuideSection[], fallbackContent = EMPTY_HTML): string {
  if (!sectionList.length) return fallbackContent

  const ordered = [...sectionList].sort((a, b) => a.order - b.order)

  if (ordered.length === 1) {
    return extractSectionHtml(ordered[0].content)
  }

  const combined = ordered
    .map((section) => {
      const titleBlock = section.title ? `<h2>${escapeHtml(section.title)}</h2>` : ''
      return `${titleBlock}${extractSectionHtml(section.content)}`
    })
    .join('')

  return combined || fallbackContent
}

export function redactPaidInlineHtml(html: string, placeholder = 'Paid content'): string {
  if (!html.trim()) return EMPTY_HTML

  return html.replace(
    PAID_INLINE_REGEX,
    `<span data-paid-text="true" class="gh-paid-inline-placeholder">${escapeHtml(placeholder)}</span>`,
  )
}

const PAID_BLOCK_REGEX = /<div[^>]*data-paid-block=["']?true["']?[^>]*>[\s\S]*?<\/div>/gi

export function redactPaidBlocksHtml(html: string): string {
  if (!html.trim()) return EMPTY_HTML

  return html.replace(PAID_BLOCK_REGEX, (match) => {
    return `<div class="gh-locked-block" data-locked="true">
      <div class="gh-locked-block-icon">&#128274;</div>
      <div class="gh-locked-block-text">This content is locked</div>
      <div class="gh-locked-block-hint">Purchase this guide to unlock</div>
    </div>`
  })
}

export function sanitizeRichHtml(html: string): string {
  if (!html.trim()) return EMPTY_HTML

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('script, style, iframe, object, embed, link, meta, form').forEach((node) => {
    node.remove()
  })

  doc.body.querySelectorAll<HTMLElement>('*').forEach((node) => {
    for (const attr of [...node.attributes]) {
      const attrName = attr.name.toLowerCase()
      const attrValue = attr.value.trim().toLowerCase()

      if (attrName.startsWith('on')) {
        node.removeAttribute(attr.name)
        continue
      }

      if ((attrName === 'href' || attrName === 'src') && attrValue.startsWith('javascript:')) {
        node.removeAttribute(attr.name)
      }
    }
  })

  return normalizeHtml(doc.body.innerHTML)
}
