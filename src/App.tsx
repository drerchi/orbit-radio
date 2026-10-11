import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Heart, LoaderCircle, Pause, Play, Radio, Search, SkipBack, SkipForward, Volume2, X } from 'lucide-react'
import { categories, countries, normalizeStreamUrl, sampleStations, stationFromDirectory, type Station } from './radioData'
import { buildStreamUrl } from './streamProxy'

const FAVORITES_KEY = 'orbit-radio-favorites'
const GENRES_KEY = 'orbit-radio-genres'

function readStoredList(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as string[] } catch { return [] }
}

function playbackMessage(code?: number, errorName?: string) {
  if (errorName === 'NotAllowedError') return 'Browser blocked playback. Press play again to allow audio.'
  if (errorName === 'NotSupportedError' || code === 4) return 'This stream format is not supported by this browser.'
  if (code === 3) return 'The station sent an audio format this browser could not decode.'
  if (code === 2) return 'Could not reach this station. It may be offline or block this connection.'
  return 'No audio received from this station. Try another stream.'
}

type BrowseCountry = { name: string; apiName: string; code: string; flag: string; lat: number; lon: number; stationCount: number }

function flagForCountry(code: string) {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code.toUpperCase()].map((letter) => 127397 + letter.charCodeAt(0))) : '🌐'
}

function App() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [favorites, setFavorites] = useState<string[]>(() => readStoredList(FAVORITES_KEY))
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>(() => readStoredList(GENRES_KEY))
  const [category, setCategory] = useState('All stations')
  const [country, setCountry] = useState('')
  const [search, setSearch] = useState('')
  const [activeStation, setActiveStation] = useState<Station>(sampleStations[0])
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [volume, setVolume] = useState(72)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackError, setPlaybackError] = useState('')
  const [directoryStations, setDirectoryStations] = useState<Station[]>([])
  const [directoryCountries, setDirectoryCountries] = useState<BrowseCountry[]>([])
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(() => readStoredList(FAVORITES_KEY).length > 0)
  const [stationLimit, setStationLimit] = useState(24)

  const allCountries = useMemo(() => {
    if (!directoryCountries.length) return countries.map((item) => ({ ...item, apiName: item.name, stationCount: 0 }))
    const listed = directoryCountries.map((item) => ({ ...item, name: countries.find((known) => known.code === item.code)?.name || item.name }))
    const listedCodes = new Set(listed.map((item) => item.code))
    return [...listed, ...countries.filter((item) => !listedCodes.has(item.code)).map((item) => ({ ...item, apiName: item.name, stationCount: 0 }))]
  }, [directoryCountries])

  useEffect(() => localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)), [favorites])
  useEffect(() => localStorage.setItem(GENRES_KEY, JSON.stringify(favoriteGenres)), [favoriteGenres])
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume / 100 }, [volume])
  useEffect(() => setStationLimit(24), [category, country, search, showFavoritesOnly])

  useEffect(() => {
    const controller = new AbortController()
    fetch('https://all.api.radio-browser.info/json/countries?order=stationcount&reverse=true', { signal: controller.signal })
      .catch(() => fetch('https://de1.api.radio-browser.info/json/countries?order=stationcount&reverse=true', { signal: controller.signal }))
      .then((response) => { if (!response.ok) throw new Error('Country directory unavailable'); return response.json() })
      .then((results: Record<string, unknown>[]) => {
        if (controller.signal.aborted) return
        setDirectoryCountries(results.map((item) => {
          const code = String(item.iso_3166_1 || '').toUpperCase()
          const known = countries.find((entry) => entry.code === code)
          const name = String(item.name || known?.name || 'Unknown')
          return { name, apiName: name, code, flag: known?.flag || flagForCountry(code), lat: known?.lat || 0, lon: known?.lon || 0, stationCount: Number(item.stationcount) || 0 }
        }).filter((item) => item.code && item.apiName))
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!country && category === 'All stations') { setDirectoryStations([]); return }
    const controller = new AbortController()
    const endpoint = country
      ? `bycountryexact/${encodeURIComponent(country)}`
      : `bytag/${encodeURIComponent(category.toLowerCase())}`
    const directoryUrl = `json/stations/${endpoint}?limit=10000&hidebroken=true&order=clickcount&reverse=true`
    fetch(`https://all.api.radio-browser.info/${directoryUrl}`, { signal: controller.signal })
      .catch(() => fetch(`https://de1.api.radio-browser.info/${directoryUrl}`, { signal: controller.signal }))
      .then((response) => { if (!response.ok) throw new Error('Directory unavailable'); return response.json() })
      .then((results: Record<string, unknown>[]) => {
        if (controller.signal.aborted) return
        setDirectoryStations(results.map(stationFromDirectory).filter((station): station is Station => Boolean(station)))
      })
      .catch(() => { if (!controller.signal.aborted) setDirectoryStations([]) })
    return () => controller.abort()
  }, [category, country])

  const allStations = useMemo(() => {
    const unique = new Map<string, Station>()
    const featuredStreams = new Set(sampleStations.map((station) => normalizeStreamUrl(station.streamUrl).trim().replace(/\/+$/, '').toLowerCase()))
    sampleStations.forEach((station) => unique.set(station.id, { ...station, streamUrl: normalizeStreamUrl(station.streamUrl) }))
    directoryStations.forEach((station) => {
      const normalizedStream = normalizeStreamUrl(station.streamUrl)
      if (!featuredStreams.has(normalizedStream.trim().replace(/\/+$/, '').toLowerCase())) unique.set(station.id, { ...station, streamUrl: normalizedStream })
    })
    return [...unique.values()]
  }, [directoryStations])

  const visibleStations = useMemo(() => allStations.filter((station) => {
    const selectedCountry = allCountries.find((item) => item.apiName === country || item.name === country)
    const matchesCountry = !country || station.country === country || Boolean(selectedCountry?.code && station.countryCode === selectedCountry.code)
    const matchesCategory = category === 'All stations' || station.genre.toLowerCase() === category.toLowerCase() || station.tags.some((tag) => tag.includes(category.toLowerCase()))
    const matchesSearch = !search || `${station.name} ${station.country} ${station.city} ${station.genre} ${station.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())
    const matchesFavorites = !showFavoritesOnly || favorites.includes(station.id)
    return matchesCountry && matchesCategory && matchesSearch && matchesFavorites
  }), [allCountries, allStations, category, country, favorites, search, showFavoritesOnly])

  const isFavorite = favorites.includes(activeStation.id)
  const toggleFavorite = (station: Station) => setFavorites((current) => current.includes(station.id) ? current.filter((id) => id !== station.id) : [...current, station.id])

  const playStation = (station: Station) => {
    const audio = audioRef.current
    if (!audio) return
    if (activeStation.id === station.id && isPlaying) {
      audio.pause(); setIsPlaying(false); setIsLoading(false); return
    }
    const streamUrl = buildStreamUrl(station.streamUrl)
    setActiveStation({ ...station, streamUrl })
    setIsLoading(true)
    setPlaybackError('')
    setCurrentTime(0)
    setDuration(0)
    audio.src = streamUrl
    audio.load()
    audio.play().then(() => { setIsPlaying(true); setIsLoading(false) }).catch((error: unknown) => {
      setIsPlaying(false); setIsLoading(false)
      const errorName = error instanceof DOMException ? error.name : undefined
      setPlaybackError(playbackMessage(audio.error?.code, errorName))
    })
  }

  const playNextStation = () => {
    const currentIndex = allStations.findIndex((station) => station.id === activeStation.id)
    playStation(allStations[(currentIndex + 1) % allStations.length])
  }

  const toggleGenreFavorite = (name: string) => setFavoriteGenres((current) => current.includes(name) ? current.filter((genre) => genre !== name) : [...current, name])
  const seek = (value: number) => { if (audioRef.current && Number.isFinite(audioRef.current.duration)) audioRef.current.currentTime = value }
  const timeLabel = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`
  return (
    <div className="radio-shell" id="top">
      <header className="radio-header">
        <a className="radio-brand" href="#top" aria-label="Orbit Radio">
          <span className="radio-brand-icon"><Radio size={20} /></span>
          <span>orbit<span>radio</span></span>
        </a>
        <label className="radio-search">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stations, places, sounds" aria-label="Search stations" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}
        </label>
        <button className={`saved-toggle ${showFavoritesOnly ? 'is-active' : ''}`} onClick={() => setShowFavoritesOnly((current) => !current)} aria-pressed={showFavoritesOnly} aria-label="Toggle favorite stations" title="Favorites">
          <Heart size={18} fill={showFavoritesOnly ? 'currentColor' : 'none'} /><span>Favorites</span>{favorites.length > 0 && <span className="saved-count">{favorites.length}</span>}
        </button>
      </header>

      <nav className="radio-categories" aria-label="Station categories">
        {categories.map((item) => (
          <div className={`radio-category ${category === item.name ? 'is-selected' : ''}`} key={item.name}>
            <button className="category-select" onClick={() => { setCategory(item.name); setShowFavoritesOnly(false) }} aria-pressed={category === item.name}>
              <span>{item.icon}</span>{item.name === 'All stations' ? 'All' : item.name}
            </button>
            {item.name !== 'All stations' && <button className={`category-save ${favoriteGenres.includes(item.name) ? 'is-saved' : ''}`} onClick={() => toggleGenreFavorite(item.name)} aria-label={`${favoriteGenres.includes(item.name) ? 'Unsave' : 'Save'} ${item.name} category`} title="Save category"><Heart size={12} fill={favoriteGenres.includes(item.name) ? 'currentColor' : 'none'} /></button>}
          </div>
        ))}
      </nav>

      <main className="radio-main">
        <div className="radio-toolbar">
          <div className="radio-view-title">{showFavoritesOnly ? 'Your favorites' : category === 'All stations' ? 'Stations' : category}</div>
          <label className="country-select">
            <select value={country} onChange={(event) => { setCountry(event.target.value); setShowFavoritesOnly(false) }} aria-label="Filter by country">
              <option value="">Everywhere</option>
              {allCountries.map((item) => <option key={`${item.code}-${item.apiName}`} value={item.apiName}>{item.flag} {item.name}</option>)}
            </select><ChevronDown size={14} />
          </label>
        </div>

        <section className="radio-stations" aria-label={showFavoritesOnly ? 'Favorite stations' : 'Radio stations'}>
          {visibleStations.slice(0, stationLimit).map((station, index) => {
            const active = activeStation.id === station.id
            const saved = favorites.includes(station.id)
            return (
              <article className={`radio-station ${active ? 'is-current' : ''}`} key={station.id}>
                <button className={`station-play ${active && isPlaying ? 'is-playing' : ''}`} onClick={() => playStation(station)} aria-label={`${active && isPlaying ? 'Pause' : 'Play'} ${station.name}`}>
                  {active && isLoading ? <LoaderCircle className="spin" size={19} /> : active && isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
                </button>
                <div className={`station-artwork artwork-${index % 5}`} aria-hidden="true">
                  {station.favicon ? <img src={station.favicon} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : <Radio size={19} />}
                </div>
                <button className="station-copy" onClick={() => playStation(station)}>
                  <strong>{station.name}</strong><span>{station.city} · {station.country}</span>
                </button>
                <span className="station-genre">{station.genre}</span>
                <button className={`station-save ${saved ? 'is-saved' : ''}`} onClick={() => toggleFavorite(station)} aria-label={`${saved ? 'Remove' : 'Add'} ${station.name} ${saved ? 'from' : 'to'} favorites`} title={saved ? 'Remove favorite' : 'Save favorite'}>
                  <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
                </button>
              </article>
            )
          })}
          {visibleStations.length === 0 && <div className="radio-empty"><Heart size={22} />{showFavoritesOnly ? 'No saved stations yet' : 'No stations found'}</div>}
        </section>
        {visibleStations.length > stationLimit && <button className="radio-load-more" onClick={() => setStationLimit(visibleStations.length)}>Show all {visibleStations.length.toLocaleString()}</button>}
        {playbackError && <div className="radio-error" role="status">{playbackError}<button onClick={playNextStation}>Try next</button></div>}
      </main>

      <footer className="radio-player">
        <audio ref={audioRef} onPlaying={() => { setIsPlaying(true); setIsLoading(false); setPlaybackError('') }} onPause={() => setIsPlaying(false)} onWaiting={() => setIsLoading(true)} onCanPlay={() => setIsLoading(false)} onError={(event) => { setIsPlaying(false); setIsLoading(false); setPlaybackError(playbackMessage(event.currentTarget.error?.code)) }} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} />
        <div className="player-station">
          <div className="player-cover"><Radio size={19} /></div>
          <div className="player-track"><strong>{activeStation.name}</strong><span>{activeStation.city} · {activeStation.country}</span></div>
          <button className={`player-heart ${isFavorite ? 'hearted' : ''}`} onClick={() => toggleFavorite(activeStation)} aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}><Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} /></button>
        </div>
        <div className="player-center">
          <div className="player-controls">
            <button className="control-quiet" onClick={() => { const currentIndex = allStations.findIndex((station) => station.id === activeStation.id); playStation(allStations[(currentIndex - 1 + allStations.length) % allStations.length]) }} aria-label="Previous station"><SkipBack size={16} fill="currentColor" /></button>
            <button className="play-button" onClick={() => playStation(activeStation)} aria-label={isPlaying ? 'Pause' : 'Play'}>{isLoading ? <LoaderCircle size={18} className="spin" /> : isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button>
            <button className="control-quiet" onClick={playNextStation} aria-label="Next station"><SkipForward size={16} fill="currentColor" /></button>
          </div>
          <div className="progress-row"><span>{timeLabel(currentTime)}</span><input type="range" min="0" max={duration || 1} value={Math.min(currentTime, duration || 1)} onChange={(event) => seek(Number(event.target.value))} aria-label="Playback position" /><span>{duration ? timeLabel(duration) : 'LIVE'}</span></div>
        </div>
        <div className="player-volume"><Volume2 size={17} /><input type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume" /></div>
      </footer>
    </div>
  )
}

export default App
