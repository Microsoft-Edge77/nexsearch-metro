import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { streamOverview } from '@/server/overview'

const input = z.object({ q: z.string().trim().min(1).max(300) })

export const Route = createFileRoute('/api/overview')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'JSON invalide' }, { status: 400 })
        }
        const parsed = input.safeParse(body)
        if (!parsed.success)
          return Response.json(
            { error: 'Une requête est nécessaire.' },
            { status: 400 },
          )
        return streamOverview(parsed.data.q)
      },
    },
  },
})
