import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  searchImages,
  searchNews,
  searchWeb,
  wikiSummary,
} from '@/server/search'

const params = z.object({
  q: z.string().trim().min(1).max(300),
  type: z.enum(['web', 'images', 'news']).default('web'),
  page: z.coerce.number().int().min(1).max(10).default(1),
})

// Results are cached briefly on the CDN so repeated queries are instant.
const cacheHeaders = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Netlify-CDN-Cache-Control':
    'public, durable, s-maxage=600, stale-while-revalidate=3600',
}

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const parsed = params.safeParse(
          Object.fromEntries(new URL(request.url).searchParams),
        )
        if (!parsed.success) {
          return Response.json(
            { error: 'Une requête est nécessaire.' },
            { status: 400 },
          )
        }
        const { q, type, page } = parsed.data
        try {
          if (type === 'images') {
            return Response.json(
              { query: q, page, images: await searchImages(q, page) },
              { headers: cacheHeaders },
            )
          }
          if (type === 'news') {
            return Response.json(
              { query: q, news: await searchNews(q) },
              { headers: cacheHeaders },
            )
          }
          const [web, wiki] = await Promise.all([
            searchWeb(q, page),
            page === 1
              ? wikiSummary(q).catch(() => null)
              : Promise.resolve(null),
          ])
          return Response.json({ ...web, wiki }, { headers: cacheHeaders })
        } catch (err) {
          console.error('[api/search]', (err as Error).message)
          return Response.json(
            { error: 'La recherche a échoué. Réessayez dans un instant.' },
            { status: 502 },
          )
        }
      },
    },
  },
})
