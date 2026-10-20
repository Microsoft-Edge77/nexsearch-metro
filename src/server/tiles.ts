// Live data for the start-screen tiles: weather, wallpaper of the day, headlines.

import { searchNews, type NewsResult } from './search'

export type Weather = {
  city: string
  temperature: number
  code: number
  min: number
  max: number
  daily: { date: string; code: number; min: number; max: number }[]
}

export type Wallpaper = { url: string; title: string; copyright: string }

export type TilesData = {
  weather: Weather | null
  wallpaper: Wallpaper | null
  headlines: NewsResult[]
}

type Geo = { city: string; latitude: number; longitude: number }

const PARIS: Geo = { city: 'Paris', latitude: 48.8566, longitude: 2.3522 }

// Netlify adds the visitor's approximate location as base64 JSON in x-nf-geo.
export function geoFromRequest(request: Request): Geo {
  const raw = request.headers.get('x-nf-geo')
  if (!raw) return PARIS
  try {
    const g = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as {
      city?: string
      latitude?: number
      longitude?: number
    }
    if (typeof g.latitude === 'number' && typeof g.longitude === 'number') {
      return {
        city: g.city || 'Votre position',
        latitude: g.latitude,
        longitude: g.longitude,
      }
    }
  } catch {
    // ignore malformed header
  }
  return PARIS
}

export async function getWeather(geo: Geo): Promise<Weather | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=4&timezone=auto`
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) return null
  const d = (await res.json()) as {
    current: { temperature_2m: number; weather_code: number }
    daily: {
      time: string[]
      weather_code: number[]
      temperature_2m_max: number[]
      temperature_2m_min: number[]
    }
  }
  return {
    city: geo.city,
    temperature: Math.round(d.current.temperature_2m),
    code: d.current.weather_code,
    min: Math.round(d.daily.temperature_2m_min[0]),
    max: Math.round(d.daily.temperature_2m_max[0]),
    daily: d.daily.time.slice(1).map((date, i) => ({
      date,
      code: d.daily.weather_code[i + 1],
      min: Math.round(d.daily.temperature_2m_min[i + 1]),
      max: Math.round(d.daily.temperature_2m_max[i + 1]),
    })),
  }
}

export async function getWallpaper(): Promise<Wallpaper | null> {
  const res = await fetch(
    'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=fr-FR',
    {
      signal: AbortSignal.timeout(5000),
    },
  )
  if (!res.ok) return null
  const d = (await res.json()) as {
    images?: { urlbase: string; title?: string; copyright?: string }[]
  }
  const img = d.images?.[0]
  if (!img) return null
  return {
    url: `https://www.bing.com${img.urlbase}_1920x1080.jpg`,
    title: img.title ?? '',
    copyright: img.copyright ?? '',
  }
}

export async function getTiles(request: Request): Promise<TilesData> {
  const [weather, wallpaper, headlines] = await Promise.allSettled([
    getWeather(geoFromRequest(request)),
    getWallpaper(),
    searchNews(null),
  ])
  return {
    weather: weather.status === 'fulfilled' ? weather.value : null,
    wallpaper: wallpaper.status === 'fulfilled' ? wallpaper.value : null,
    headlines:
      headlines.status === 'fulfilled' ? headlines.value.slice(0, 8) : [],
  }
}
