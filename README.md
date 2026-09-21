# ELARA

A career workspace. Your career profile, resumes, job search and applications
in one place — so every application starts from something you have already
written down, rather than a blank page.

```
Career profile  →  Resume  →  Opportunities  →  Tailored application  →  Tracker
```

---

## Running it

You need Node 20+ and a PostgreSQL database. The repo ships a Compose file for
one, on port **55432** so it cannot collide with a Postgres you already run.

```bash
cp .env.example .env          # then set AUTH_SECRET (see below)
npm install
npm run db:up                 # starts postgres in Docker
npm run db:push               # creates the schema
npm run db:seed               # 16 job listings + a demo account
npm run dev
```

Generate a secret for `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Then sign in with the seeded account:

```
amara@elara.dev / elara-demo-2026
```

Already have a Postgres? Skip `db:up` and point `DATABASE_URL` at it.

### Optional integrations

All are optional, and the product degrades honestly without them.

| Variable          | Without it                                                       |
| ----------------- | ---------------------------------------------------------------- |
| `GEMINI_API_KEY`  | The assistant is hidden; everything else works.                    |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No "Continue with Google"; email and password work as before. |
| `RESEND_API_KEY`  | Verification and reset links are logged to the server console.     |

The last one matters: you can complete signup, email verification and a
password reset on a fresh clone with no third-party account — the link is
printed in the terminal.

### Scripts

| Script                | What it does                                  |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | Development server                            |
| `npm run build`       | Production build (runs `prisma generate`)     |
| `npm run typecheck`   | `tsc --noEmit`                                |
| `npm run lint`        | ESLint                                        |
| `npm run format`      | Prettier                                      |
| `npm run db:push`     | Sync the schema (local development)           |
| `npm run db:migrate`  | Apply pending migrations (`migrate deploy`)   |
| `npm run db:status`   | Show migration status                         |
| `npm run db:seed`     | Seed jobs and the demo account                |
| `npm run db:reset`    | Wipe, re-create and re-seed                   |
| `npm run db:studio`   | Prisma Studio                                 |

### Deploying to Vercel with Supabase

1. Set these in the Vercel project (Production **and** Preview):
   - `DATABASE_URL` — the Supabase **transaction pooler** string, port 6543,
     ending in `?pgbouncer=true&connection_limit=5`. Not the direct
     `db.<ref>.supabase.co` host: it is IPv6-only, Vercel cannot reach it, and
     every query (login included) fails.
   - `DIRECT_URL` — the session pooler (same host, port 5432) or direct string.
   - `APP_URL` — `https://elara-alpha-ten.vercel.app`. The Google callback URL
     is built from it.
   - `AUTH_SECRET`, `GEMINI_API_KEY`, and optionally `GOOGLE_CLIENT_ID` +
     `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`.
2. Apply migrations to the production database from your machine:
   `npm run db:migrate` (never `db:reset` against production).
3. Redeploy, then open `/api/health` — it reports whether the deployment can
   reach the database and its tables. Failures are logged with a Prisma error
   code and a hint in the Vercel function logs.

**Function region.** `vercel.json` pins functions to `bom1` (Mumbai), the
same AWS region as the Supabase database (`ap-south-1`). Vercel's default,
`iad1` (Washington), put every database round trip across the world: about
200 ms each, and a page needs several in sequence. If the database ever moves,
move this with it.

**Google sign-in.** Create an OAuth client ("Web application") in Google Cloud
Console with:

- Authorized JavaScript origins: `http://localhost:3000`,
  `https://elara-alpha-ten.vercel.app`
- Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`,
  `https://elara-alpha-ten.vercel.app/api/auth/google/callback`

The callback is always `APP_URL` + `/api/auth/google/callback`, so preview
deployments hand off to the production domain rather than needing their own
entry. A Google sign-in with an email that already has an ELARA account is
linked to that account rather than creating a second one (see
`src/server/auth/google-account.ts`).

The assistant uses Google Gemini through `@google/genai`, server-side only. The
model is pinned in one place, `src/server/ai/gemini.ts`.

---

## How it is put together

```
src/
  app/
    (marketing)/        landing page — statically rendered
    (auth)/             login, register, password reset, verification
    (app)/              the workspace; requireUser() runs in its layout
    api/resume/[id]/pdf PDF export
  components/ui/        design-system primitives
  components/brand/     the mark and wordmark
  features/             feature UI, grouped by area
  services/             CareerService, ResumeService, JobService,
                        ApplicationService, AiService, EmailService, PdfService
  server/               db client, auth, guards, rate limiting, server actions
  lib/                  env, formatting, validation schemas
  config/               site copy, navigation
  hooks/                shared client hooks
prisma/                 schema and seed
```

Business logic lives in `services/`. Components render; server actions validate,
check ownership and delegate.

### Decisions worth knowing about

**A resume is a projection of the profile, not a copy.** Facts live once, on the
Career Profile. A resume owns ordering, visibility and per-resume wording
overrides. Change a job title and every resume follows. The projection
(`features/resume/project-document.ts`) is a pure function with no server
imports, which is why the editor can run it in the browser for a live preview
and the server can run the same one for the PDF — the preview cannot drift from
the export.

**Sections are opt-out, not opt-in.** A resume records what to *leave out*, so
anything added to your profile later appears in existing resumes instead of
silently going missing.

**Templates are code, not rows.** There is no `ResumeTemplate` table because it
would hold nothing the registry in `features/resume/templates/` does not already
own. A resume stores a `templateKey`, and an unknown key falls back to the
default rather than failing to render.

**The PDF is a real document.** `@react-pdf/renderer` draws text at point sizes
on a true A4 page — selectable, searchable, with working links — rather than
printing a web page in a headless browser. Entries are marked `wrap={false}` so
a single role never splits across a page break.

**Sessions are opaque tokens, not JWTs.** Only a SHA-256 digest is stored, so a
database leak hands out no working sessions, and logging out revokes server-side
immediately. A separate non-sensitive `elara_signed_in` flag exists purely so the
marketing pages can stay statically rendered while still greeting a signed-in
visitor.

**The assistant rewrites wording and never invents record.** The rule is in the
system prompt, repeated per task, and — because a prompt is not a guarantee —
backed by a check that rejects any suggestion containing a number that was not
in the input. When that check fires, the UI says so rather than hiding it.
Context is always read from the database server-side; nothing the client posts is
trusted as input about who you are.

**Authorization is per row, not per route.** `requireUser()` in the workspace
layout means no page can forget it, and every mutation additionally scopes its
query by `userId` — so a mismatched owner updates or deletes nothing, rather than
depending on a separate check that could be skipped.

**Reordering uses buttons, not drag.** Profile sections reorder with move
up/down so it works from a keyboard, with a screen reader and on a phone. The
application board does support dragging, but every card also carries a plain
`<select>` for its stage, so dragging is the shortcut rather than the only route.

---

## Known limitations

- **The PDF covers Latin-1 only.** Helvetica and Times are built into the PDF
  format, which is why nothing is embedded and the file opens identically
  everywhere — but they cannot render Cyrillic, Greek or CJK. Typographic
  punctuation is folded to safe equivalents on export
  (`features/resume/pdf/latin1.ts`); a name in another script would not render.
  Supporting those means registering an embedded TTF with `Font.register` and
  shipping the file.
- **Rate limiting is per process.** The limiter on the auth and AI endpoints
  holds its buckets in memory. That protects a single instance; several
  instances behind a load balancer would need Redis or an edge limiter.
- **Job listings are seeded, not imported.** The 16 postings are invented and
  flagged `isDemo`, so real imports can be told apart later. There is no
  ingestion pipeline.
- **Page breaks in the preview are indicative.** The on-screen preview marks
  where the page divides using the same metrics as the export; the PDF's own
  layout engine is the authority.

---

## Checks

```bash
npm run typecheck && npm run lint && npm run build
```

All three pass clean. Authorization is covered directly: a PDF request without a
session returns 401, and one for an id the user does not own returns 404 rather
than 403, so ids cannot be probed for existence.
