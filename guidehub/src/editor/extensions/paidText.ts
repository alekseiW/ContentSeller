import { Mark, mergeAttributes } from '@tiptap/core'

export const PaidText = Mark.create({
  name: 'paidText',
  inclusive: false,

  parseHTML() {
    return [{ tag: 'span[data-paid-text="true"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-paid-text': 'true',
        class: 'gh-paid-inline',
      }),
      0,
    ]
  },
})
