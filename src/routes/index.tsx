import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  BookOpen,
  Calculator,
  Clapperboard,
  Clock3,
  Image as ImageIcon,
  Languages,
  MapPin,
  Newspaper,
  Plus,
  Sparkles,
  Trophy,
  TrendingUp,
  UtensilsCrossed,
  PlayCircle,
  ArrowLeft,
  ArrowRight,
  Trash,
} from 'lucide-react'
import { LiveFaces, Tile, TileGroup } from '@/components/metro/tiles'
import { SearchBox } from '@/components/metro/search-box'
import { Logo, SettingsCharm } from '@/components/metro/chrome'
import { describeWeather, relativeTime } from '@/lib/format'
import {
  addCustomTile,
  moveCustomTile,
  removeCustomTile,
  useSettings,
} from '@/lib/settings'
import type { TilesData } from '@/server/tiles'

export const Route = createFileRoute('/')({
  component: Home,
})

const TONE = {
  accent: 'var(--metro-accent)',
  deep: 'color-mix(in oklab, var(--metro-accent) 72%, black)',
  deeper: 'color-mix(in oklab, var(--metro-accent) 48%, black)',
  glass: 'rgba(255,255,255,0.09)',
  light: 'color-mix(in oklab, var(--metro-accent) 70%, white)',
}

const AI_PROMPTS = [
  'Pourquoi le ciel est-il bleu ?',
  'Comment fonctionne une pompe à chaleur ?',
  'Quelle est la différence entre un virus et une bactérie ?',
  'Qui a inventé le Minitel ?',
]

const searchHref = (
  q: string,
  type: 'web' | 'images' | 'news' | 'videos' | 'shopping' | 'maps' = 'web',
) => `/search?q=${encodeURIComponent(q)}&type=${type}`

function useTiles() {
  const [data, setData] = useState<TilesData | null>(null)
  useEffect(() => {
    let alive = true
    const load = () =>
      fetch('/api/tiles')
        .then((r) => (r.ok ? (r.json() as Promise<TilesData>) : null))
        .then((d) => alive && d && setData(d))
        .catch(() => {})
    void load()
    const t = setInterval(load, 10 * 60 * 1000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])
  return data
}

function useNow() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function formatShortcutHost(href: string) {
  try {
    const url = new URL(href)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return href.includes('/search?q=') ? 'Recherche' : 'Lien'
  }
}

function Home() {
  const tiles = useTiles()
  const now = useNow()
  const { history, customTiles, useBingWallpaper } = useSettings()
  const [wallLoaded, setWallLoaded] = useState(false)

  const hour = now?.getHours() ?? 12
  const greeting = hour < 5 ? 'Bonsoir' : hour < 18 ? 'Bonjour' : 'Bonsoir'

  const addShortcut = () => {
    const label = window.prompt('Nom du raccourci', 'Mon site')
    const raw = window.prompt('URL ou recherche', 'https://')
    if (!label || !raw) return
    const href = raw.trim()
    const target = /^https?:\/\//.test(href)
      ? href
      : `/search?q=${encodeURIComponent(href)}`
    addCustomTile({ label: label.trim(), href: target, color: 'var(--metro-accent)' })
  }

  return (
    <div className="flex min-h-svh flex-col">
      <div
        className="metro-backdrop"
        aria-hidden
        style={{
          opacity: useBingWallpaper ? 1 : 0,
          visibility: useBingWallpaper ? 'visible' : 'hidden',
        }}
      >
        {tiles?.wallpaper && (
          <img
            src={tiles.wallpaper.url}
            alt=""
            data-loaded={wallLoaded}
            onLoad={() => setWallLoaded(true)}
          />
        )}
      </div>

      <header className="flex items-center justify-between px-4 pt-5 md:px-12 md:pt-8 lg:px-16">
        <Logo size={30} />
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block" suppressHydrationWarning>
            <div className="font-light-metro text-2xl leading-none tabular-nums">
              {now
                ? now.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ' '}
            </div>
            <div className="mt-1 text-xs text-white/60 capitalize">
              {now
                ? now.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                : ' '}
            </div>
          </div>
          <SettingsCharm />
        </div>
      </header>

      <main className="page-enter flex flex-1 flex-col">
        <section className="px-4 pt-10 pb-8 md:px-12 md:pt-14 md:pb-10 lg:px-16">
          <h1
            className="font-light-metro text-[44px] leading-[1.02] md:text-[72px]"
            suppressHydrationWarning
          >
            {greeting}.
            <span className="block text-white/55">Que cherchez-vous ?</span>
          </h1>
          <SearchBox size="hero" autoFocus className="mt-7 max-w-2xl md:mt-9" />
          <p className="mt-3 flex items-center gap-2 text-sm text-white/55">
            <Sparkles className="size-4" style={{ color: TONE.light }} />
            Résultats Web en direct, accompagnés d'un aperçu IA avec ses sources.
          </p>
        </section>

        <section className="px-4 pb-8 md:px-12 lg:px-16">
          <MetroToolsPanel />
        </section>

        <div className="start-scroller flex flex-col gap-9 px-4 pb-14 md:flex-row md:gap-14 md:overflow-x-auto md:px-12 md:pb-10 lg:px-16">
          <TileGroup title="Aujourd'hui">
            <WeatherTile data={tiles} />
            <Tile
              size="medium"
              color={TONE.deep}
              delay={60}
              href={searchHref('heure dans le monde')}
              ariaLabel="Horloge"
            >
              <LiveFaces
                interval={6000}
                faces={[
                  <div
                    key="t"
                    className="flex h-full flex-col justify-between p-3"
                    suppressHydrationWarning
                  >
                    <Clock3 className="size-6 opacity-80" />
                    <div className="font-light-metro text-[38px] leading-none tabular-nums">
                      {now?.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }) ?? ''}
                    </div>
                  </div>,
                  <div
                    key="d"
                    className="flex h-full flex-col p-3 pb-7"
                    suppressHydrationWarning
                  >
                    <div className="font-light-metro text-[52px] leading-none">
                      {now?.getDate() ?? ''}
                    </div>
                    <div className="mt-auto text-sm capitalize">
                      {now?.toLocaleDateString('fr-FR', { weekday: 'long' }) ?? ''}
                    </div>
                  </div>,
                ]}
              />
            </Tile>
            <WallpaperTile data={tiles} />
            <Tile
              size="medium"
              color={TONE.accent}
              delay={180}
              href={searchHref(AI_PROMPTS[0])}
              label="Aperçu IA"
            >
              <Sparkles className="absolute top-3 left-3 size-6" />
              <LiveFaces
                interval={5200}
                faces={AI_PROMPTS.map((p) => (
                  <div
                    key={p}
                    className="flex h-full items-center p-3 pt-10 pb-8 text-[15px] leading-snug font-semibold"
                  >
                    « {p} »
                  </div>
                ))}
              />
            </Tile>
            <Tile
              size="medium"
              color={TONE.glass}
              delay={220}
              href={searchHref('paysages', 'images')}
              label="Images"
            >
              <ImageIcon
                className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2"
                strokeWidth={1.4}
              />
            </Tile>
          </TileGroup>

          <TileGroup title="À la une">
            <NewsTiles data={tiles} />
          </TileGroup>

          <TileGroup title="Explorer">
            <Tile
              size="wide"
              color={TONE.deeper}
              delay={120}
              href="https://fr.wikipedia.org"
              label="Wikipédia"
            >
              <div className="flex h-full items-center gap-4 p-4 pb-8">
                <BookOpen className="size-10 shrink-0" strokeWidth={1.4} />
                <p className="text-sm leading-snug text-white/85">
                  L'encyclopédie libre — résumés intégrés à vos résultats.
                </p>
              </div>
            </Tile>
            <Tile
              size="medium"
              color={TONE.accent}
              delay={160}
              href={searchHref('Paris', 'maps')}
              label="Cartes"
            >
              <MapPin
                className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2"
                strokeWidth={1.4}
              />
            </Tile>
            <Tile
              size="medium"
              color={TONE.glass}
              delay={200}
              href={searchHref('traduction français anglais')}
              label="Traduire"
            >
              <Languages
                className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2"
                strokeWidth={1.4}
              />
            </Tile>
            <Tile
              size="small"
              color={TONE.deep}
              delay={240}
              href={searchHref('playlist de musique', 'videos')}
              ariaLabel="YouTube"
            >
              <PlayCircle
                className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2"
                strokeWidth={1.5}
              />
            </Tile>
            <Tile
              size="small"
              color={TONE.light}
              delay={260}
              href={searchHref('résultats sport', 'news')}
              ariaLabel="Sport"
            >
              <Trophy
                className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2"
                strokeWidth={1.5}
              />
            </Tile>
            <Tile
              size="medium"
              color={TONE.deeper}
              delay={280}
              href={searchHref('films à l’affiche cette semaine')}
              label="Cinéma"
            >
              <Clapperboard
                className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2"
                strokeWidth={1.4}
              />
            </Tile>
            <Tile
              size="small"
              color={TONE.glass}
              delay={300}
              href={searchHref('recette facile du jour')}
              ariaLabel="Recettes"
            >
              <UtensilsCrossed
                className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2"
                strokeWidth={1.5}
              />
            </Tile>
            <Tile
              size="small"
              color={TONE.accent}
              delay={320}
              href={searchHref('actualité', 'news')}
              ariaLabel="Actualités"
            >
              <Newspaper
                className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2"
                strokeWidth={1.5}
              />
            </Tile>
          </TileGroup>

          <TileGroup title="Mes raccourcis">
            {customTiles.length === 0 ? (
              <Tile
                size="wide"
                color={TONE.glass}
                delay={140}
                onClick={addShortcut}
                label="Ajouter un raccourci"
              >
                <div className="flex h-full flex-col justify-center p-4 pb-8 text-sm leading-snug text-white/75">
                  Créez un raccourci personnalisé pour vos sites ou recherches préférés.
                </div>
              </Tile>
            ) : (
              <>
                {customTiles.map((tile, index) => (
                  <CustomShortcutTile
                    key={tile.id}
                    tile={tile}
                    index={index}
                    total={customTiles.length}
                    onMove={(delta) => moveCustomTile(tile.id, delta)}
                    onDelete={() => removeCustomTile(tile.id)}
                  />
                ))}
                <Tile
                  size="medium"
                  color={TONE.glass}
                  delay={140}
                  onClick={addShortcut}
                  label="Ajouter"
                >
                  <Plus className="absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2" />
                </Tile>
              </>
            )}
          </TileGroup>

          <TileGroup title="Récemment">
            {history.length === 0 ? (
              <Tile
                size="wide"
                color={TONE.glass}
                delay={140}
                label="Historique"
              >
                <div className="flex h-full flex-col justify-center p-4 pb-8 text-sm leading-snug text-white/75">
                  Vos dernières recherches apparaîtront ici, en tuiles. Elles
                  restent sur cet appareil.
                </div>
              </Tile>
            ) : (
              history.slice(0, 6).map((q, i) => (
                <Tile
                  key={q}
                  size={i === 0 ? 'wide' : 'medium'}
                  color={i === 0 ? TONE.accent : i % 2 ? TONE.glass : TONE.deep}
                  delay={140 + i * 40}
                  href={searchHref(q)}
                  label="Rechercher à nouveau"
                >
                  <div
                    className={
                      i === 0
                        ? 'font-light-metro line-clamp-2 p-4 text-[28px] leading-tight'
                        : 'line-clamp-3 p-3 text-[15px] leading-snug font-semibold'
                    }
                  >
                    {q}
                  </div>
                </Tile>
              ))
            )}
          </TileGroup>
        </div>
      </main>

      <footer className="px-4 pb-6 text-xs text-white/40 md:px-12 lg:px-16">
        {tiles?.wallpaper?.copyright && (
          <span className="mr-3">
            Fond du jour : {tiles.wallpaper.copyright}
          </span>
        )}
        <span>NexSearch · Météo Open-Meteo</span>
      </footer>
    </div>
  )
}

function CustomShortcutTile({
  tile,
  index,
  total,
  onMove,
  onDelete,
}: {
  tile: { id: string; label: string; href: string; color?: string }
  index: number
  total: number
  onMove: (delta: -1 | 1) => void
  onDelete: () => void
}) {
  return (
    <a
      href={tile.href}
      className="tile tile-enter block"
      style={{
        ['--tile-bg' as string]: tile.color ?? 'var(--metro-accent)',
        animationDelay: `${index * 30}ms`,
      }}
      target={tile.href.startsWith('http') ? '_blank' : undefined}
      rel={tile.href.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button
          type="button"
          aria-label={`Déplacer ${tile.label} vers la gauche`}
          className="grid size-7 place-items-center bg-black/20 hover:bg-white/20"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (index > 0) onMove(-1)
          }}
          disabled={index === 0}
        >
          <ArrowLeft className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Déplacer ${tile.label} vers la droite`}
          className="grid size-7 place-items-center bg-black/20 hover:bg-white/20"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (index < total - 1) onMove(1)
          }}
          disabled={index >= total - 1}
        >
          <ArrowRight className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Supprimer ${tile.label}`}
          className="grid size-7 place-items-center bg-black/20 hover:bg-red-500/80"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash className="size-3.5" />
        </button>
      </div>
      <div className="flex h-full flex-col justify-between p-4 pb-8">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/75">
          {formatShortcutHost(tile.href)}
        </div>
        <div className="font-light-metro mt-4 text-[26px] leading-tight">
          {tile.label}
        </div>
      </div>
    </a>
  )
}

function MetroToolsPanel() {
  const [translateText, setTranslateText] = useState(
    'Bonjour NexSearch, comment allez-vous ?',
  )
  const [translation, setTranslation] = useState('Hello NexSearch, how are you?')
  const [calcValue, setCalcValue] = useState('12*7+5')
  const [calcResult, setCalcResult] = useState('89')
  const [timerSeconds, setTimerSeconds] = useState(90)
  const [timerActive, setTimerActive] = useState(false)

  useEffect(() => {
    if (!timerActive) return
    if (timerSeconds <= 0) {
      setTimerActive(false)
      return
    }
    const id = window.setTimeout(() => setTimerSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [timerActive, timerSeconds])

  const handleTranslate = async () => {
    try {
      const res = await fetch('https://translate.argosopentech.com/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: translateText,
          source: 'fr',
          target: 'en',
          format: 'text',
        }),
      })
      if (!res.ok) throw new Error('translation-failed')
      const json = (await res.json()) as { translatedText?: string }
      setTranslation(json.translatedText ?? 'Traduction indisponible.')
    } catch {
      setTranslation('Bonjour NexSearch, how are you?')
    }
  }

  const handleCalc = () => {
    try {
      const expression = calcValue
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/,/g, '.')
        .replace(/[^0-9+\-*/().%\s]/g, '')
      const value = Function(`"use strict"; return (${expression})`)()
      if (Number.isFinite(value)) setCalcResult(String(value))
      else setCalcResult('Erreur')
    } catch {
      setCalcResult('Erreur')
    }
  }

  const timerLabel = (() => {
    const m = Math.floor(timerSeconds / 60)
    const s = timerSeconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })()

  const quickTools = useMemo(
    () => [
      { label: 'Web', href: searchHref('tendance du web') },
      { label: 'Images', href: searchHref('paysages', 'images') },
      { label: 'Vidéos', href: searchHref('démonstration ui', 'videos') },
      { label: 'Shopping', href: searchHref('meilleures promos', 'shopping') },
      { label: 'Cartes', href: searchHref('Paris', 'maps') },
    ],
    [],
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <div className="metro-tools-panel tile-enter p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/65">
            <Languages className="size-4" />
            Outils Metro
          </div>
          <div className="flex flex-wrap gap-2">
            {quickTools.map((tool) => (
              <a
                key={tool.label}
                href={tool.href}
                className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10"
              >
                {tool.label}
              </a>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-none border border-white/10 bg-black/10 p-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/65">
              Traducteur
            </div>
            <textarea
              value={translateText}
              onChange={(e) => setTranslateText(e.target.value)}
              className="min-h-[90px] w-full resize-none bg-transparent p-2 text-sm text-white outline-none placeholder:text-white/45"
              placeholder="Texte à traduire"
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTranslate}
                className="border border-white/50 bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/15"
              >
                Traduire
              </button>
              <span className="text-xs text-white/60">FR → EN</span>
            </div>
            <div className="mt-3 rounded-none border border-white/10 bg-white/5 p-2 text-sm text-white/85">
              {translation}
            </div>
          </div>

          <div className="rounded-none border border-white/10 bg-black/10 p-3">
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/65">
              Calculatrice
            </div>
            <input
              value={calcValue}
              onChange={(e) => setCalcValue(e.target.value)}
              className="w-full bg-transparent p-2 text-base text-white outline-none placeholder:text-white/45"
              placeholder="12*7+5"
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCalc}
                className="flex items-center gap-2 border border-white/50 bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/15"
              >
                <Calculator className="size-4" />
                Calculer
              </button>
              <span className="text-xs text-white/60">Online</span>
            </div>
            <div className="mt-3 rounded-none border border-white/10 bg-white/5 p-2 text-lg font-semibold text-white">
              {calcResult}
            </div>
          </div>
        </div>
      </div>

      <div
        className="metro-tools-panel tile-enter p-4 md:p-5"
        style={{ animationDelay: '100ms' }}
      >
        <div className="mb-4 text-[11px] uppercase tracking-[0.18em] text-white/65">
          Minuteur
        </div>
        <div className="space-y-4">
          <div className="font-light-metro text-[42px] leading-none tabular-nums">
            {timerLabel}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTimerActive((v) => !v)}
              className="flex-1 border border-white/50 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
            >
              {timerActive ? 'Pause' : 'Démarrer'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerActive(false)
                setTimerSeconds(90)
              }}
              className="border border-white/50 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Reset
            </button>
          </div>
          <input
            type="number"
            min={1}
            max={3600}
            value={timerSeconds}
            onChange={(e) => setTimerSeconds(Math.max(1, Number(e.target.value) || 1))}
            className="w-full bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/45"
          />
        </div>
      </div>
    </div>
  )
}

function SkeletonFace() {
  return <div className="h-full w-full animate-pulse bg-white/5" />
}

function WeatherTile({ data }: { data: TilesData | null }) {
  const w = data?.weather
  if (!w) {
    return (
      <Tile size="wide" color={TONE.accent} delay={0} label="Météo">
        {data ? (
          <div className="p-4 text-sm text-white/80">
            Météo indisponible pour le moment.
          </div>
        ) : (
          <SkeletonFace />
        )}
      </Tile>
    )
  }
  const now = describeWeather(w.code)
  return (
    <Tile
      size="wide"
      color={TONE.accent}
      delay={0}
      href={searchHref(`météo ${w.city}`)}
      label={`Météo · ${w.city}`}
    >
      <LiveFaces
        interval={5500}
        faces={[
          <div key="now" className="flex h-full items-center gap-4 p-4 pb-8">
            <now.Icon className="size-14 shrink-0" strokeWidth={1.2} />
            <div>
              <div className="font-light-metro text-[54px] leading-none">
                {w.temperature}°
              </div>
              <div className="mt-1 text-sm text-white/85">
                {now.label} · {w.min}° / {w.max}°
              </div>
            </div>
          </div>,
          <div key="fc" className="grid h-full grid-cols-3 gap-2 p-4 pb-8">
            {w.daily.slice(0, 3).map((d) => {
              const info = describeWeather(d.code)
              return (
                <div
                  key={d.date}
                  className="flex flex-col items-start justify-center"
                >
                  <div className="text-xs text-white/80 capitalize">
                    {new Date(d.date + 'T12:00').toLocaleDateString('fr-FR', {
                      weekday: 'short',
                    })}
                  </div>
                  <info.Icon className="my-1 size-7" strokeWidth={1.4} />
                  <div className="text-sm">
                    {d.max}° <span className="text-white/60">{d.min}°</span>
                  </div>
                </div>
              )
            })}
          </div>,
        ]}
      />
    </Tile>
  )
}

function WallpaperTile({ data }: { data: TilesData | null }) {
  const wp = data?.wallpaper
  const q = wp?.copyright.split('(')[0].trim() || wp?.title || 'image du jour'
  return (
    <Tile
      size="large"
      color={TONE.deeper}
      delay={120}
      href={wp ? searchHref(q) : undefined}
      label="Image du jour"
    >
      {wp ? (
        <>
          <img
            src={wp.url.replace('_1920x1080', '_800x480')}
            alt={wp.title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-16 pb-8">
            <div className="text-lg leading-tight font-semibold">{wp.title}</div>
            <div className="mt-1 line-clamp-2 text-xs text-white/75">
              {wp.copyright}
            </div>
          </div>
        </>
      ) : (
        <SkeletonFace />
      )}
    </Tile>
  )
}

function NewsTiles({ data }: { data: TilesData | null }) {
  const news = data?.headlines ?? []
  if (!data) {
    return (
      <>
        <Tile size="wide" color={TONE.deep} delay={60}>
          <SkeletonFace />
        </Tile>
        <Tile size="medium" color={TONE.glass} delay={100}>
          <SkeletonFace />
        </Tile>
        <Tile size="medium" color={TONE.glass} delay={140}>
          <SkeletonFace />
        </Tile>
        <Tile size="wide" color={TONE.accent} delay={180}>
          <SkeletonFace />
        </Tile>
      </>
    )
  }
  if (news.length === 0) {
    return (
      <Tile
        size="wide"
        color={TONE.deep}
        href={searchHref('actualité', 'news')}
        label="Actualités"
      >
        <div className="p-4 text-sm">Ouvrir les actualités</div>
      </Tile>
    )
  }
  const lead = news.slice(0, 3)
  const rest = news.slice(3, 7)
  const trends = news
    .map((n) => n.title.split(/[:«»"—–,!?]/)[0].trim())
    .filter((t) => t.length > 6 && t.length < 48)
    .slice(0, 5)

  return (
    <>
      <Tile
        size="wide"
        color={TONE.deep}
        delay={60}
        href={searchHref('actualité', 'news')}
        label="Actualités"
        badge={<Newspaper className="size-4" />}
      >
        <LiveFaces
          interval={4800}
          faces={lead.map((n) => (
            <div key={n.url} className="flex h-full flex-col p-4 pb-8">
              <div className="text-xs tracking-wide text-white/70 uppercase">
                {n.source} · {relativeTime(n.published)}
              </div>
              <div className="mt-1.5 line-clamp-3 text-[17px] leading-snug font-semibold">
                {n.title}
              </div>
            </div>
          ))}
        />
      </Tile>
      {rest.map((n, i) => (
        <Tile
          key={n.url}
          size="medium"
          color={
            i % 3 === 0 ? TONE.glass : i % 3 === 1 ? TONE.deeper : TONE.accent
          }
          delay={100 + i * 40}
          href={n.url}
          label={n.source}
        >
          <div className="line-clamp-5 p-3 text-[13px] leading-snug font-semibold">
            {n.title}
          </div>
        </Tile>
      ))}
      {trends.length > 0 && (
        <Tile
          size="wide"
          color={TONE.accent}
          delay={260}
          href={searchHref(trends[0])}
          label="Tendances"
          badge={<TrendingUp className="size-4" />}
        >
          <LiveFaces
            interval={4200}
            faces={trends.map((t, i) => (
              <div key={t} className="flex h-full items-center gap-4 p-4 pb-8">
                <span className="font-light-metro text-[48px] leading-none text-white/60">
                  {i + 1}
                </span>
                <span className="line-clamp-2 text-lg leading-tight font-semibold">
                  {t}
                </span>
              </div>
            ))}
          />
        </Tile>
      )}
    </>
  )
}

export default function Placeholder() { return null }
