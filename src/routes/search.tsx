import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { History, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addToHistory, useSettings } from '@/lib/settings'

type Props = {
  initial?: string
  size?: 'hero' | 'compact'
  autoFocus?: boolean
  type?: 'web' | 'images' | 'news' | 'videos' | 'shopping' | 'maps'
  className?: string
}

export function SearchBox({
  initial = '',
  size = 'compact',
  autoFocus,
  type = 'web',
  className,
}: Props) {
  const navigate = useNavigate()
  const { history } = useSettings()
  const [value, setValue] = useState(initial)
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [active, setActive] = useState(-1)
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setValue(initial), [initial])

  useEffect(() => {
    const q = value.trim()
    if (!q || !open) {
      setSuggestions([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { suggestions: [] }))
        .then((d: { suggestions: string[] }) =>
          setSuggestions(d.suggestions ?? []),
        )
        .catch(() => {})
    }, 140)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [value, open])

  const items: { text: string; recent: boolean }[] = value.trim()
    ? suggestions.map((text) => ({ text, recent: false }))
    : history.slice(0, 6).map((text) => ({ text, recent: true }))

  const go = (q: string) => {
    const clean = q.trim()
    if (!clean) return
    addToHistory(clean)
    setOpen(false)
    inputRef.current?.blur()
    void navigate({ to: '/search', search: { q: clean, type } })
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(items.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(-1, a - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const hero = size === 'hero'
  return (
    <form
      role="search"
      className={cn('relative', className)}
      onSubmit={(e) => {
        e.preventDefault()
        go(active >= 0 && items[active] ? items[active].text : value)
      }}
    >
      <div
        className={cn(
          'metro-input flex items-stretch',
          hero ? 'h-14 md:h-16' : 'h-11',
        )}
      >
        <input
          ref={inputRef}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            setValue(e.target.value)
            setActive(-1)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKey}
          placeholder={
            type === 'maps'
              ? 'Rechercher une ville ou une adresse'
              : type === 'shopping'
                ? 'Rechercher un produit'
                : type === 'videos'
                  ? 'Rechercher une vidéo'
                  : 'Rechercher sur le Web'
          }
          aria-label="Rechercher sur le Web"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && items.length > 0}
          role="combobox"
          autoComplete="off"
          enterKeyHint="search"
          className={cn(
            'min-w-0 flex-1 bg-transparent px-4 text-[#111] outline-none placeholder:text-neutral-500',
            hero ? 'text-lg md:text-xl' : 'text-base',
          )}
        />
        <button
          type="submit"
          aria-label="Lancer la recherche"
          className={cn(
            'grid shrink-0 place-items-center text-white transition-[filter] hover:brightness-110 active:brightness-90',
            hero ? 'w-14 md:w-16' : 'w-11',
          )}
          style={{ background: 'var(--metro-accent)' }}
        >
          <Search className={hero ? 'size-6' : 'size-5'} strokeWidth={2.25} />
        </button>
      </div>

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-40 border-2 border-t-0 border-white bg-white py-1 text-[#111] shadow-2xl"
        >
          {items.map((item, i) => (
            <li key={item.text} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(item.text)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2 text-left',
                  i === active && 'text-white',
                  hero && 'md:py-2.5 md:text-lg',
                )}
                style={
                  i === active
                    ? { background: 'var(--metro-accent)' }
                    : undefined
                }
              >
                {item.recent ? (
                  <History className="size-4 shrink-0 opacity-60" />
                ) : (
                  <Search className="size-4 shrink-0 opacity-60" />
                )}
                <span className="truncate">{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}

path: "src/components/metro/search-box.tsx","sha":null,