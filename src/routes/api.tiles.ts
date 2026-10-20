import { createFileRoute } from '@tanstack/react-router'
import { getTiles } from '@/server/tiles'

export const Route = createFileRoute('/api/tiles')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const data = await getTiles(request)
        // Weather depends on the visitor's location, so only the browser caches this.
        return Response.json(data, {
          headers: {
            'Cache-Control': 'private, max-age=300',
          },
        })
      },
    },
  },
})
