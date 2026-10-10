import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowDownUp, ChevronDown, Disc3, Heart, Headphones, LoaderCircle, MapPin, MoreHorizontal, Pause, Play, Radio, Search, SkipBack, SkipForward, Volume2, X } from 'lucide-react'
import { categories, countries, sampleStations, stationFromDirectory, type Station } from './radioData'

const FAVORITES_KEY = 'orbit-radio-favorites'
const GENRES_KEY = 'orbit-radio-genres'

function readStoredList(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as string[] } catch { return [] }
}

function formatCount(value?: number) {
  if (!value) return '—'
  return value > 999 ? `${(value / 1000).toFixed(1)}k` : String(value)
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
  const [directoryState, setDirectoryState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
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
    if (!country && category === 'All stations') { setDirectoryStations([]); setDirectoryState('idle'); return }
    const controller = new AbortController()
    setDirectoryState('loading')
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
        setDirectoryState('loaded')
      })
      .catch(() => { if (!controller.signal.aborted) { setDirectoryStations([]); setDirectoryState('error') } })
    return () => controller.abort()
  }, [category, country])

  const allStations = useMemo(() => {
    const unique = new Map<string, Station>()
    const featuredStreams = new Set(sampleStations.map((station) => station.streamUrl.trim().replace(/\/+$/, '').toLowerCase()))
    sampleStations.forEach((station) => unique.set(station.id, station))
    directoryStations.forEach((station) => {
      if (!featuredStreams.has(station.streamUrl.trim().replace(/\/+$/, '').toLowerCase())) unique.set(station.id, station)
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
    setActiveStation(station)
    setIsLoading(true)
    setPlaybackError('')
    setCurrentTime(0)
    setDuration(0)
    audio.src = station.streamUrl
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

  const chooseCountry = (name: string, code?: string) => {
    const target = allCountries.find((item) => item.apiName === name || item.name === name || (code && item.code === code))
    const apiName = target?.apiName || name
    setCountry((current) => current === apiName ? '' : apiName)
    setShowFavoritesOnly(false)
  }
  const toggleGenreFavorite = (name: string) => setFavoriteGenres((current) => current.includes(name) ? current.filter((genre) => genre !== name) : [...current, name])
  const seek = (value: number) => { if (audioRef.current && Number.isFinite(audioRef.current.duration)) audioRef.current.currentTime = value }
  const timeLabel = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`
  const countryLabel = allCountries.find((item) => item.apiName === country)?.name || country
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Orbit Radio home">
          <span className="brand-mark"><Radio size={22} strokeWidth={2.2} /></span>
          <span className="brand-name">orbit<span>radio</span></span>
        </a>
        <div className="sidebar-label">DISCOVER</div>
        <button className={`nav-item ${!showFavoritesOnly ? 'selected' : ''}`} onClick={() => { setShowFavoritesOnly(false); setCountry('') }}><Disc3 size={17} /> Browse stations</button>
        <button className={`nav-item ${showFavoritesOnly ? 'selected' : ''}`} onClick={() => { setShowFavoritesOnly(true); setCountry('') }}><Heart size={17} /> Your favorites <span className="nav-count">{favorites.length}</span></button>
        <div className="sidebar-divider" />
        <div className="sidebar-heading"><span className="sidebar-label">YOUR VIBE</span><button className="small-icon-button" onClick={() => setFavoriteGenres([])} title="Clear favorite categories"><ArrowDownUp size={14} /></button></div>
        <div className="genre-list">
          {categories.map((item) => <div className={`genre-row ${category === item.name ? 'genre-active' : ''}`} key={item.name}>
            <button className="genre-select" onClick={() => { setCategory(item.name); setShowFavoritesOnly(false) }}><span className="genre-symbol">{item.icon}</span>{item.name}</button>
            {item.name !== 'All stations' && <button className={`genre-heart ${favoriteGenres.includes(item.name) ? 'hearted' : ''}`} onClick={() => toggleGenreFavorite(item.name)} aria-label={`${favoriteGenres.includes(item.name) ? 'Remove' : 'Add'} ${item.name} category to favorites`}><Heart size={13} fill={favoriteGenres.includes(item.name) ? 'currentColor' : 'none'} /></button>}
          </div>)}
        </div>
        <div className="sidebar-divider country-divider" />
        <div className="sidebar-label">POPULAR COUNTRIES</div>
        <div className="country-list">
          {countries.slice(0, 6).map((item) => <button className={`country-row ${countryLabel === item.name ? 'country-active' : ''}`} key={item.code} onClick={() => chooseCountry(item.name, item.code)}><span className="flag">{item.flag}</span><span>{item.name}</span><span className="country-count">{formatCount(allCountries.find((entry) => entry.code === item.code)?.stationCount)}</span></button>)}
        </div>
        <div className="sidebar-bottom"><span className="status-dot" /> <span>Connecting the world</span><MoreHorizontal size={16} /></div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar">
          <div className="breadcrumb"><span>Discover</span><span className="crumb-slash">/</span><strong>{countryLabel || (showFavoritesOnly ? 'Your favorites' : 'Around the world')}</strong></div>
          <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Station, city, country..." /><kbd>⌘ K</kbd>{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={14} /></button>}</label>
          <button className="avatar" title="Your profile">M</button>
        </header>

        <section className="welcome-row">
          <div><div className="eyebrow"><span className="live-dot" /> LIVE FROM EVERYWHERE</div><h1>Sound has <span>no borders.</span></h1><p>One planet. Thousands of frequencies. Find your next favorite sound.</p></div>
          <button className="explore-pill" onClick={() => { setCountry(''); setCategory('All stations'); setShowFavoritesOnly(false) }}><Disc3 size={16} /> Explore stations</button>
        </section>

        <section className="explore-panel">
          <div className="explore-copy"><div className="eyebrow"><span className="live-dot" /> OPEN RADIO DIRECTORY</div><h2>{country ? `Radio in ${countryLabel}` : category === 'All stations' ? 'Find your frequency.' : `${category}, from everywhere.`}</h2><p>Independent stations, live streams, and local sounds from around the world.</p></div>
          <div className="explore-controls"><label className="map-control"><MapPin size={15} /><select value={country} onChange={(event) => { setCountry(event.target.value); setShowFavoritesOnly(false) }} aria-label="Filter by country"><option value="">All countries</option>{allCountries.map((item) => <option key={`${item.code}-${item.apiName}`} value={item.apiName}>{item.flag} {item.name}</option>)}</select><ChevronDown size={14} /></label><span className="directory-total">{visibleStations.length.toLocaleString()} {visibleStations.length === 1 ? 'station' : 'stations'}</span></div>
          <div className="category-chips" aria-label="Browse station categories">{categories.map((item) => <button className={`category-chip ${category === item.name ? 'chip-active' : ''}`} key={item.name} onClick={() => { setCategory(item.name); setShowFavoritesOnly(false) }}>{item.name}</button>)}</div>
        </section>

        <section className="stations-section">
          <div className="section-title-row"><div><div className="section-kicker">CURATED FOR YOUR EARS</div><h2>{showFavoritesOnly ? 'Your favorites' : country ? `Tuned into ${countryLabel}` : category === 'All stations' ? 'Trending stations' : `${category} stations`} <span className="result-count">{visibleStations.length}</span></h2></div><div className="station-tools"><button className="sort-button"><ArrowDownUp size={14} /> Popular <ChevronDown size={13} /></button><button className={`round-filter ${showFavoritesOnly ? 'filter-active' : ''}`} onClick={() => setShowFavoritesOnly((current) => !current)} title="Toggle favorite stations"><Heart size={15} /></button></div></div>
          {(country || category !== 'All stations') && <div className="directory-note">{directoryState === 'loading' ? <><LoaderCircle className="spin" size={13} /> Loading all {countryLabel || category} stations from the public directory…</> : directoryState === 'error' ? 'Live directory is unavailable right now. Showing featured stations.' : directoryState === 'loaded' ? `${visibleStations.length.toLocaleString()} matching stations · ${directoryStations.length.toLocaleString()} loaded from Radio Browser` : 'Showing featured stations'}</div>}
          <div className="station-grid">
            {visibleStations.slice(0, stationLimit).map((station, index) => <article className={`station-card ${activeStation.id === station.id ? 'station-current' : ''}`} key={station.id}>
              <button className="station-art" onClick={() => playStation(station)} aria-label={`Play ${station.name}`}>
                {station.favicon ? <img src={station.favicon} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} /> : <span className={`art-graphic art-${index % 5}`}><Radio size={26} /><span className="art-wave" /></span>}
                <span className="card-play">{activeStation.id === station.id && isPlaying ? <Activity size={17} /> : <Play size={17} fill="currentColor" />}</span>
              </button>
              <div className="station-info"><div className="station-name-row"><button className="station-name" onClick={() => playStation(station)}>{station.name}</button><button className={`card-heart ${favorites.includes(station.id) ? 'hearted' : ''}`} onClick={() => toggleFavorite(station)} aria-label="Toggle station favorite"><Heart size={15} fill={favorites.includes(station.id) ? 'currentColor' : 'none'} /></button></div><div className="station-meta"><span>{countries.find((item) => item.code === station.countryCode)?.flag || '🌐'} {station.city}</span><span className="meta-dot">·</span><span>{station.genre}</span></div><div className="station-live"><span className="tiny-live" /> LIVE <span className="listener-count"><Headphones size={12} /> {formatCount(station.listeners)}</span></div></div>
            </article>)}
            {visibleStations.length === 0 && <div className="empty-state"><Radio size={24} /><strong>No stations found</strong><span>Try a different search, category, or country.</span><button onClick={() => { setSearch(''); setCategory('All stations'); setCountry(''); setShowFavoritesOnly(false) }}>Reset filters</button></div>}
          </div>
          {visibleStations.length > stationLimit && <button className="load-more" onClick={() => setStationLimit(visibleStations.length)}>Show all {visibleStations.length.toLocaleString()} stations <span>↓</span></button>}
        </section>
        <footer className="footer-note">Independent radio from around the world <span>·</span> Powered by open radio directories</footer>
      </main>

      <footer className="player-bar">
        <audio ref={audioRef} onPlaying={() => { setIsPlaying(true); setIsLoading(false); setPlaybackError('') }} onPause={() => setIsPlaying(false)} onWaiting={() => setIsLoading(true)} onCanPlay={() => setIsLoading(false)} onError={(event) => { setIsPlaying(false); setIsLoading(false); setPlaybackError(playbackMessage(event.currentTarget.error?.code)) }} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} />
        <div className="player-station"><div className="player-cover"><Radio size={20} /></div><div className="player-track"><strong>{activeStation.name}</strong><span>{activeStation.city} · {activeStation.country}</span></div><button className={`player-heart ${isFavorite ? 'hearted' : ''}`} onClick={() => toggleFavorite(activeStation)} aria-label="Toggle favorite"><Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} /></button></div>
        <div className="player-center"><div className="player-controls"><button className="control-quiet" onClick={() => { const currentIndex = allStations.findIndex((station) => station.id === activeStation.id); playStation(allStations[(currentIndex - 1 + allStations.length) % allStations.length]) }} aria-label="Previous station"><SkipBack size={16} fill="currentColor" /></button><button className="play-button" onClick={() => playStation(activeStation)} aria-label={isPlaying ? 'Pause' : 'Play'}>{isLoading ? <LoaderCircle size={17} className="spin" /> : isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button><button className="control-quiet" onClick={playNextStation} aria-label="Next station"><SkipForward size={16} fill="currentColor" /></button></div><div className="progress-row"><span>{timeLabel(currentTime)}</span><input type="range" min="0" max={duration || 1} value={Math.min(currentTime, duration || 1)} onChange={(event) => seek(Number(event.target.value))} aria-label="Seek position" /><span>{duration ? timeLabel(duration) : 'LIVE'}</span></div>{playbackError && <div className="playback-error" role="status">{playbackError} <button onClick={playNextStation}>Try next station</button></div>}</div>
        <div className="player-right"><span className={`player-live ${isPlaying ? 'is-on' : ''}`}><span /> {isPlaying ? 'LIVE' : 'READY'}</span><Volume2 size={17} /><input className="volume-slider" type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Volume" /></div>
      </footer>
    </div>
  )
}

export default App
