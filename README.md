# NexSearch

NexSearch est un moteur de recherche Web inspiré de l'interface **Metro** (Windows 8 / Windows Phone) et de ses **tuiles live**. Il renvoie de vrais résultats Web, des images et des actualités en temps réel, accompagnés d'un **Aperçu IA** rédigé à partir des résultats et cité source par source. L'interface s'adapte aux téléphones (grille de tuiles verticale façon Windows Phone) comme aux ordinateurs (écran d'accueil à défilement horizontal façon Windows 8).

## Fonctionnalités

- **Écran d'accueil en tuiles live** : météo locale (avec prévisions), horloge, image du jour, actualités à la une, tendances, raccourcis et recherches récentes. Les tuiles s'animent, basculent et s'inclinent au toucher.
- **Recherche Web réelle** avec suggestions en direct, pagination « Plus de résultats », recherches associées et fiche Wikipédia.
- **Aperçu IA** diffusé en streaming, avec citations numérotées renvoyant aux sources.
- **Pivots** web / images / actualités, visionneuse d'images plein écran.
- **Paramètres** (charme latéral) : 12 couleurs d'accentuation Metro, activation de l'aperçu IA, historique local effaçable.

## Technologies

- TanStack Start (React 19, TanStack Router), Vite, Tailwind CSS 4
- Routes serveur TanStack Start déployées en Netlify Functions
- Netlify AI Gateway (SDK OpenAI, modèle `gpt-5.4-mini`) pour l'aperçu IA — aucune clé à configurer
- Sources de données : Bing (Web et images, avec repli DuckDuckGo puis Wikipédia), Google Actualités (RSS), Wikipédia (fiches), Open-Meteo (météo), image du jour Bing
- Cache CDN Netlify sur les réponses de recherche

## Lancer en local

```bash
pnpm install
netlify dev
```

`netlify dev` est recommandé : il injecte les variables de l'AI Gateway nécessaires à l'aperçu IA. Après au moins un déploiement en production, l'aperçu IA fonctionne aussi en local via la CLI Netlify.

## Pistes d'évolution

- Recherche vidéo et cartes intégrées
- Partage d'une recherche et de son aperçu IA
- Questions de suivi sur l'aperçu IA (mode conversation)
