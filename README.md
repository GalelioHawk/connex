# Connex

Connex is an Expo/React Native application combining real-time chat, community alerts, emergency-contact SOS, and learner resources. The active backend is Convex.

## Active project

```text
apps/mobile/          Expo mobile application
apps/mobile/convex/   Convex schema and server functions
docs/                 Website and current business/technical documents
```

The former Express/Supabase backend and SQL database were removed. Historical planning files are isolated under `docs/archive/` and are not current sources of truth.

## Local setup

```sh
cd apps/mobile
cp .env.example .env
npm install
npm run convex:codegen
npm run release:check
npm start
```

Configure the mobile and Convex environment variables described in `.env.example`. Never commit `.env`, signing credentials, Firebase files, Agora certificates, or service-account material.

## Project guidance

- Read `CLAUDE.md` before changing code.
- Use Convex reactive queries for server state and Zustand only for authentication/device preferences.
- Use `StyleSheet.create()` for React Native styling.
- Run `npm run convex:codegen` after changing Convex functions or schema.
- Run `npm run release:check` before handing off a change.

Current alpha gates and outstanding external validation are tracked in `docs/technical/PROJECT_STATUS.md`.
