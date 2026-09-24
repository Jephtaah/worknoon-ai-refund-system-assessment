# Milestone 6: README + Docker Compose Polish

**Goal:** turn a working project into a finished submission — a README a stranger can use to run and understand the app in under 10 minutes, a docker-compose setup that's actually clean from a fresh clone, and a short demo video. This is the last milestone before the deadline, and it's graded as directly as the code is (PRD Section 1: "Documentation — README + video let a stranger run and understand it in <10 min").

This corresponds to PRD Section 9, Step 6, and closes out the checklist in PRD Section 11.

Assumes Milestones 1–5 are all done and passing.

---

## `README.md` structure

Write these sections in this order. Keep each one tight — a reviewer skimming this in under 10 minutes should get what they need without wading through filler.

### 1. What this is
Two or three sentences: an AI-assisted customer support refund system built for the Worknoon take-home assessment. Name the stack (Express, React, flat JSON, DeepSeek, Docker) up front.

### 2. Setup
The exact commands, in order, with nothing assumed:

```bash
git clone <repo-url>
cd worknoon-refund-system
cp .env.example .env
# edit .env and add your DEEPSEEK_API_KEY
docker-compose up --build
```

Then state the two URLs directly: `http://localhost:5173` for the customer/admin app, `http://localhost:4000/api/health` to confirm the backend is up.

### 3. Environment variables
A table — this is the fastest way for a reviewer to scan it:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | Yes | — | Auth for the DeepSeek API |
| `DEEPSEEK_BASE_URL` | No | `https://api.deepseek.com` | DeepSeek's OpenAI-compatible endpoint |
| `DEEPSEEK_MODEL` | No | `deepseek-chat` | Model used for ambiguous-case reasoning |
| `PORT` | No | `4000` | Backend port |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Locks backend CORS to this origin |
| `VITE_API_URL` | No | `http://localhost:4000` | Backend URL baked into the frontend at build time |

### 4. Architecture
A short paragraph plus the folder tree from PRD Section 4. Explain the four-layer separation in one line each:
- **Frontend** (React) — two views, talks only to this app's own backend.
- **Backend** (Express) — two endpoints, owns all business logic.
- **Data** (flat JSON) — customers, orders, policy, audit log; no database.
- **AI** (DeepSeek) — consulted only for the genuinely ambiguous remainder, never for policy itself.

### 5. How the AI integration works
This is the section a reviewer will read most carefully — it's worth writing as a real explanation, not a restatement of the code. Cover:
- The decision flow, in the same order used throughout this build (lookup → injection check → final sale → window → threshold → condition → AI → post-AI re-validation → audit log).
- Why most requests never reach the AI at all, and why that's a deliberate design choice, not a shortcut.
- What the prompt-injection guardrails actually do (message passed as delimited data, never concatenated into the system prompt; strict output schema; anything that doesn't parse is escalated).
- The one sentence that matters most to a technical reviewer: **the AI never has the authority to override policy — it can only be trusted within the boundaries the deterministic layer has already confirmed, and even then it's checked again after the fact.**

### 6. Testing
Summarize the results of Milestone 5's edge-case matrix — either paste the table with pass/fail filled in, or link to a separate `TESTING.md` if you kept the full matrix there. Either is fine; what matters is that the evidence exists in the deliverable, not just in your own terminal history.

### 7. Assumptions & trade-offs
State these plainly rather than letting a reviewer guess at your reasoning:
- Order ID + customer ID is treated as sufficient identification — no real authentication, by design (PRD Section 2).
- A plain return with `order_condition: "ok"` and no policy violation is auto-approved deterministically, since the policy file doesn't restrict it and there's nothing genuinely ambiguous about it (the design decision explained in Milestone 3).
- The $500 threshold check runs both before and after the AI call, deliberately redundant, as defense in depth.
- `audit-log.json` resets whenever the backend image is rebuilt, since there's no database and no persistent volume — acceptable for a single-session take-home review.
- No automated test suite; edge cases are verified manually and documented (explicitly out of scope per PRD Section 2).

### 8. Demo video
A link (or a note on where it lives, if attached separately), plus what it covers — see the script below.

---

## `docker-compose.yml` final review

Before you consider this done, walk through this list against the actual file:

- [ ] `docker-compose up --build` works from a **freshly cloned** copy of the repo — not one that still has `node_modules` or a previous build cached locally. Delete everything and clone into a new directory to test this properly; it's the only way to catch a step you did manually months — or hours — ago and forgot about.
- [ ] No step beyond `cp .env.example .env` + filling in the key is required.
- [ ] `depends_on: backend` is set on the frontend service so it doesn't race to build before the backend exists (it won't block on the backend being *ready*, just *started* — that's fine here, since the frontend doesn't call the backend until a user interacts with the page).
- [ ] Ports match what the README says: `4000` for the backend, `5173` for the frontend.
- [ ] `.env` itself is never committed; only `.env.example` is.

---

## Demo video script (aim for 3–5 minutes)

1. **Intro (20s)** — what this is, the stack, and that it's the Worknoon take-home assessment.
2. **Customer flow (60–90s)** — submit one clean happy-path request (e.g., ORD-1006, a credible damage claim) and show the approval. Then submit one edge case live — the "I'm a VIP" or "ignore the policy" case works well here, since it's a visually satisfying moment: the system doesn't budge.
3. **Admin dashboard (30s)** — show both of those requests appearing with their reasoning and timestamps.
4. **Architecture & AI walkthrough (60–90s)** — briefly show the decision flow: point at `policyEngine.js` and explain that most decisions never touch the AI, then show `aiService.js` and explain the prompt-injection guardrails in your own words, not by reading the code line by line.
5. **Wrap-up (15s)** — mention the clean `docker-compose up` from a fresh clone, and that the edge case matrix is documented in the README.

Don't script this word-for-word — reviewers can tell, and it reads worse than a slightly rougher but genuine walkthrough.

---

## Final pass before you submit

Go through PRD Section 8's engineering discipline list one more time, now that the whole thing is built, since it's easiest to spot violations in a finished codebase rather than while still writing it:

- [ ] Every file and function maps to something in this PRD — nothing exists "just in case."
- [ ] No repository/factory/strategy pattern anywhere, no provider-swap abstraction for the AI call, no plugin system.
- [ ] Backend has ≤ 6 third-party packages beyond Express; frontend has ≤ 5 beyond React. Count them now, in `package.json`, not from memory.
- [ ] `policyEngine.js` and `aiService.js` are each readable in under ~150 lines.
- [ ] No unused config flags, no commented-out code, no docstring that just restates a function's name, no `try/catch` wrapping code that can't throw.
- [ ] The folder structure still matches PRD Section 4 exactly — nothing got "refactored" into a deeper layout along the way.
- [ ] Exactly one AI call per decision, everywhere in the codebase.

And PRD Section 11's deliverables checklist, literally:

- [ ] Public GitHub repo, all source included.
- [ ] `docker-compose.yml` — `docker-compose up` runs frontend + backend + data from a clean clone.
- [ ] `.env.example` with the DeepSeek key variable documented.
- [ ] `README.md` — setup, env vars, architecture, how the AI integration works, assumptions/trade-offs.
- [ ] Demo video — app running locally, customer flow, admin dashboard, brief architecture + AI walkthrough.

## Definition of done

- A reviewer who has never seen this project can clone it, follow the README, have it running in under 10 minutes, and understand how a refund decision gets made without reading a single line of code — though the code holds up if they do.
- Every box above is checked, not assumed.

## Common traps to avoid

- Don't let the README balloon into a restatement of every file's contents — a reviewer skimming it in 10 minutes needs the *shape* of the system and the reasoning behind the AI integration, not a line-by-line narration.
- Don't leave a stray `console.log` of the AI's raw response or any API key visible on screen during the demo video recording.
- Don't submit with `audit-log.json` full of your own test data from Milestone 5 if you'd rather the reviewer see a clean slate — reset it to `[]` before your final commit if you want their first `docker-compose up` to start empty. Either choice is defensible; just make it on purpose.
