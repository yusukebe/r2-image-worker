export type Type = {
  mimeType: string
  suffix: string
}

const signatures: Record<string, Type> = {
  R0lGODdh: { mimeType: 'image/gif', suffix: 'gif' },
  R0lGODlh: { mimeType: 'image/gif', suffix: 'gif' },
  iVBORw0KGgo: { mimeType: 'image/png', suffix: 'png' },
  '/9j/': { mimeType: 'image/jpg', suffix: 'jpg' },
  'UklGRg==': { mimeType: 'image/webp', suffix: 'webp' }
}

export const detectType = (b64: string): Type | undefined => {
  for (const s in signatures) {
    if (b64.indexOf(s) === 0) {
      return signatures[s]
    }
  }
}
