import { Check, Settings2, Trash2, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { ACCENTS, updateSettings, useSettings } from '@/lib/settings'
import { MetroToggle } from './tiles'

/** The NexSearch wordmark: a 2×2 tile glyph followed by the name. */
export function Logo({
  className,
  size = 28,
}: {
  className?: string
  size?: number
}) {
  const cell = size / 2 - 1.5
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.32 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <rect
          x="0"
          y="0"
          width={cell}
          height={cell}
          fill="var(--metro-accent)"
        />
        <rect x={cell + 3} y="0" width={cell} height={cell} fill="#fff" />
        <rect
          x="0"
          y={cell + 3}
          width={cell}
          height={cell}
          fill="#fff"
          opacity="0.55"
        />
        <rect
          x={cell + 3}
          y={cell + 3}
          width={cell}
          height={cell}
          fill="var(--metro-accent)"
          opacity="0.7"
        />
      </svg>
      <span
        style={{ fontSize: size * 0.9, lineHeight: 1 }}
        className="font-light-metro text-white"
      >
        Nex<span className="font-semibold">Search</span>
      </span>
    </span>
  )
}

/** Settings charm: slides in from the right edge, like the Windows 8 charms bar. */
export function SettingsCharm({ compact }: { compact?: boolean }) {
  const { accent, aiOverview, history, useBingWallpaper } = useSettings()
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Paramètres"
          className={
            compact
              ? 'grid size-10 place-items-center rounded-full border-2 border-white/70 text-white transition-colors hover:bg-white/10'
              : 'grid size-11 place-items-center rounded-full border-2 border-white/80 text-white transition-colors hover:bg-white/10'
          }
        >
          <Settings2 className="size-5" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-[360px] flex-col overflow-y-auto bg-[#1d1e21] px-7 py-8 text-white shadow-2xl outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right">
          <div className="mb-8 flex items-center justify-between">
            <Dialog.Title className="font-light-metro text-3xl">
              Paramètres
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fermer"
              className="grid size-9 place-items-center rounded-full border-2 border-white/70 hover:bg-white/10"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Personnalisez NexSearch
          </Dialog.Description>

          <h3 className="mb-1 text-[15px] font-semibold">
            Couleur d'accentuation
          </h3>
          <p className="mb-4 text-sm text-white/60">
            Elle colore les tuiles, les liens et l'aperçu IA.
          </p>
          <div className="mb-9 grid grid-cols-6 gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                title={a.name}
                aria-label={a.name}
                aria-pressed={accent === a.value}
                onClick={() => updateSettings({ accent: a.value })}
                className="grid aspect-square place-items-center outline-2 outline-offset-2 outline-transparent transition-transform hover:scale-105 aria-pressed:outline-white"
                style={{ background: a.value }}
              >
                {accent === a.value && (
                  <Check className="size-4" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>

          <h3 className="mb-1 text-[15px] font-semibold">Image du jour</h3>
          <p className="mb-4 text-sm text-white/60">
            Affiche le fond Bing du jour, flouté avec un filtre noir transparent.
          </p>
          <div className="mb-9">
            <MetroToggle
              label="Image du jour Bing"
              checked={useBingWallpaper}
              onChange={(v) => updateSettings({ useBingWallpaper: v })}
            />
          </div>

          <h3 className="mb-1 text-[15px] font-semibold">Aperçu IA</h3>
          <p className="mb-4 text-sm text-white/60">
            Génère une synthèse sourcée au-dessus des résultats Web.
          </p>
          <div className="mb-9">
            <MetroToggle
              label="Aperçu IA"
              checked={aiOverview}
              onChange={(v) => updateSettings({ aiOverview: v })}
            />
          </div>

          <h3 className="mb-1 text-[15px] font-semibold">Historique</h3>
          <p className="mb-4 text-sm text-white/60">
            {history.length > 0
              ? `${history.length} recherche${history.length > 1 ? 's' : ''} enregistrée${history.length > 1 ? 's' : ''} sur cet appareil.`
              : 'Aucune recherche enregistrée sur cet appareil.'}
          </p>
          <button
            type="button"
            disabled={history.length === 0}
            onClick={() => updateSettings({ history: [] })}
            className="inline-flex w-fit items-center gap-2 border-2 border-white px-4 py-1.5 text-sm transition-colors hover:bg-white hover:text-black disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white"
          >
            <Trash2 className="size-4" /> Effacer l'historique
          </button>

          <p className="mt-auto pt-10 text-xs text-white/40">
            NexSearch · Résultats Web en direct, aperçus générés par IA. Vos
            préférences restent sur cet appareil.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
