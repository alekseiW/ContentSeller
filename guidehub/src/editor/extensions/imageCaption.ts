import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageWithCaption: {
      setImageWithCaption: (options: { src: string; alt?: string }) => ReturnType
    }
  }
}

export const ImageCaption = Node.create({
  name: 'imageWithCaption',
  group: 'block',
  content: 'inline*',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      width: { default: '100%' },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-image-with-caption]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'figure',
      mergeAttributes(HTMLAttributes, {
        'data-image-with-caption': 'true',
        class: 'gh-image-block',
      }),
      [
        'img',
        {
          src: HTMLAttributes.src,
          alt: HTMLAttributes.alt || '',
          style: `width: ${HTMLAttributes.width || '100%'}`,
          class: 'gh-image-block-img',
        },
      ],
      ['figcaption', { class: 'gh-image-block-caption' }, 0],
    ]
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement('figure')
      container.classList.add('gh-image-block')
      container.setAttribute('data-image-with-caption', 'true')

      const img = document.createElement('img')
      img.src = node.attrs.src
      img.alt = node.attrs.alt || ''
      img.classList.add('gh-image-block-img')
      img.style.width = node.attrs.width || '100%'

      const caption = document.createElement('figcaption')
      caption.classList.add('gh-image-block-caption')
      caption.contentEditable = 'true'
      caption.textContent = node.attrs.alt || 'Add caption...'
      if (!node.attrs.alt) {
        caption.style.color = '#9ca3af'
        caption.style.fontStyle = 'italic'
      }

      caption.addEventListener('blur', () => {
        const pos = typeof getPos === 'function' ? getPos() : getPos
        if (typeof pos === 'number') {
          const text = caption.textContent || ''
          editor.commands.command(({ tr }) => {
            tr.setNodeAttribute(pos, 'alt', text)
            return true
          })
          if (!text) {
            caption.textContent = 'Add caption...'
            caption.style.color = '#9ca3af'
            caption.style.fontStyle = 'italic'
          } else {
            caption.style.color = ''
            caption.style.fontStyle = ''
          }
        }
      })

      caption.addEventListener('focus', () => {
        if (caption.textContent === 'Add caption...') {
          caption.textContent = ''
          caption.style.color = ''
          caption.style.fontStyle = ''
        }
      })

      container.appendChild(img)
      container.appendChild(caption)

      return {
        dom: container,
        contentDOM: caption,
      }
    }
  },

  addCommands() {
    return {
      setImageWithCaption:
        (options: { src: string; alt?: string }) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { src: options.src, alt: options.alt || '' },
          }),
    }
  },
})
