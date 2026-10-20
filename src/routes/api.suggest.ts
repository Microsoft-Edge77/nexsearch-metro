import { createFileRoute } from '@tanstack/react-router'
import { suggest } from '@/server/search'

export const Route = createFileRoute('/api/suggest')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const q = (new URL(request.url).searchParams.get('q') ?? '')
          .trim()
          .slice(0, 120)
        if (!q) return Response.json({ suggestions: [] })
        const suggestions = await suggest(q).catch(() => [])
        return Response.json(
          { suggestions },
          {
            headers: {
              'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=3600',
            },
          },
        )
      },
    },
  },
})
