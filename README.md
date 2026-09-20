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

Both are optional, and the product degrades honestly without them.

| Variable          | Without it                                                       |
| ----------------- | ---------------------------------------------------------------- |
| `OPENAI_API_KEY`  | The assistant is hidden; everything else works.                    |
| `RESEND_API_KEY`  | Verification and reset links are logged to the server console.     |

That second one matters: you can complete signup, email verification and a
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
| `npm run db:push`     | Sync the schema                               |
| `npm run db:seed`     | Seed jobs and the demo account                |
| `npm run db:reset`    | Wipe, re-create and re-seed                   |
| `npm run db:studio`   | Prisma Studio                                 |

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
