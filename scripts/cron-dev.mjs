// Local stand-in for a cron service: pings the reminder endpoint every minute.
// Usage: npm run cron:dev  (with the app running on http://localhost:3000)
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const url = `${process.env.APP_URL ?? "http://localhost:3000"}/api/cron/notify`;
const secret = process.env.CRON_SECRET ?? env.CRON_SECRET;
if (!secret) throw new Error("CRON_SECRET missing in .env.local");

async function tick() {
  try {
    const res = await fetch(url, { headers: { authorization: `Bearer ${secret}` } });
    console.log(new Date().toLocaleTimeString(), res.status, JSON.stringify(await res.json()));
  } catch (err) {
    console.error(new Date().toLocaleTimeString(), "failed:", err.message);
  }
}

console.log(`Pinging ${url} every 60s — Ctrl+C to stop`);
await tick();
setInterval(tick, 60_000);
