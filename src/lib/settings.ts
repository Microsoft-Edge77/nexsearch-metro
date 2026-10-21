// Client-side preferences persisted in localStorage: accent color, AI overview, search history.

import { useSyncExternalStore } from 'react'

export const ACCENTS = [
  { name: 'Cyan', value: '#1ba1e2' },
  { name: 'Cobalt', value: '#0050ef' },
  { name: 'Sarcelle', value: '#00aba9' },
  { name: 'Émeraude', value: '#008a00' },
  { name: 'Citron vert', value: '#7ea200' },
  { name: 'Ambre', value: '#e09200' },
  { name: 'Orange', value: '#fa6800' },
  { name: 'Rouge', value: '#e51400' },
  { name: 'Cramoisi', value: '#a20025' },
  { name: 'Magenta', value: '#d80073' },
  { name: 'Violet', value: '#aa00ff' },
  { name: 'Mauve', value: '#76608a' },
] as const

export type CustomTile = {
  id: string
  label: string
  href: string
  color?: string
}

export type Settings = {
  accent: string
  aiOverview: boolean
  history: string[]
  useBingWallpaper: boolean
  customTiles: CustomTile[]
}

const KEY = 'nexsearch:settings'
const DEFAULTS: Settings = {
  accent: ACCENTS[0].value,
  aiOverview: true,
  history: [],
  useBingWallpaper: false,
  customTiles: [],
}

let current: Settings = DEFAULTS
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) current = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    // ignore corrupted storage
  }
}

function apply() {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--metro-accent', current.accent)
    document.documentElement.style.setProperty(
      '--metro-wallpaper-enabled',
      current.useBingWallpaper ? '1' : '0',
    )
  }
}

export function updateSettings(patch: Partial<Settings>) {
  load()
  current = { ...current, ...patch }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // storage may be unavailable (private mode)
  }
  apply()
  listeners.forEach((l) => l())
}

export function addToHistory(q: string) {
  load()
  const clean = q.trim()
  if (!clean) return
  const history = [
    clean,
    ...current.history.filter((h) => h.toLowerCase() !== clean.toLowerCase()),
  ].slice(0, 12)
  updateSettings({ history })
}

export function addCustomTile(tile: Omit<CustomTile, 'id'>) {
  load()
  const item: CustomTile = {
    ...tile,
    id: `tile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }
  updateSettings({ customTiles: [...current.customTiles, item] })
}

export function moveCustomTile(id: string, delta: -1 | 1) {
  load()
  const index = current.customTiles.findIndex((tile) => tile.id === id)
  if (index < 0) return
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= current.customTiles.length) return
  const next = [...current.customTiles]
  ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
  updateSettings({ customTiles: next })
}

export function removeCustomTile(id: string) {
  load()
  updateSettings({
    customTiles: current.customTiles.filter((tile) => tile.id !== id),
  })
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => {
      load()
      return current
    },
    () => DEFAULTS,
  )
}

// Inlined in <head> so the saved accent is applied before first paint.
export const accentBootScript = `try{var s=JSON.parse(localStorage.getItem('${KEY}')||'{}');if(s.accent)document.documentElement.style.setProperty('--metro-accent',s.accent);if(typeof s.useBingWallpaper==='boolean')document.documentElement.style.setProperty('--metro-wallpaper-enabled',s.useBingWallpaper?'1':'0')}catch(e){}`
