# ZEMi

Application de transport et de livraisons à Cotonou : les clients commandent une course ou une livraison, les chauffeurs (zems) les prennent en charge. Deux activités : **course** et **livraison** (simple ou express).

## Fonctionnalités

- Commande d’une course ou d’une livraison, avec prix calculés côté serveur
- Suivi en temps réel de la mission
- Code de départ (course) et code de livraison pour sécuriser le début et la fin
- Portefeuille en boucle fermée : le client recharge et paie ; le chauffeur gagne et retire (le cash reste le défaut pour les courses)
- Back-office : configuration des tarifs (`pricing_config`), comptes, missions

La version **web** est une démonstration. Les cartes y sont dégradées (sélection par liste de lieux) ; la carte interactive est disponible dans l’application mobile (Expo Go / natif).

## Stack

- Expo SDK 57, React Native, TypeScript, Expo Router
- Supabase (Auth, Postgres, Realtime, Edge Functions)
- PostgreSQL : migrations dans `supabase/migrations/`, politiques d’accès (RLS) sur les tables métier

## Installation locale

Prérequis : Node.js, npm, Expo Go sur téléphone pour le mobile.

```bash
git clone https://github.com/gopalsognigbe/zemi.git
cd zemi
npm install
cp .env.example .env
```

Renseignez `.env`, puis :

```bash
npx expo start
```

- Mobile : scanner le QR dans Expo Go (même réseau Wi‑Fi, ou `--tunnel`)
- Web (démo) : `npx expo start --web`

Export web statique (PWA) :

```bash
npx expo export -p web
```

Le dossier `dist/` est prêt à être servi (Vercel, etc.).

## Variables d’environnement

Copiez `.env.example` vers `.env`. Aucune valeur réelle n’est versionnée.

| Variable | Rôle |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé anon / publishable (côté client) |

Les migrations SQL se trouvent dans `supabase/migrations/`. À appliquer dans le SQL Editor du projet Supabase (ou via la CLI) avant d’utiliser l’app.

## Licence

Projet personnel / démonstration.
