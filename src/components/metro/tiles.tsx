import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export type TileSize = 'small' | 'medium' | 'wide' | 'large'

const SPAN: Record<TileSize, string> = {
  small: 'col-span-1 row-span-1',
  medium: 'col-span-2 row-span-2',
  wide: 'col-span-4 row-span-2',
  large: 'col-span-4 row-span-4',
}

type TileProps = {
  size?: TileSize
  color?: string
  href?: string
  onClick?: () => void
  label?: ReactNode
  badge?: ReactNode
  className?: string
  style?: CSSProperties
  delay?: number
  ariaLabel?: string
  children?: ReactNode
}

/**
 * A Metro tile. Pressing tilts it toward the touch point, like Windows 8/Phone.
 * Internal hrefs (starting with "/") navigate through the router.
 */
export function Tile({
  size = 'medium',
  color,
  href,
  onClick,
  label,
  badge,
  className,
  style,
  delay = 0,
  ariaLabel,
  children,
}: TileProps) {
  const router = useRouter()
  const ref = useRef<HTMLElement>(null)

  const press = (e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    const strength = size === 'small' ? 14 : size === 'medium' ? 10 : 6
    el.style.setProperty('--rx', `${-y * strength}deg`)
    el.style.setProperty('--ry', `${x * strength}deg`)
    el.dataset.pressed = 'true'
  }
  const release = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.dataset.pressed = 'false'
  }

  const common = {
    className: cn(
      'tile tile-enter cursor-pointer text-left',
      SPAN[size],
      className,
    ),
    style: {
      ...(color ? { '--tile-bg': color } : {}),
      animationDelay: `${delay}ms`,
      ...style,
    } as CSSProperties,
    onPointerDown: press,
    onPointerUp: release,
    onPointerLeave: release,
    onPointerCancel: release,
    'aria-label': ariaLabel,
  }
  const content = (
    <>
      {children}
      {label && <span className="tile-label">{label}</span>}
      {badge !== undefined && <span className="tile-badge">{badge}</span>}
    </>
  )

  if (href) {
    const internal = href.startsWith('/')
    return (
      <a
        {...common}
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        target={internal ? undefined : '_blank'}
        rel={internal ? undefined : 'noopener noreferrer'}
        onClick={(e) => {
          onClick?.()
          if (internal && !e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            void router.navigate({ href })
          }
        }}
      >
        {content}
      </a>
    )
  }
  return (
    <button
      {...common}
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={onClick}
    >
      {content}
    </button>
  )
}

/** Rotates through faces with a vertical slide, at a slightly random cadence per tile. */
export function LiveFaces({
  faces,
  interval = 5000,
}: {
  faces: ReactNode[]
  interval?: number
}) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (faces.length < 2) return
    const jitter = Math.random() * 2500
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      setIndex((i) => (i + 1) % faces.length)
      timer = setTimeout(tick, interval + Math.random() * 1500)
    }
    timer = setTimeout(tick, interval + jitter)
    return () => clearTimeout(timer)
  }, [faces.length, interval])

  return (
    <div
      className="live-faces"
      style={{ transform: `translateY(-${index * 100}%)` }}
    >
      {faces.map((face, i) => (
        <div
          key={i}
          className="live-face"
          style={{ top: `${i * 100}%` }}
          aria-hidden={i !== index}
        >
          {face}
        </div>
      ))}
    </div>
  )
}

/** A titled group of tiles; 6 cells wide on desktop, full-width 4 cells on phones. */
export function TileGroup({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('shrink-0', className)}>
      <h2 className="font-light-metro mb-3 text-xl text-white/90 md:text-[22px]">
        {title}
      </h2>
      <div className="tile-grid grid grid-flow-dense">{children}</div>
    </section>
  )
}

export function MetroProgress({
  onAccent,
  className,
}: {
  onAccent?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const set = () => el.style.setProperty('--w', `${el.offsetWidth}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={cn('metro-progress', onAccent && 'on-accent', className)}
      role="progressbar"
      aria-label="Chargement"
    >
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  )
}

/** Windows 8 style rectangular toggle switch. */
export function MetroToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-sm"
    >
      <span className="relative inline-block h-5 w-12 border-2 border-white/80 p-[2px]">
        <span
          className="block h-full transition-all duration-200"
          style={{
            width: checked ? '100%' : '0%',
            background: 'var(--metro-accent)',
          }}
        />
        <span
          className="absolute top-[-4px] h-6 w-3 bg-white transition-all duration-200"
          style={{ left: checked ? 'calc(100% - 10px)' : '-2px' }}
        />
      </span>
      <span>{checked ? 'Activé' : 'Désactivé'}</span>
    </button>
  )
}
