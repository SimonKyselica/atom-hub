# Atom Hub

A gamified habit tracker and todo list styled after GitHub. Every completed habit or todo turns a square green in a GitHub-style contribution graph. You earn XP and coins, level up, unlock badges and spend coins in a rewards shop you design yourself. It installs to your phone as a PWA.

Built with Next.js 16 (App Router, Server Actions), MongoDB/Mongoose and Tailwind CSS 4.

## Features

- **Contribution graphs.** An overall "N contributions in the last year" graph, plus one per habit in its own color. Graphs have hover and tap tooltips and a year picker.
- **Habits.** Two kinds: yes/no (e.g. *Meditate*) and counted (e.g. *8 glasses of water*). For counted habits, partial progress shows lighter green. You can schedule a habit on specific weekdays; days off never break a streak. Tap any past square to backfill a day you forgot.
- **Todos.** Styled as GitHub issues, with Open/Closed tabs, due dates, overdue warnings and difficulty levels.
- **Gamification**
  - XP and coins for every completion: easy 10 XP / 5 coins, medium 20 / 10, hard 40 / 20.
  - Streak multiplier: +10% per full week of streak, up to +50%.
  - Perfect day bonus (all scheduled habits done): +25 XP, +15 coins.
  - Levels with GitHub-flavored titles (*Initial Commit → Contributor → Committer → Maintainer → …*).
  - 19 achievements that award bonus coins.
  - A rewards shop where you set your own treats and prices. Redeeming takes two taps.
- **Cheat-proof ledger.** Every award is recorded once, so double taps can't double-count. Un-checking a habit reverses exactly what it gave. Coins can go negative, so un-checking after spending doesn't give you free rewards.
- **PWA.** Installable, full-screen, with a bottom tab bar. Pages you've visited open offline (read-only). The app refreshes when you return to it, and it follows your device's timezone so "today" is always right.
- **Light and dark themes**, following your system setting.

## Setup

1. **Create a MongoDB database.** The free [MongoDB Atlas](https://www.mongodb.com/atlas) M0 tier is plenty. Copy its connection string (*Database → Connect → Drivers*).
2. **Configure the environment.** `.env.local` already exists with a generated `AUTH_SECRET`. Set `MONGODB_URI` to your connection string. All variables are documented in `.env.example`.
3. **Run it:**
   ```bash
   npm install
   npm run dev
   ```
4. Open http://localhost:3000 and create your account.

**Sign-up rules:** sign-up is open only until the first account exists (yours). To let more people register later, set `ALLOW_SIGNUP=true`. Every record is already scoped per user, so no migration is needed.

## Deploy and install on your phone

PWA installation requires HTTPS, so deploy first. On [Vercel](https://vercel.com):

1. Push the repo and import it in Vercel.
2. Add `MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET` and `ALLOW_SIGNUP` as environment variables.
3. In Atlas → *Network Access*, allow `0.0.0.0/0`. Vercel has no fixed outbound IPs.

Then install the app:

- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** use the *Install app* button on the Profile page, or the browser menu → *Install app*.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run icons` | Regenerate the PWA icons from `scripts/generate-icons.mjs` |

## Project layout

```
src/
  actions/        Server Actions (auth, habits, todos, rewards, user). All validate input with zod and check ownership.
  app/(auth)/     Login and sign-up
  app/(app)/      Signed-in pages: Today, Habits, Habit detail, Todos, Shop, Profile
  components/     UI; contribution-graph.tsx is the GitHub-style graph
  lib/
    engine.ts     Awards XP/coins, perfect days and achievements through an idempotent ledger
    game.ts       Rewards, levels, titles, palettes
    streaks.ts    Streak and stats math (respects weekday schedules)
    models/       Mongoose models: User, Habit, HabitLog, Todo, Reward, Transaction
  proxy.ts        Redirects signed-out visitors; keeps the session cookie rolling
public/sw.js      Service worker
```
