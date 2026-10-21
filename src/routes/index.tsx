import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ArrowLeft,
  Calculator,
  ExternalLink,
  Languages,
  Map,
  SearchX,
  ShoppingBag,
  TimerReset,
  Video,
  X,
} from 'lucide-react'
import { z } from 'zod'
import { AiOverview } from '@/components/metro/ai-overview'
import { Logo, SettingsCharm } from '@/components/metro/chrome'
import { SearchBox } from '@/components/metro/search-box'
import { MetroProgress, Tile } from '@/components/metro/tiles'
import { favicon, relativeTime } from '@/lib/format'
import { useSettings } from '@/lib/settings'
import type {
  ImageResult,
  NewsResult,
  ShoppingResult,
  VideoResult,
  WebResult,
  WikiSummary,
} from '@/server/search'
import { detectSpecialSearch } from '@/server/search'

const searchSchema = z.object({
  q: z.string().catch(''),
  type: z.enum(['web', 'images', 'news', 'videos', 'shopping', 'maps']).catch('web'),
})

type SearchType = z.infer<typeof searchSchema>['type']

export const Route = createFileRoute('/search')({
  validateSearch: searchSchema,
  head: ({ match }) => ({
    meta: [{ title: match.search.q ? `${match.search.q} — NexSearch` : 'NexSearch' }],
  }),
  component: SearchPage,
})

const PIVOTS: { type: SearchType; label: string }[] = [
  { type: 'web', label: 'Web' },
  { type: 'images', label: 'Images' },
  { type: 'videos', label: 'Vidéos' },
  { type: 'news', label: 'Actualités' },
  { type: 'shopping', label: 'Shopping' },
  { type: 'maps', label: 'Carte' },
]

function SearchPage() {
  const { q, type } = Route.useSearch()
  const router = useRouter()

  return (
    <div className="min-h-svh">
      <div className="metro-backdrop" aria-hidden />
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#111214]/92 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3 md:gap-5 md:px-10">
          <button
            type="button"
            onClick={() =>
              window.history.length > 1
                ? router.history.back()
                : router.navigate({ to: '/' })
            }
            aria-label="Retour"
            className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-white/70 transition-colors hover:bg-white/10"
          >
            <ArrowLeft className="size-5" />
          </button>
          <Link to="/" className="hidden shrink-0 md:block" aria-label="Accueil NexSearch">
            <Logo size={24} />
          </Link>
          <SearchBox
            key={q}
            initial={q}
            type={type}
            className="min-w-0 flex-1 md:max-w-2xl"
          />
          <div className="ml-auto shrink-0">
            <SettingsCharm compact />
          </div>
        </div>
        <nav
          className="flex gap-6 overflow-x-auto px-4 pb-2 md:gap-9 md:px-10"
          aria-label="Type de résultats"
        >
          {PIVOTS.map((p) => (
            <Link
              key={p.type}
              to="/search"
              search={{ q, type: p.type }}
              data-active={p.type === type}
              className="pivot-item text-[26px] leading-tight md:text-[34px]"
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </header>

      <main key={`${type}:${q}`} className="page-enter px-4 pt-6 pb-16 md:px-10">
        {!q ? (
          <EmptyState title="Que cherchez-vous ?" text="Saisissez une requête dans la zone de recherche ci-dessus." />
        ) : type === 'web' ? (
          <WebTab q={q} />
        ) : type === 'images' ? (
          <ImagesTab q={q} />
        ) : type === 'news' ? (
          <NewsTab q={q} />
        ) : type === 'videos' ? (
          <VideosTab q={q} />
        ) : type === 'shopping' ? (
          <ShoppingTab q={q} />
        ) : (
          <MapsTab q={q} />
        )}
      </main>
    </div>
  )
}

function useJson<T>(url: string | null) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: !!url,
  })
  useEffect(() => {
    if (!url) return
    const ctrl = new AbortController()
    setState({ data: null, error: null, loading: true })
    fetch(url, { signal: ctrl.signal })
      .then(async (r) => {
        const body = (await r.json()) as T & { error?: string }
        if (!r.ok) throw new Error(body.error ?? 'La recherche a échoué.')
        setState({ data: body, error: null, loading: false })
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError')
          setState({ data: null, error: err.message, loading: false })
      })
    return () => ctrl.abort()
  }, [url])
  return state
}

function EmptyState({ title, text, icon = true }: { title: string; text: string; icon?: boolean }) {
  return (
    <div className="max-w-xl py-14">
      {icon && <SearchX className="mb-5 size-12 text-white/50" strokeWidth={1.3} />}
      <h2 className="font-light-metro text-3xl md:text-4xl">{title}</h2>
      <p className="mt-3 text-white/60">{text}</p>
    </div>
  )
}

type WebPayload = {
  results: WebResult[]
  related: string[]
  wiki: WikiSummary | null
  source: string
}

function WebTab({ q }: { q: string }) {
  const special = detectSpecialSearch(q)
  if (special) {
    return <SpecialToolPanel type={special.type} q={q} />
  }

  const { aiOverview } = useSettings()
  const first = useJson<WebPayload>(`/api/search?type=web&q=${encodeURIComponent(q)}`)
  const [more, setMore] = useState<WebResult[]>([])
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exhausted, setExhausted] = useState(false)

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const r = await fetch(
        `/api/search?type=web&page=${page + 1}&q=${encodeURIComponent(q)}`,
      )
      const d = (await r.json()) as WebPayload
      const known = new Set(
        [...(first.data?.results ?? []), ...more].map((x) => x.url),
      )
      const fresh = (d.results ?? []).filter((x) => !known.has(x.url))
      if (fresh.length === 0) setExhausted(true)
      setMore((m) => [...m, ...fresh])
      setPage((p) => p + 1)
    } catch {
      setExhausted(true)
    } finally {
      setLoadingMore(false)
    }
  }

  const results = [...(first.data?.results ?? []), ...more]
  const wiki = first.data?.wiki

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,680px)_minmax(320px,420px)] lg:gap-14 xl:gap-20">
      <aside className="order-first space-y-4 lg:order-last lg:sticky lg:top-[150px] lg:max-h-[calc(100svh-170px)] lg:self-start lg:overflow-y-auto">
        {aiOverview && <AiOverview query={q} />}
        {wiki && <WikiTile wiki={wiki} />}
      </aside>

      <section aria-label="Résultats Web" className="min-w-0">
        {first.loading && <ResultsSkeleton />}
        {first.error && <EmptyState title="Oups." text={first.error} />}
        {first.data && results.length === 0 && (
          <EmptyState title="Aucun résultat" text={`Aucune page ne correspond à « ${q} ». Essayez d'autres mots-clés.`} />
        )}
        {results.length > 0 && (
          <>
            <ol className="space-y-5">
              {results.map((r, i) =>
                i % 4 === 0 ? (
                  <LiveFlipResult key={`${r.url}-${i}`} r={r} index={i} />
                ) : (
                  <WebResultItem key={`${r.url}-${i}`} r={r} index={i} />
                ),
              )}
            </ol>

            {first.data!.related.length > 0 && (
              <div className="mt-10">
                <h2 className="font-light-metro mb-3 text-xl">Recherches associées</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {first.data!.related.map((rel, i) => (
                    <Link
                      key={rel}
                      to="/search"
                      search={{ q: rel, type: 'web' }}
                      className="tile tile-enter flex min-h-[64px] items-end p-3 text-sm font-semibold"
                      style={{
                        animationDelay: `${i * 40}ms`,
                        ['--tile-bg' as string]:
                          i % 2
                            ? 'rgba(255,255,255,0.08)'
                            : 'color-mix(in oklab, var(--metro-accent) 60%, black)',
                      }}
                    >
                      {rel}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10">
              {exhausted ? (
                <p className="text-sm text-white/50">Fin des résultats.</p>
              ) : loadingMore ? (
                <MetroProgress className="max-w-sm" />
              ) : (
                page < 5 && (
                  <button
                    type="button"
                    onClick={loadMore}
                    className="border-2 border-white px-6 py-2 text-[15px] transition-colors hover:bg-white hover:text-black"
                  >
                    Plus de résultats
                  </button>
                )
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function WebResultItem({ r, index }: { r: WebResult; index: number }) {
  return (
    <li className="metro-live-result tile-enter" style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}>
      <a href={r.url} target="_blank" rel="noopener noreferrer" className="group block">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center bg-white/90 ring-1 ring-white/30">
            <img src={favicon(r.domain)} alt="" className="size-4" loading="lazy" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] text-white/85">{r.domain}</span>
            <span className="block truncate text-xs text-white/45">{r.displayUrl}</span>
          </span>
        </div>
        <h3 className="result-title text-lg leading-snug group-hover:underline md:text-xl">
          {r.title}
        </h3>
      </a>
      {r.snippet && <p className="mt-2 text-[14.5px] leading-relaxed text-white/72">{r.snippet}</p>}
    </li>
  )
}

function LiveFlipResult({ r, index }: { r: WebResult; index: number }) {
  const [flipped, setFlipped] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setFlipped((v) => !v), 2200 + index * 180)
    return () => window.clearTimeout(id)
  }, [index])

  const preview = `https://images.weserv.nl/?url=${encodeURIComponent(r.url)}&w=800&h=480&il`

  return (
    <li className="live-flip-wrap tile-enter">
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        className="live-flip-link"
        style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
      >
        <div className={`live-flip-card ${flipped ? 'is-flipped' : ''}`}>
          <div className="live-flip-face live-flip-front">
            <div className="mb-2 flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-white/75">
              <span className="grid size-6 place-items-center bg-white/90 ring-1 ring-white/30">
                <img src={favicon(r.domain)} alt="" className="size-3.5" loading="lazy" />
              </span>
              {r.domain}
            </div>
            <h3 className="line-clamp-3 text-[20px] leading-snug font-semibold text-white">
              {r.title}
            </h3>
          </div>
          <div className="live-flip-face live-flip-back">
            <img src={preview} alt={r.title} className="absolute inset-0 h-full w-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-end p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/75">{r.domain}</div>
              <div className="mt-2 line-clamp-3 text-lg font-semibold text-white">{r.title}</div>
            </div>
          </div>
        </div>
      </a>
    </li>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-8" aria-label="Chargement des résultats">
      <MetroProgress className="max-w-md" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-2.5" style={{ animationDelay: `${i * 90}ms` }}>
          <div className="flex items-center gap-2.5">
            <div className="size-7 bg-white/10" />
            <div className="h-3 w-40 bg-white/10" />
          </div>
          <div className="h-5 w-4/5 bg-white/15" />
          <div className="h-3.5 w-full bg-white/8" />
          <div className="h-3.5 w-2/3 bg-white/8" />
        </div>
      ))}
    </div>
  )
}

function WikiTile({ wiki }: { wiki: WikiSummary }) {
  return (
    <a href={wiki.url} target="_blank" rel="noopener noreferrer" className="tile block" style={{ ['--tile-bg' as string]: '#1f2023' }}>
      {wiki.thumbnail && (
        <div className="relative h-44 overflow-hidden bg-white">
          <img src={wiki.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-5">
        <h2 className="font-light-metro text-[28px] leading-tight">{wiki.title}</h2>
        {wiki.description && <p className="mt-0.5 text-sm text-white/55">{wiki.description}</p>}
        <p className="mt-3 line-clamp-6 text-sm leading-relaxed text-white/80">{wiki.extract}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'color-mix(in oklab, var(--metro-accent) 55%, white)' }}>
          Wikipédia <ExternalLink className="size-3.5" />
        </span>
      </div>
    </a>
  )
}

function SpecialToolPanel({ type, q }: { type: 'calculator' | 'translator' | 'timer'; q: string }) {
  if (type === 'calculator') {
    const [expr, setExpr] = useState(q)
    const [result, setResult] = useState('')
    const evaluate = () => {
      try {
        const clean = expr
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/,/g, '.')
          .replace(/[^0-9+\-*/().%\s]/g, '')
        const value = Function(`"use strict"; return (${clean})`)()
        setResult(Number.isFinite(value) ? String(value) : 'Erreur')
      } catch {
        setResult('Erreur')
      }
    }

    return (
      <div className="mx-auto max-w-2xl rounded-none border border-white/10 bg-black/20 p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/65">
          <Calculator className="size-4" /> Calculatrice scientifique
        </div>
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          className="w-full bg-white/5 px-4 py-3 text-lg text-white outline-none"
          placeholder="12*7+5"
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={evaluate}
            className="border border-white/50 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
          >
            Calculer
          </button>
        </div>
        <div className="mt-5 rounded-none border border-white/10 bg-white/5 p-4 text-2xl font-semibold text-white">
          {result || 'Résultat'}
        </div>
      </div>
    )
  }

  if (type === 'translator') {
    const text = q.replace(/^(traduit|traduire|translate|translator|anglais|anglais?)/i, '').trim() || 'Bonjour NexSearch'
    const url = `https://translate.google.com/?sl=fr&tl=en&text=${encodeURIComponent(text)}&op=translate`
    return (
      <div className="mx-auto w-full max-w-5xl overflow-hidden border border-white/10 bg-black/20 shadow-2xl">
        <div className="mb-4 flex items-center gap-2 px-5 pt-5 text-xs uppercase tracking-[0.18em] text-white/65">
          <Languages className="size-4" /> Traducteur intégré
        </div>
        <iframe title="Traducteur" src={url} className="h-[560px] w-full border-0" loading="lazy" />
      </div>
    )
  }

  const durationRe = q.match(/(\d+)\s*(minute|min|second|seconde|heure|h)/i)
  const parsedSeconds = durationRe
    ? (() => {
        const val = Number(durationRe[1])
        const unit = durationRe[2].toLowerCase()
        if (unit.startsWith('min')) return val * 60
        if (unit.startsWith('h')) return val * 60 * 60
        return val
      })()
    : 90

  const [seconds, setSeconds] = useState(parsedSeconds)
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!active) return
    if (seconds <= 0) {
      setActive(false)
      return
    }
    const id = window.setTimeout(() => setSeconds((v) => v - 1), 1000)
    return () => window.clearTimeout(id)
  }, [active, seconds])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="mx-auto max-w-md rounded-none border border-white/10 bg-black/20 p-5 text-center shadow-2xl">
      <div className="mb-4 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.18em] text-white/65">
        <TimerReset className="size-4" /> Minuteur Metro
      </div>
      <div className="font-light-metro text-[52px] leading-none tabular-nums">{mm}:{ss}</div>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          className="flex-1 border border-white/50 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
        >
          {active ? 'Pause' : 'Démarrer'}
        </button>
        <button
          type="button"
          onClick={() => {
            setActive(false)
            setSeconds(parsedSeconds)
          }}
          className="border border-white/50 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
        >
          Reset
        </button>
      </div>
    </div>
  )
}

function ImagesTab({ q }: { q: string }) {
  const { data, error, loading } = useJson<{ images: ImageResult[] }>(`/api/search?type=images&q=${encodeURIComponent(q)}`)
  const [open, setOpen] = useState<ImageResult | null>(null)

  if (loading) return <ResultsSkeleton />
  if (error) return <EmptyState title="Oups." text={error} />
  if (!data || data.images.length === 0) return <EmptyState title="Aucune image" text={`Aucune image trouvée pour « ${q} ».`} />

  return (
    <>
      <div className="@container">
        <div className="image-wall">
          {data.images.map((img, i) => {
            const big = i % 7 === 0
            return (
              <Tile
                key={img.full + i}
                size="medium"
                color="#1f2023"
                delay={Math.min(i, 18) * 30}
                onClick={() => setOpen(img)}
                ariaLabel={img.title || 'Image'}
                className={big ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'}
              >
                <img src={img.thumb} alt={img.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent p-2 pt-6 text-xs">
                  {img.domain}
                </span>
              </Tile>
            )
          })}
        </div>
      </div>

      <Dialog.Root open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90" />
          <Dialog.Content className="fixed inset-0 z-50 flex flex-col p-4 text-white outline-none md:p-10">
            {open && (
              <>
                <div className="mb-4 flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <Dialog.Title className="font-light-metro line-clamp-2 text-xl md:text-3xl">
                      {open.title || 'Image'}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-white/60">{open.domain}</Dialog.Description>
                  </div>
                  <Dialog.Close aria-label="Fermer" className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-white/70 hover:bg-white/10">
                    <X className="size-5" />
                  </Dialog.Close>
                </div>
                <div className="grid min-h-0 flex-1 place-items-center">
                  <img
                    src={open.full}
                    alt={open.title}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).src = open.thumb)}
                  />
                </div>
                <div className="mt-4 flex gap-3">
                  <a href={open.page} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold" style={{ background: 'var(--metro-accent)' }}>
                    Visiter la page <ExternalLink className="size-4" />
                  </a>
                  <a href={open.full} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border-2 border-white px-5 py-1.5 text-sm hover:bg-white hover:text-black">
                    Taille réelle
                  </a>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

function NewsTab({ q }: { q: string }) {
  const { data, error, loading } = useJson<{ news: NewsResult[] }>(`/api/search?type=news&q=${encodeURIComponent(q)}`)

  if (loading) return <ResultsSkeleton />
  if (error) return <EmptyState title="Oups." text={error} />
  if (!data || data.news.length === 0) return <EmptyState title="Aucune actualité" text={`Aucun article récent pour « ${q} ».`} />

  return (
    <div className="grid grid-flow-dense grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {data.news.map((n, i) => {
        const lead = i === 0
        const tone =
          i === 0
            ? 'var(--metro-accent)'
            : i % 5 === 2
              ? 'color-mix(in oklab, var(--metro-accent) 55%, black)'
              : 'rgba(255,255,255,0.07)'
        return (
          <Tile key={n.url} size="medium" href={n.url} color={tone} delay={Math.min(i, 16) * 35} className={lead ? 'col-span-1 row-span-1 min-h-[220px] sm:col-span-2 sm:row-span-2' : 'col-span-1 row-span-1 min-h-[150px]'}>
            <div className="flex h-full flex-col p-4">
              <div className="flex items-center gap-2 text-xs text-white/75">
                <span className="truncate font-semibold tracking-wide uppercase">{n.source}</span>
                <span className="shrink-0">· {relativeTime(n.published)}</span>
              </div>
              <h3 className={lead ? 'font-light-metro mt-3 text-[26px] leading-tight md:text-[34px]' : 'mt-2 line-clamp-4 text-[15px] leading-snug font-semibold'}>
                {n.title}
              </h3>
              <ExternalLink className="mt-auto size-4 self-end opacity-60" />
            </div>
          </Tile>
        )
      })}
    </div>
  )
}

function VideosTab({ q }: { q: string }) {
  const { data, error, loading } = useJson<{ videos: VideoResult[] }>(`/api/search?type=videos&q=${encodeURIComponent(q)}`)

  if (loading) return <ResultsSkeleton />
  if (error) return <EmptyState title="Oups." text={error} />
  if (!data || data.videos.length === 0) return <EmptyState title="Aucune vidéo" text={`Aucune vidéo trouvée pour « ${q} ».`} />

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.videos.map((video, i) => (
        <a key={`${video.url}-${i}`} href={video.url} target="_blank" rel="noopener noreferrer" className="metro-media-card tile-enter" style={{ animationDelay: `${i * 70}ms` }}>
          <div className="relative overflow-hidden">
            <img src={video.thumbnail} alt={video.title} className="h-52 w-full object-cover" />
            <span className="absolute right-2 bottom-2 rounded-sm bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold">{video.duration}</span>
          </div>
          <div className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-white/65">
              <Video className="size-3.5" /> {video.source}
            </div>
            <h3 className="line-clamp-3 text-lg font-semibold leading-snug text-white">{video.title}</h3>
            <p className="line-clamp-3 text-sm leading-relaxed text-white/70">{video.description}</p>
          </div>
        </a>
      ))}
    </div>
  )
}

function ShoppingTab({ q }: { q: string }) {
  const { data, error, loading } = useJson<{ shopping: ShoppingResult[] }>(`/api/search?type=shopping&q=${encodeURIComponent(q)}`)

  if (loading) return <ResultsSkeleton />
  if (error) return <EmptyState title="Oups." text={error} />
  if (!data || data.shopping.length === 0) return <EmptyState title="Aucun produit" text={`Aucune offre détectée pour « ${q} ».`} />

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.shopping.map((item, i) => (
        <a key={`${item.url}-${i}`} href={item.url} target="_blank" rel="noopener noreferrer" className="metro-media-card tile-enter" style={{ animationDelay: `${i * 70}ms` }}>
          <div className="relative overflow-hidden">
            <img src={item.thumbnail} alt={item.title} className="h-52 w-full object-cover" />
          </div>
          <div className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-white/65">
              <ShoppingBag className="size-3.5" /> {item.merchant}
            </div>
            <h3 className="line-clamp-3 text-lg font-semibold leading-snug text-white">{item.title}</h3>
            <div className="text-lg font-bold text-white/95">{item.price}</div>
            <p className="line-clamp-3 text-sm leading-relaxed text-white/70">{item.description}</p>
          </div>
        </a>
      ))}
    </div>
  )
}

function MapsTab({ q }: { q: string }) {
  const mapQuery = encodeURIComponent(q || 'Paris')
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=1.92%2C48.43%2C2.77%2C48.96&layer=mapnik&marker=48.8566%2C2.3522`

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,760px)_minmax(240px,320px)]">
      <div className="overflow-hidden border border-white/10 bg-black/20 shadow-2xl">
        <iframe title={`Carte pour ${q}`} src={osmUrl} className="h-[520px] w-full border-0" loading="lazy" />
      </div>
      <div className="space-y-4">
        <Tile size="wide" color="rgba(255,255,255,0.08)" delay={0} className="!col-span-1 !row-span-1" href={`https://www.openstreetmap.org/search?query=${mapQuery}`}>
          <div className="flex h-full flex-col justify-between p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/60">
              <Map className="size-4" /> Cartes
            </div>
            <div>
              <div className="font-light-metro text-[26px] leading-tight">{q || 'Paris'}</div>
              <p className="mt-2 text-sm leading-relaxed text-white/70">Affichage intégré OpenStreetMap. Explorez la zone, les rues et les attractions proches.</p>
            </div>
          </div>
        </Tile>
        <Tile size="wide" color="color-mix(in oklab, var(--metro-accent) 60%, black)" delay={80} className="!col-span-1 !row-span-1" href={`https://www.google.com/maps/search/${mapQuery}`}>
          <div className="flex h-full items-center justify-between p-4">
            <div className="text-[18px] font-semibold">Google Maps</div>
            <ExternalLink className="size-4" />
          </div>
        </Tile>
      </div>
    </div>
  )
}

export default function Placeholder() { return null }


