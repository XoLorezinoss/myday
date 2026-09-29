# My Day — personal dashboard PWA

Free, offline-capable iPhone web app (Add to Home Screen). No backend, no accounts, no analytics. All personal data stays on the device. **These files and this README are the source of truth; a new AI session should read this first.**

## Rules for any future change
- Preserve all existing functionality unless the owner explicitly asks to change or remove it.
- Never reset or overwrite user data on deploy. Data lives in the browser (IndexedDB), not in the files, so redeploying files is safe.
- If stored data changes shape: bump `SCHEMA` in `app.js`, add a `MIG[n]` function (upgrades from n-1 to n), and keep old fields readable. A copy of the pre-upgrade data is saved under IndexedDB key `pre-migration-backup`.
- Bump the cache name in `sw.js` (`my-day-vN`) and `V` in `app.js` on every release.
- Update this README whenever features or architecture change.
- Keep it free: no paid services, no required accounts, no tracking. Personal data is never sent anywhere.

## Files
| File | Purpose |
|---|---|
| `index.html` | Shell: header, `<main>`, bottom nav, iOS PWA meta tags |
| `styles.css` | All styling; CSS variables; light/dark via `html[data-t]` |
| `app.js` | All logic, in labelled sections: helpers, storage, migrations, recurring logic, views, news, forms, actions, init |
| `sw.js` | Service worker (network-first, cache fallback, same-origin only) |
| `manifest.webmanifest` | PWA manifest (standalone, portrait) |
| `icons/` | 180/192/512 px PNG icons (placeholders) |

## Architecture
Vanilla JS, no framework or build step. A single state object `S` is loaded from IndexedDB at start. Each user change calls `save()` (writes all of `S`) then `render()` (rebuilds the current tab's HTML as a string). Clicks are handled by one delegated listener: any element with `data-a="name"` calls `A[name](id, element)`. Generic list forms use `edit(collection,id)` with field lists in `F` and defaults in `D()`. Recurring tasks have their own `recForm`.

To add a feature: add its state key (plus a migration if existing data must change), a view function, an entry in the `render()` tab map and nav list, and any actions in `A`.

## Features
Home dashboard, Tasks (To-do, Reminders, Recurring), Calendar (upcoming events list), Notes, News, global search (on Home), Settings (theme, categories, news topics/sources, export/import/clear, version).

**Home priority order:** overdue recurring, due today, due soon (1–3 days), today's reminders (including overdue), today's to-dos, today's events. Then collapsed sections: "Coming up this week" (4–7 days) and "Snoozed". Groups show 5 items with "Show N more". A summary line sits at the top.

## Data (IndexedDB db `my-day`, store `kv`)
Key `s` holds the whole state:
- `ver` number (schema version)
- `cats` `[{id, n:name, i:emoji}]` (array order = display order)
- `rec` `[{id, n, notes, cat, last:'YYYY-MM-DD', e:{n:number, u:'d'|'m'}, snz:'YYYY-MM-DD'|null, hist:[dates, newest first]}]`
- `rem` `[{id, title, notes, date, time, done}]`
- `todo` `[{id, t, due, done}]`
- `ev` `[{id, title, date, start, end, notes}]`
- `notes` `[{id, title, body}]`
- `topics` `[string]`
- `feeds` `[{n:name, u:url containing {q}}]`

Key `pre-migration-backup` holds the previous state when a migration ran. `localStorage.theme` is `system|light|dark`. Export writes `S` as JSON; import runs it through `loadState()`, which migrates old backups.

## Recurring-task logic
`nextDue = last + e.n days` (or months when `u='m'`, using JS month arithmetic). `d = nextDue − today` in whole days. Overdue if d<0 (red), due today if d=0 and due soon if d 1–3 (amber), later is green. Text is always shown ("5 days overdue", "Due today", "Due tomorrow", "Due in N days"). Done asks for a completion date (defaults to today), sets `last`, prepends to `hist` (deduplicated, sorted), and clears `snz`.

## Snooze logic
Snooze sets `snz = today + N days` and nothing else, so the schedule (`last`, `nextDue`) is unchanged. While `snz > today` the task shows "Snoozed until …" in the collapsed Snoozed section and is excluded from urgent groups. When the date passes it reappears with its true status. Only Done changes the schedule.

## News
No paid API. For each topic and each source in `feeds`, the app requests `https://api.rss2json.com/v1/api.json?rss_url=<feed URL with {q}=topic>`. The default source is Google News RSS search. rss2json.com (free tier, rate limited) exists only to get around browser CORS limits. Only topic words leave the device. Results are held in memory and not stored. Add sources in Settings, or edit `feeds` defaults in `D0()`.

## PWA
Manifest plus iOS meta tags give a standalone app. The service worker precaches the shell and serves network-first with cache fallback, so the app works offline (News needs internet). Storage persistence is requested with `navigator.storage.persist()`.

## Run
`python3 -m http.server 8000` in this folder, then open http://localhost:8000 (a server is required for the service worker).

## Update / deploy (GitHub Pages)
Upload the changed files to the repository (overwrite), commit, wait about a minute, then fully close and reopen the app on the phone (it may take two launches to pick up the new version). User data is unaffected. Back up first via Settings → Export.
