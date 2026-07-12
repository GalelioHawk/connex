# Connex project status

Last updated: 12 July 2026

## Current architecture

- Expo 55 and React Native 0.83 mobile application
- TypeScript with strict checking
- Convex database, reactive queries, functions, storage, scheduled jobs, and sessions
- Zustand for authentication and device preferences
- Expo Push Service for message, call, and SOS notifications
- Agora for voice and video calls

The former Express, Supabase, Railway, Redis, REST, JWT, Axios, and NativeWind architecture has been removed.

## Implemented

- Phone/password registration, login, logout, password change, session expiry handling, and persisted authentication
- Direct and group chat, requests, media, presence, delivery/read state, deletion, and push scheduling
- Group rename, add/remove member, leave group, and replacement-admin behavior
- Status posts, views, media upload, and expiry
- Agora call signalling, incoming calls, call history, missed calls, and call push scheduling
- Mutual-consent SOS contacts, three-second hold interaction, emergency messages, push scheduling, and activation limits
- Feed community/alerts views, area/category filtering, posting, likes, and loadshedding summary
- Edu paper catalogue, PDF viewer, notes, tutors, contact requests, help questions, and seed data
- Dark/light theme infrastructure and custom bottom navigation

## Required before closed alpha

- [ ] Deploy the latest Convex schema and functions to the intended development deployment
- [ ] Set and verify `APP_ENV`, EskomSePush, and Agora server variables
- [ ] Confirm Expo/EAS push credentials for both platforms
- [ ] Test push behavior on two physical devices in foreground, background, and terminated states
- [ ] Test voice/video calls between two devices
- [ ] Verify register, login, logout, password change, and forced session expiry
- [ ] Validate Chat, Requests, groups, Feed, Edu, Status, SOS, and Profile on iOS and Android
- [ ] Attach verified official URLs to remaining Edu papers marked `needs_url`
- [ ] Create content reporting, moderation, appeals, and incident-response workflows
- [ ] Obtain legal review of privacy, terms, POPIA handling, SOS wording, and user-generated content rules

## Required before public stores

- [ ] Final app name, bundle ownership, signing team, support email, and store accounts
- [ ] Store screenshots, descriptions, privacy declarations, age rating, and review notes
- [ ] Crash reporting, product analytics, support intake, deletion/export requests, and operational monitoring
- [ ] Documented backup, incident, credential rotation, moderation, and release processes
- [ ] Closed-pilot evidence for activation, retention, reliability, and abuse handling

## Verification commands

From `apps/mobile`:

```sh
npm run release:check
```

This runs strict TypeScript checking and checks the Git diff for whitespace errors.

Run `npm run convex:codegen` separately before the release check whenever the Convex schema or functions change.

## Dependency audit note

The July 2026 dependency update removed all high and critical npm advisories. Nine moderate advisories remain in Expo's transitive iOS `xcode`/`uuid` build-tool chain. npm's proposed forced fix downgrades Expo to SDK 46, so it must not be applied. Recheck when Expo publishes a compatible patched dependency chain.
