export const STREAM_PROXY = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_STREAM_PROXY : '') || ''

export function buildStreamUrl(streamUrl: string) {
  const value = streamUrl.trim()
  if (!value) return value

  let target: URL
  try {
    target = new URL(value)
  } catch {
    return value
  }

  if (target.protocol !== 'http:') return value

  const ipV4 = /^(\d{1,3}(?:\.\d{1,3}){3})$/.exec(target.hostname)
  if (ipV4) target.hostname = `${ipV4[1]}.nip.io`

  const proxy = STREAM_PROXY || 'https://orbit-radio.drerchi.workers.dev'
  return `${proxy.replace(/\/$/, '')}?url=${encodeURIComponent(target.toString())}`
}
