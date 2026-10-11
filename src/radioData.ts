export type Station = {
  id: string
  name: string
  country: string
  countryCode: string
  city: string
  genre: string
  tags: string[]
  streamUrl: string
  lat: number
  lon: number
  listeners?: number
  favicon?: string
}

export function normalizeStreamUrl(value: string) {
  const streamUrl = value.trim()
  if (!streamUrl) return streamUrl
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && /^http:\/\//i.test(streamUrl)) {
    return streamUrl.replace(/^http:/i, 'https:')
  }
  return streamUrl
}

export const categories = [
  { name: 'All stations', icon: '◉' },
  { name: 'Jazz', icon: '♫' },
  { name: 'Electronic', icon: '◌' },
  { name: 'Classical', icon: '♬' },
  { name: 'News', icon: '▤' },
  { name: 'Indie', icon: '✳' },
  { name: 'Ambient', icon: '☾' },
  { name: 'Talk', icon: '◍' },
]

export const countries = [
  { name: 'United States', code: 'US', flag: '🇺🇸', lat: 39, lon: -98 },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', lat: 54, lon: -2 },
  { name: 'France', code: 'FR', flag: '🇫🇷', lat: 46, lon: 2 },
  { name: 'Ukraine', code: 'UA', flag: '🇺🇦', lat: 49, lon: 32 },
  { name: 'Hungary', code: 'HU', flag: '🇭🇺', lat: 47, lon: 19 },
  { name: 'Japan', code: 'JP', flag: '🇯🇵', lat: 36, lon: 138 },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷', lat: -10, lon: -55 },
  { name: 'Germany', code: 'DE', flag: '🇩🇪', lat: 51, lon: 10 },
  { name: 'Australia', code: 'AU', flag: '🇦🇺', lat: -25, lon: 134 },
  { name: 'Netherlands', code: 'NL', flag: '🇳🇱', lat: 52, lon: 5 },
]

// Stream endpoints are public examples and may change or be unavailable. Directory results are
// loaded from Radio Browser at runtime; the HTTP example is retained exactly as requested.
export const sampleStations: Station[] = [
  { id: 'kexp-seattle', name: 'KEXP 90.3 FM', country: 'United States', countryCode: 'US', city: 'Seattle', genre: 'Indie', tags: ['indie', 'alternative', 'music'], streamUrl: 'https://kexp.streamguys1.com/kexp160.aac', lat: 47.61, lon: -122.33, listeners: 1240 },
  { id: 'kcrw-la', name: 'KCRW Eclectic 24', country: 'United States', countryCode: 'US', city: 'Los Angeles', genre: 'Electronic', tags: ['electronic', 'indie', 'eclectic'], streamUrl: 'https://kcrw.streamguys1.com/kcrw_192k_mp3_e24', lat: 34.05, lon: -118.24, listeners: 860 },
  { id: 'wfmu-jersey', name: 'WFMU 91.1 FM', country: 'United States', countryCode: 'US', city: 'Jersey City', genre: 'Indie', tags: ['freeform', 'indie', 'music'], streamUrl: 'http://stream0.wfmu.org/freeform-128k', lat: 40.72, lon: -74.04, listeners: 520 },
  { id: 'radio-paradise', name: 'Radio Paradise', country: 'United States', countryCode: 'US', city: 'Paradise', genre: 'Ambient', tags: ['eclectic', 'rock', 'ambient'], streamUrl: 'https://stream.radioparadise.com/mp3-128', lat: 39.76, lon: -121.62, listeners: 980 },
  { id: 'fip-paris', name: 'FIP', country: 'France', countryCode: 'FR', city: 'Paris', genre: 'Jazz', tags: ['jazz', 'eclectic', 'world'], streamUrl: 'https://icecast.radiofrance.fr/fip-hifi.aac', lat: 48.86, lon: 2.35, listeners: 2140 },
  { id: 'france-inter', name: 'France Inter', country: 'France', countryCode: 'FR', city: 'Paris', genre: 'News', tags: ['news', 'talk', 'culture'], streamUrl: 'https://icecast.radiofrance.fr/franceinter-hifi.aac', lat: 48.86, lon: 2.34, listeners: 1950 },
  { id: 'nts-london', name: 'NTS Radio', country: 'United Kingdom', countryCode: 'GB', city: 'London', genre: 'Electronic', tags: ['electronic', 'underground', 'culture'], streamUrl: 'https://stream-relay-geo.ntslive.net/stream', lat: 51.51, lon: -0.12, listeners: 1530 },
  { id: 'radio-garden-demo', name: 'Radio Garden · Global', country: 'United States', countryCode: 'US', city: 'Global stream', genre: 'Talk', tags: ['community', 'world', 'talk'], streamUrl: 'http://195.234.148.51:8000/stream/', lat: 40.71, lon: -74.01, listeners: 86 },
  { id: 'somafm-tokyo', name: 'SomaFM Groove Salad', country: 'Japan', countryCode: 'JP', city: 'Tokyo', genre: 'Ambient', tags: ['ambient', 'downtempo', 'electronic'], streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3', lat: 35.68, lon: 139.69, listeners: 670 },
  { id: 'j-wave', name: 'J-WAVE 81.3 FM', country: 'Japan', countryCode: 'JP', city: 'Tokyo', genre: 'Pop', tags: ['japanese', 'pop', 'music'], streamUrl: 'https://musicbird.leanstream.co/JWAVE', lat: 35.67, lon: 139.76, listeners: 730 },
  { id: 'radio-nova', name: 'Radio Nova', country: 'France', countryCode: 'FR', city: 'Paris', genre: 'Jazz', tags: ['jazz', 'soul', 'world'], streamUrl: 'https://novazz.ice.infomaniak.ch/novazz-128.mp3', lat: 48.87, lon: 2.33, listeners: 430 },
  { id: 'zakarpattya-fm', name: 'Zakarpattya FM 101.9', country: 'Ukraine', countryCode: 'UA', city: 'Uzhhorod', genre: 'Pop', tags: ['ukrainian', 'pop', 'local'], streamUrl: 'https://online.kissfm.ua/KissFM_Ukr', lat: 48.62, lon: 22.30, listeners: 1 },
  { id: 'kiss-fm-ukraine', name: 'Kiss FM Ukrainian', country: 'Ukraine', countryCode: 'UA', city: 'Kyiv', genre: 'Electronic', tags: ['electronic', 'dance', 'ukrainian'], streamUrl: 'https://online.kissfm.ua/KissFM_Ukr', lat: 50.45, lon: 30.52, listeners: 34 },
  { id: 'kiss-fm-ukraine-hd', name: 'Kiss FM Ukraine', country: 'Ukraine', countryCode: 'UA', city: 'Kyiv', genre: 'Electronic', tags: ['electronic', 'dance', 'ukrainian'], streamUrl: 'https://online.kissfm.ua/KissFM_HD', lat: 50.45, lon: 30.52, listeners: 31 },
  { id: 'dance-wave-hungary', name: 'Dance Wave!', country: 'Hungary', countryCode: 'HU', city: 'Budapest', genre: 'Electronic', tags: ['dance', 'electronic', 'house'], streamUrl: 'https://dancewave.online/dance.mp3', lat: 47.50, lon: 19.04, listeners: 397 },
  { id: 'retro-radio-hungary', name: 'Retro Rádió', country: 'Hungary', countryCode: 'HU', city: 'Budapest', genre: 'Pop', tags: ['retro', 'pop', 'hungarian'], streamUrl: 'https://icast.connectmedia.hu/5001/live.mp3', lat: 47.50, lon: 19.04, listeners: 65 },
  { id: 'triplej', name: 'Triple J', country: 'Australia', countryCode: 'AU', city: 'Sydney', genre: 'Indie', tags: ['indie', 'alternative', 'new music'], streamUrl: 'https://mediaserviceslive.akamaized.net/hls/live/2038308/triplej/master.m3u8', lat: -33.87, lon: 151.21, listeners: 1120 },
]

export function stationFromDirectory(item: Record<string, unknown>): Station | null {
  const streamUrl = normalizeStreamUrl(String(item.url_resolved || item.url || ''))
  const name = String(item.name || '').trim()
  if (!name || !streamUrl) return null
  const country = String(item.country || 'Unknown')
  const tags = String(item.tags || '').split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean)
  const countryMatch = countries.find((entry) => entry.name.toLowerCase() === country.toLowerCase())
  return {
    id: `radio-browser-${String(item.stationuuid || `${name}-${streamUrl}`)}`,
    name,
    country,
    countryCode: String(item.countrycode || countryMatch?.code || ''),
    city: String(item.state || item.language || 'Live radio'),
    genre: tags[0] ? tags[0].replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Radio',
    tags,
    streamUrl,
    lat: Number(item.geo_lat) || countryMatch?.lat || 0,
    lon: Number(item.geo_long) || countryMatch?.lon || 0,
    listeners: Number(item.clickcount) || undefined,
    favicon: typeof item.favicon === 'string' ? item.favicon : undefined,
  }
}
