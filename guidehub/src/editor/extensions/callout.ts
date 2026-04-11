import { Node, mergeAttributes } from '@tiptap/core'

function getIcon(type: string): string {
  switch (type) {
    case 'warning':
      return '⚠️'
    case 'success':
      return '✅'
    case 'danger':
      return '🚨'
    default:
      return 'ℹ️'
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type?: string) => ReturnType
      toggleCallout: (type?: string) => ReturnType
    }
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.getAttribute('data-callout-type') || 'info',
        renderHTML: (attributes) => ({
          'data-callout-type': attributes.type,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout-type]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: `gh-callout gh-callout-${node.attrs.type}`,
      }),
      ['div', { class: 'gh-callout-icon' }, getIcon(node.attrs.type)],
      ['div', { class: 'gh-callout-content' }, 0],
    ]
  },

  addCommands() {
    return {
      setCallout:
        (type: string = 'info') =>
        ({ commands }) =>
          commands.setNode(this.name, { type }),
      toggleCallout:
        (type: string = 'info') =>
        ({ commands }) =>
          commands.toggleNode(this.name, 'paragraph', { type }),
    }
  },
})
