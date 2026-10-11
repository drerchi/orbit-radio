export const STREAM_PROXY = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_STREAM_PROXY : '') || ''

export function buildStreamUrl(streamUrl: string) {
  const value = streamUrl.trim()
  if (!value) return value

  if (STREAM_PROXY) {
    return `${STREAM_PROXY.replace(/\/$/, '')}?url=${encodeURIComponent(value)}`
  }

  return value
}
