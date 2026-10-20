# AGENTS.md

NexSearch is a French-language web search engine styled after Microsoft's Metro design language (live tiles, pivots, charms). It returns live web/image/news results and a streamed, cited AI overview. TanStack Start app deployed on Netlify.

## Architecture

```
src/
├── routes/
│   ├── __root.tsx        # HTML shell (lang="fr", dark), fonts, accent boot script, metadata
│   ├── index.tsx         # Start screen: hero search + tile groups (weather, clock, wallpaper, news, explore, history)
│   ├── search.tsx        # /search?q=&type=web|images|news — pivots, web results + AI overview + Wikipedia, image wall, news tiles
│   ├── api.search.ts     # GET  /api/search   → web (with wiki summary on page 1), images, news. CDN-cached 10 min
│   ├── api.suggest.ts    # GET  /api/suggest  → autocomplete suggestions
│   ├── api.overview.ts   # POST /api/overview → streamed AI overview
│   └── api.tiles.ts      # GET  /api/tiles    → weather (visitor geo via x-nf-geo), Bing wallpaper, headlines
├── server/               # Server-only code. Never import values from here in client code (types only)
│   ├── search.ts         # Providers: Bing HTML scrape → DuckDuckGo HTML → Wikipedia fallback; Bing images; Google News RSS; suggestions; wiki summary
│   ├── overview.ts       # AI Gateway (OpenAI SDK, gpt-5.4-mini) grounded on server-side search results
│   └── tiles.ts          # Open-Meteo weather, Bing image of the day, headlines
├── components/metro/
│   ├── tiles.tsx         # Tile (tilt-on-press, sizes small/medium/wide/large), LiveFaces, TileGroup, MetroProgress, MetroToggle
│   ├── search-box.tsx    # Metro text box with suggestions/history, navigates to /search
│   ├── ai-overview.tsx   # Streams /api/overview, renders minimal markdown with [n] citation chips
│   └── chrome.tsx        # Logo wordmark, SettingsCharm (accent, AI toggle, history)
├── lib/
│   ├── settings.ts       # localStorage-backed prefs via useSyncExternalStore; sets --metro-accent
│   └── format.ts         # Weather code mapping, relative time, favicon URL
└── styles.css            # Theme + all Metro primitives (.tile, .tile-grid, .live-faces, .metro-progress, .pivot-item, .image-wall)
```

## Conventions & decisions

- **UI copy is French.** Keep new strings in French.
- **Accent color** is the CSS variable `--metro-accent`; derive tones with `color-mix()` instead of hard-coding colors so the whole UI follows the user's choice.
- **Tile grid**: `.tile-grid` is 6 cells wide on desktop (70–80px cells) and 4 fluid cells on phones. Tile sizes span 1×1, 2×2, 4×2, 4×4.
- `tile-in` animation uses `animation-fill-mode: backwards` on purpose — `both` would freeze `transform` and break the press tilt.
- **Overview stream protocol**: first line is a JSON array of sources `{n,title,url,domain}`, the rest is plain text with `[n]` citations, `**bold**` and `- ` bullets.
- The overview endpoint re-runs the search server-side rather than trusting client-supplied results, so it can't be used as a generic LLM proxy.
- Bing markup scraping is brittle by nature; if Bing returns nothing, `searchWeb` silently falls back to DuckDuckGo then Wikipedia. Check `source` in the `/api/search` response when debugging.
- No database: preferences and history live in the browser only.
- AI Gateway: use `new OpenAI()` with no key/baseURL; only models from the Netlify AI Gateway list.
