// Server-only search providers. Each provider returns normalized results so the
// UI never needs to know where results came from.

export type WebResult = {
  title: string
  url: string
  displayUrl: string
  domain: string
  snippet: string
}

export type ImageResult = {
  title: string
  thumb: string
  full: string
  page: string
  domain: string
}

export type NewsResult = {
  title: string
  url: string
  source: string
  published: string | null
}

export type WebSearchResponse = {
  query: string
  page: number
  source: 'bing' | 'duckduckgo' | 'wikipedia'
  results: WebResult[]
  related: string[]
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

const BROWSER_HEADERS = {
  'User-Agent': UA,
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.6',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  rsquo: '’',
  lsquo: '‘',
  ndash: '–',
  mdash: '—',
}

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : match
    }
    return ENTITIES[code.toLowerCase()] ?? match
  })
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function prettyUrl(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname.split('/').filter(Boolean).slice(0, 3)
    return [u.hostname.replace(/^www\./, ''), ...path].join(' › ')
  } catch {
    return url
  }
}

async function fetchText(
  url: string,
  init: RequestInit = {},
  timeoutMs = 7000,
) {
  const res = await fetch(url, {
    ...init,
    headers: { ...BROWSER_HEADERS, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`Upstream ${res.status}`)
  return res.text()
}

// Bing wraps outbound links in /ck/a?...&u=a1<base64url>. Unwrap to the real URL.
function unwrapBingUrl(href: string): string {
  const raw = decodeEntities(href)
  if (!raw.includes('bing.com/ck/a')) return raw
  try {
    const u = new URL(raw).searchParams.get('u')
    if (u && u.startsWith('a1')) {
      const b64 = u.slice(2).replace(/-/g, '+').replace(/_/g, '/')
      const decoded = Buffer.from(b64, 'base64').toString('utf8')
      if (decoded.startsWith('http')) return decoded
    }
  } catch {
    // fall through
  }
  return raw
}

function dedupe(results: WebResult[]): WebResult[] {
  const seen = new Set<string>()
  return results.filter((r) => {
    const key = r.url.replace(/[#?].*$/, '').replace(/\/$/, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function searchBing(q: string, page: number) {
  const first = (page - 1) * 10 + 1
  const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=fr&cc=FR&mkt=fr-FR&first=${first}`
  const html = await fetchText(url)

  const results: WebResult[] = []
  const chunks = html.split('<li class="b_algo"').slice(1)
  for (const chunk of chunks) {
    const body = chunk.split(/<\/li>\s*<li class="b_/)[0]
    const h2 = body.match(
      /<h2[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/,
    )
    if (!h2) continue
    const link = unwrapBingUrl(h2[1])
    if (!link.startsWith('http')) continue
    const title = stripTags(h2[2])
    const snippetMatch =
      body.match(/<p class="b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/) ??
      body.match(
        /<div class="b_caption[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/,
      ) ??
      body.match(/<p[^>]*>([\s\S]*?)<\/p>/)
    const snippet = snippetMatch
      ? stripTags(snippetMatch[1]).replace(/^\d+\s\w+\.?\s\d{4}\s·\s/, '')
      : ''
    results.push({
      title,
      url: link,
      displayUrl: prettyUrl(link),
      domain: hostOf(link),
      snippet,
    })
  }

  const related: string[] = []
  const relBlock = html.match(/<div class="b_rs"[\s\S]*?<\/ul>/)
  if (relBlock) {
    for (const m of relBlock[0].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)) {
      const t = stripTags(m[1])
      if (t && t.length < 80) related.push(t)
    }
  }
  return { results: dedupe(results), related: related.slice(0, 8) }
}

async function searchDuckDuckGo(q: string, page: number) {
  const body = new URLSearchParams({
    q,
    kl: 'fr-fr',
    s: String((page - 1) * 30),
  })
  const html = await fetchText('https://html.duckduckgo.com/html/', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  const results: WebResult[] = []
  for (const block of html.split('class="result results_links').slice(1)) {
    const a = block.match(
      /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/,
    )
    if (!a) continue
    let link = decodeEntities(a[1])
    const uddg = link.match(/[?&]uddg=([^&]+)/)
    if (uddg) link = decodeURIComponent(uddg[1])
    if (link.startsWith('//')) link = 'https:' + link
    if (!link.startsWith('http')) continue
    const sn = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)
    results.push({
      title: stripTags(a[2]),
      url: link,
      displayUrl: prettyUrl(link),
      domain: hostOf(link),
      snippet: sn ? stripTags(sn[1]) : '',
    })
  }
  return { results: dedupe(results).slice(0, 10), related: [] as string[] }
}

async function searchWikipedia(q: string, page: number) {
  const url = `https://fr.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=10&sroffset=${(page - 1) * 10}&srsearch=${encodeURIComponent(q)}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'NexSearch/1.0 (https://nexsearch-engine.netlify.app)',
    },
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`)
  const data = (await res.json()) as {
    query?: { search?: { title: string; snippet: string }[] }
  }
  const results: WebResult[] = (data.query?.search ?? []).map((s) => {
    const link = `https://fr.wikipedia.org/wiki/${encodeURIComponent(s.title.replace(/ /g, '_'))}`
    return {
      title: `${s.title} — Wikipédia`,
      url: link,
      displayUrl: prettyUrl(link),
      domain: 'fr.wikipedia.org',
      snippet: stripTags(s.snippet),
    }
  })
  return { results, related: [] as string[] }
}

export async function searchWeb(
  q: string,
  page = 1,
): Promise<WebSearchResponse> {
  const providers = [
    ['bing', searchBing],
    ['duckduckgo', searchDuckDuckGo],
    ['wikipedia', searchWikipedia],
  ] as const
  for (const [source, provider] of providers) {
    try {
      const { results, related } = await provider(q, page)
      if (results.length > 0)
        return { query: q, page, source, results, related }
    } catch (err) {
      console.warn(`[search] ${source} failed:`, (err as Error).message)
    }
  }
  return { query: q, page, source: 'wikipedia', results: [], related: [] }
}

export async function searchImages(
  q: string,
  page = 1,
): Promise<ImageResult[]> {
  const first = (page - 1) * 35
  const html = await fetchText(
    `https://www.bing.com/images/async?q=${encodeURIComponent(q)}&first=${first}&count=35&mmasync=1&setlang=fr&cc=FR`,
  )
  const out: ImageResult[] = []
  for (const m of html.matchAll(/ m="(\{[^"]*\})"/g)) {
    try {
      const data = JSON.parse(decodeEntities(m[1])) as {
        murl?: string
        turl?: string
        purl?: string
        t?: string
      }
      if (!data.murl || !data.turl) continue
      out.push({
        title: stripTags(data.t ?? ''),
        thumb: data.turl,
        full: data.murl,
        page: data.purl ?? data.murl,
        domain: hostOf(data.purl ?? data.murl),
      })
    } catch {
      // skip malformed entry
    }
  }
  return out
}

function parseRssItems(xml: string) {
  return xml
    .split('<item>')
    .slice(1)
    .map((item) => {
      const pick = (tag: string) => {
        const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
        return m
          ? decodeEntities(m[1].replace(/<!\[CDATA\[|\]\]>/g, '')).trim()
          : ''
      }
      return {
        title: pick('title'),
        link: pick('link'),
        source: pick('source'),
        pubDate: pick('pubDate'),
      }
    })
}

export async function searchNews(q: string | null): Promise<NewsResult[]> {
  const url = q
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=fr&gl=FR&ceid=FR:fr`
    : 'https://news.google.com/rss?hl=fr&gl=FR&ceid=FR:fr'
  const xml = await fetchText(url)
  return parseRssItems(xml)
    .filter((i) => i.title && i.link)
    .slice(0, 30)
    .map((i) => {
      // Google News titles end with " - Source"; keep the title clean.
      const source = i.source || i.title.split(' - ').pop() || ''
      const title =
        source && i.title.endsWith(` - ${source}`)
          ? i.title.slice(0, -(source.length + 3))
          : i.title
      const date = i.pubDate ? new Date(i.pubDate) : null
      return {
        title,
        url: i.link,
        source,
        published:
          date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
      }
    })
}

export async function suggest(q: string): Promise<string[]> {
  const res = await fetch(
    `https://suggestqueries.google.com/complete/search?client=firefox&hl=fr&ie=utf-8&oe=utf-8&q=${encodeURIComponent(q)}`,
    { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(3000) },
  )
  if (!res.ok) return []
  const data = (await res.json()) as [string, string[]]
  return Array.isArray(data[1]) ? data[1].slice(0, 8) : []
}

export type WikiSummary = {
  title: string
  description: string | null
  extract: string
  url: string
  thumbnail: string | null
}

export async function wikiSummary(q: string): Promise<WikiSummary | null> {
  const headers = {
    'User-Agent': 'NexSearch/1.0 (https://nexsearch-engine.netlify.app)',
  }
  const search = await fetch(
    `https://fr.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=1&srsearch=${encodeURIComponent(q)}`,
    { headers, signal: AbortSignal.timeout(4000) },
  )
  if (!search.ok) return null
  const sdata = (await search.json()) as {
    query?: { search?: { title: string }[] }
  }
  const title = sdata.query?.search?.[0]?.title
  if (!title) return null
  const res = await fetch(
    `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    { headers, signal: AbortSignal.timeout(4000) },
  )
  if (!res.ok) return null
  const d = (await res.json()) as {
    type: string
    title: string
    description?: string
    extract?: string
    content_urls?: { desktop?: { page?: string } }
    thumbnail?: { source?: string }
  }
  if (d.type === 'disambiguation' || !d.extract) return null
  return {
    title: d.title,
    description: d.description ?? null,
    extract: d.extract,
    url:
      d.content_urls?.desktop?.page ??
      `https://fr.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    thumbnail: d.thumbnail?.source ?? null,
  }
}
