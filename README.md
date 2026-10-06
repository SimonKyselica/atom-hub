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
- **Streak freezes.** Buy one in the shop for 100 coins; you can hold up to 2. If you miss a day while a streak is going, one freeze is used automatically and every streak survives. A frozen day shows as a striped ice-blue square. If you later fill in that day, the freeze is refunded.
- **Daily quests.** Three small challenges each day (e.g. *Finish 2 habits before noon*, *Close 2 todos*), with bonus coins when you claim them.
- **Habit mastery.** Each habit levels up on its own: 🥉 Bronze at 21 completions, 🥈 Silver at 66, 🥇 Gold at 100 and 💎 Diamond at 365. Each tier pays bonus coins once.
- **Recurring todos and subtasks.** Todos can repeat daily, on weekdays, weekly or monthly. Completing one schedules the next occurrence, and re-opening it withdraws that occurrence. Each todo can hold a checklist.
- **Insights.** Completion rate by weekday, a 12-week trend, the hours you usually check in, and a per-habit consistency table.
- **Public profile.** An optional read-only link (`/u/<id>`) with your graph, level and badges, and your habits if you opt in. It never shows your email and isn't indexed by search engines.
- **Push notifications.** A reminder for each habit at a time you choose (sent only if it isn't done yet), and a morning digest of todos due today. On Android, habit reminders have a **✓ Mark done** button that logs the habit without opening the app.
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

Notifications also need VAPID keys and a cron secret. `.env.local` already has generated ones; for production, see [Reminders](#reminders-push-notifications) below.

**Sign-up rules:** sign-up is open only until the first account exists (yours). To let more people register later, set `ALLOW_SIGNUP=true`. Every record is already scoped per user, so no migration is needed.

## Deploy and install on your phone

PWA installation requires HTTPS, so deploy first. On [Vercel](https://vercel.com):

1. Push the repo and import it in Vercel.
2. Add `MONGODB_URI`, `MONGODB_DB`, `AUTH_SECRET` and `ALLOW_SIGNUP` as environment variables.
3. In Atlas → *Network Access*, allow `0.0.0.0/0`. Vercel has no fixed outbound IPs.

Then install the app:

- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** use the *Install app* button on the Profile page, or the browser menu → *Install app*.

## Reminders (push notifications)

Reminders are sent by `GET /api/cron/notify`. Something has to call that URL every 5–15 minutes with the header `Authorization: Bearer <CRON_SECRET>`. Each reminder goes out at most once a day, so frequent calls are safe. A reminder still goes out if the call is up to 2 hours late.

- **Vercel Pro:** add a `vercel.json` with `{"crons":[{"path":"/api/cron/notify","schedule":"*/10 * * * *"}]}`. Vercel sends the `CRON_SECRET` header automatically. Don't add this on the Hobby plan: Hobby only allows daily crons, so the deployment fails.
- **Vercel Hobby or any other host:** create a free job on [cron-job.org](https://cron-job.org) that calls `https://<your-app>/api/cron/notify` every 10 minutes, with the `Authorization` header set.
- **Locally:** run `npm run build && npm start` (the service worker is only active in production builds), then `npm run cron:dev` in a second terminal.

On each device, turn notifications on under **Profile → Push notifications**. On iPhone this works only in the installed app (iOS 16.4+): add it to the home screen first.

Production environment variables: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a `mailto:` address) and `CRON_SECRET`. Generate the keys with `npx web-push generate-vapid-keys`. Keep the same keys after launch: changing them invalidates every device's subscription.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run icons` | Regenerate the PWA icons from `scripts/generate-icons.mjs` |
| `npm run cron:dev` | Call the reminder endpoint every minute (local testing) |

## Project layout

```
src/
  actions/        Server Actions (auth, habits, todos, rewards, user). All validate input with zod and check ownership.
  app/(auth)/     Login and sign-up
  app/(app)/      Signed-in pages: Today, Habits, Habit detail, Insights, Todos, Shop, Profile
  app/u/[slug]/   Public profile
  app/api/        Reminder cron endpoint; "Mark done" endpoint used by notifications
  components/     UI; contribution-graph.tsx is the GitHub-style graph
  lib/
    engine.ts     Awards XP/coins, perfect days, mastery and achievements through an idempotent ledger
    freeze.ts     Once a day, uses streak freezes on missed days
    quests.ts     Picks the daily quests and tracks progress
    notify.ts     Reminder scheduling (called by the cron endpoint)
    push.ts       Web Push sending; removes dead subscriptions
    game.ts       Rewards, levels, titles, palettes
    streaks.ts    Streak and stats math (respects weekday schedules)
    models/       Mongoose models: User, Habit, HabitLog, Todo, Reward, Transaction, PushSubscription, NotificationLog
  proxy.ts        Redirects signed-out visitors; keeps the session cookie rolling
public/sw.js      Service worker
```
