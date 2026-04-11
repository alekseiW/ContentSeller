import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paidBlock: {
      setPaidBlock: () => ReturnType
      togglePaidBlock: () => ReturnType
      unsetPaidBlock: () => ReturnType
    }
  }
}

export const PaidBlock = Node.create({
  name: 'paidBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-paid-block-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) return {}
          return { 'data-paid-block-id': attributes.id }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-paid-block="true"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-paid-block': 'true',
        class: 'gh-paid-block',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setPaidBlock:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name, { id: crypto.randomUUID?.() ?? Date.now().toString() }),
      togglePaidBlock:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { id: crypto.randomUUID?.() ?? Date.now().toString() }),
      unsetPaidBlock:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    }
  },
})
