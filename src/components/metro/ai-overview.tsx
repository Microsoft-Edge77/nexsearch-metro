import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, RotateCcw, Sparkles } from 'lucide-react'
import { MetroProgress } from './tiles'
import { favicon } from '@/lib/format'
import { cn } from '@/lib/utils'

type Source = { n: number; title: string; url: string; domain: string }

/** Streams the AI overview for a query and renders it as an accent-colored panel with cited sources. */
export function AiOverview({ query }: { query: string }) {
  const [text, setText] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [status, setStatus] = useState<
    'loading' | 'streaming' | 'done' | 'error'
  >('loading')
  const [expanded, setExpanded] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setText('')
    setSources([])
    setStatus('loading')
    setExpanded(false)
    ;(async () => {
      try {
        const res = await fetch('/api/overview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: query }),
          signal: ctrl.signal,
        })
        if (!res.ok || !res.body) throw new Error('overview failed')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let headerParsed = false
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          if (!headerParsed) {
            const nl = buffer.indexOf('\n')
            if (nl === -1) continue
            setSources(JSON.parse(buffer.slice(0, nl)) as Source[])
            buffer = buffer.slice(nl + 1)
            headerParsed = true
            setStatus('streaming')
          }
          setText(buffer)
        }
        setStatus('done')
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setStatus('error')
      }
    })()
    return () => ctrl.abort()
  }, [query, attempt])

  const long = text.length > 520

  return (
    <section
      aria-label="Aperçu IA"
      aria-busy={status === 'loading' || status === 'streaming'}
      className="tile-enter relative overflow-hidden text-white"
      style={{ background: 'var(--metro-accent)' }}
    >
      <div className="flex items-center gap-2 px-5 pt-4">
        <Sparkles className="size-5" />
        <h2 className="text-[15px] font-semibold">Aperçu IA</h2>
        {status === 'done' && (
          <button
            type="button"
            onClick={() => setAttempt((a) => a + 1)}
            className="ml-auto grid size-8 place-items-center rounded-full border-2 border-white/60 transition-colors hover:bg-white/15"
            aria-label="Régénérer l'aperçu"
            title="Régénérer"
          >
            <RotateCcw className="size-3.5" />
          </button>
        )}
      </div>

      {status === 'loading' && (
        <div className="px-5 pt-5 pb-6">
          <MetroProgress onAccent />
          <p className="mt-3 text-sm text-white/80">
            Lecture des sources et rédaction de la synthèse…
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="px-5 pt-3 pb-5 text-sm">
          L'aperçu IA n'a pas pu être généré.{' '}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => setAttempt((a) => a + 1)}
          >
            Réessayer
          </button>
        </div>
      )}

      {(status === 'streaming' || status === 'done') && (
        <>
          <div
            ref={bodyRef}
            className={cn(
              'relative px-5 pt-3 pb-1 text-[15px] leading-relaxed transition-[max-height] duration-500',
              long && !expanded
                ? 'max-h-[300px] overflow-hidden lg:max-h-none'
                : 'max-h-none',
            )}
          >
            <RichText text={text} sources={sources} />
            {status === 'streaming' && (
              <span className="ai-caret" aria-hidden />
            )}
            {long && !expanded && (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20 lg:hidden"
                style={{
                  background:
                    'linear-gradient(transparent, var(--metro-accent))',
                }}
              />
            )}
          </div>
          {long && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mx-5 mb-2 inline-flex items-center gap-1 text-sm font-semibold lg:hidden"
            >
              Afficher plus <ChevronDown className="size-4" />
            </button>
          )}

          {sources.length > 0 && (
            <div className="mt-3 bg-black/20 px-5 py-4">
              <h3 className="mb-2.5 text-xs font-semibold tracking-wider text-white/75 uppercase">
                Sources
              </h3>
              <ol className="grid gap-1.5">
                {sources.slice(0, 6).map((s) => (
                  <li key={s.n}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-2.5 text-sm"
                    >
                      <span className="grid size-5 shrink-0 place-items-center bg-white text-[11px] font-bold text-black">
                        {s.n}
                      </span>
                      <img
                        src={favicon(s.domain, 32)}
                        alt=""
                        className="size-4 shrink-0"
                        loading="lazy"
                      />
                      <span className="truncate group-hover:underline">
                        {s.title}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="px-5 py-2.5 text-[11px] text-white/65">
            Généré par IA à partir des résultats ci-contre. Vérifiez les
            informations importantes.
          </p>
        </>
      )}
    </section>
  )
}

/** Minimal markdown: paragraphs, "- " bullet lists, **bold**, and [n] citations. */
function RichText({ text, sources }: { text: string; sources: Source[] }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className="space-y-3">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim())
        if (lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={bi} className="space-y-1.5">
              {lines.map((l, li) => (
                <li key={li} className="flex gap-2.5">
                  <span className="mt-[0.6em] size-1.5 shrink-0 bg-white" />
                  <span>{inline(l.replace(/^\s*[-*•]\s+/, ''), sources)}</span>
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l.replace(/^#+\s*/, ''), sources)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function inline(line: string, sources: Source[]): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*([^*]+)\*\*|\[(\d+)\]|_([^_]+)_/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index))
    if (m[1]) out.push(<strong key={k++}>{m[1]}</strong>)
    else if (m[3]) out.push(<em key={k++}>{m[3]}</em>)
    else {
      const src = sources.find((s) => s.n === Number(m![2]))
      out.push(
        src ? (
          <a
            key={k++}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            title={src.title}
            className="mx-[1px] inline-grid h-[18px] min-w-[18px] place-items-center bg-white/90 px-1 align-[2px] text-[11px] font-bold text-black no-underline hover:bg-white"
          >
            {src.n}
          </a>
        ) : null,
      )
    }
    last = re.lastIndex
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}
