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

export type Settings = {
  accent: string
  aiOverview: boolean
  history: string[]
}

const KEY = 'nexsearch:settings'
const DEFAULTS: Settings = {
  accent: ACCENTS[0].value,
  aiOverview: true,
  history: [],
}

let current: Settings = DEFAULTS
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw)
      current = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    // ignore corrupted storage
  }
}

function apply() {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--metro-accent', current.accent)
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
export const accentBootScript = `try{var s=JSON.parse(localStorage.getItem('${KEY}')||'{}');if(s.accent)document.documentElement.style.setProperty('--metro-accent',s.accent)}catch(e){}`
