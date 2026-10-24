import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge the custom type scale so `text-small` and `text-ink-500` are not treated as conflicts.
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'title', 'heading', 'subheading', 'body', 'small', 'caption', 'overline'] }],
      shadow: [{ shadow: ['xs', 'card', 'pop', 'modal', 'focus', 'focus-danger'] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs))
}
