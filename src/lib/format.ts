import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from 'lucide-react'

// WMO weather codes → French label + icon.
export function describeWeather(code: number): {
  label: string
  Icon: LucideIcon
} {
  if (code === 0) return { label: 'Ensoleillé', Icon: Sun }
  if (code <= 2) return { label: 'Éclaircies', Icon: CloudSun }
  if (code === 3) return { label: 'Couvert', Icon: Cloud }
  if (code <= 48) return { label: 'Brouillard', Icon: CloudFog }
  if (code <= 57) return { label: 'Bruine', Icon: CloudDrizzle }
  if (code <= 67 || (code >= 80 && code <= 82))
    return { label: 'Pluie', Icon: CloudRain }
  if (code <= 77 || code === 85 || code === 86)
    return { label: 'Neige', Icon: CloudSnow }
  return { label: 'Orages', Icon: CloudLightning }
}

export function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  if (diff < 3600)
    return rtf.format(-Math.max(1, Math.round(diff / 60)), 'minute')
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour')
  return rtf.format(-Math.round(diff / 86400), 'day')
}

export function favicon(domain: string, size = 64) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`
}
