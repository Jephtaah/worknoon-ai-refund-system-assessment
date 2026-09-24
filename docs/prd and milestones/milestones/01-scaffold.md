# Milestone 1: Scaffold

**Goal:** stand up the repo skeleton, wire Express, React, and Docker together, and prove the whole chain works end to end with a trivial hello-world call — *before* any real logic exists. Everything you build in Milestones 2–6 slots into this skeleton without restructuring it.

This corresponds to PRD Section 9, Step 1, and locks in the choices from PRD Sections 3 and 4.

---

## Ground rules (these apply to every milestone, not just this one)

Set these conventions now, in Milestone 1, so every file written afterwards — by you or by an AI coding assistant — follows the same standard without having to be told each time.

**Naming**
- Files: `kebab-case.js`, except React components, which are `PascalCase.jsx`.
- Variables and functions: `camelCase`.
- Constants and environment variable names: `SCREAMING_SNAKE_CASE`.
- One responsibility per file. Stick to the folder layout in PRD Section 4 exactly — no extra top-level folders like `services/`, `repositories/`, `interfaces/`, or `utils/` beyond what's already there.

**Module system**
- Backend and frontend both use native ES modules (`import`/`export`), not `require`. Set `"type": "module"` in `backend/package.json`.

**Error handling**
- Every JSON error response has the same shape: `{ "error": { "message": "..." } }`.
- Only wrap code in `try/catch` if it can genuinely throw (JSON parsing, network calls, file I/O). Don't wrap plain synchronous logic "just in case" — that's exactly the kind of decorative code the PRD tells you to reject (Section 8).
- Never send a raw stack trace, internal error object, or file path back to the client. Log the detail server-side; return a short, generic message to the client.

**Comments**
- Add a JSDoc comment above an exported function only when its behavior isn't obvious from its name and signature. Don't write a docstring that just restates the function name.
- No commented-out code, no unused feature flags, no `try/catch` around code that can't throw.

**Security baseline**
- Secrets (the DeepSeek API key) live only in `.env`, read through `process.env`, never hard-coded and never logged.
- CORS is locked to the frontend's exact origin — never `*`.
- Every request body is validated before it reaches any business logic.

**Performance baseline**
- All file and network I/O is `async`/`await`. No blocking synchronous calls in request handlers.
- At most one AI call per refund decision (you'll see why this matters starting in Milestone 3).

**Dependency budget (from PRD Section 8)**
- Backend: at most 6 third-party packages beyond Express.
- Frontend: at most 5 third-party packages beyond React.

Keep a mental running total as you add packages in later milestones — it's easy to blow this budget by accident if an AI assistant suggests "just add this one small helper library."

---

## Step-by-step

### 1. Create the folder skeleton

Create exactly this structure (from PRD Section 4) — empty files are fine for now, you'll fill them in over the next milestones:

```
worknoon-refund-system/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   │   ├── refunds.js
│   │   │   └── admin.js
│   │   ├── services/
│   │   │   ├── policyEngine.js
│   │   │   └── aiService.js
│   │   └── db.js
│   ├── data/
│   │   ├── customers.json
│   │   ├── orders.json
│   │   ├── policy.json
│   │   └── audit-log.json
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── CustomerRequest.jsx
│   │   │   └── AdminDashboard.jsx
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── App.jsx
│   │   └── App.css
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

### 2. Initialize the backend

```
cd backend
npm init -y
npm install express cors dotenv openai
npm install --save-dev nodemon
```

That's 4 runtime dependencies beyond Express (`cors`, `dotenv`, `openai`, plus Express itself doesn't count against the budget) — well inside the 6-package limit, leaving room in case Milestone 3 needs anything small.

Edit `backend/package.json`:
- Set `"type": "module"`.
- Add scripts:
  ```json
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
  ```

### 3. Write a hello-world `server.js`

`backend/src/server.js` should, at this stage, do only this:

- Load environment variables with `dotenv/config`.
- Create an Express app.
- Add `express.json()` middleware.
- Add `cors()` middleware, restricted to `process.env.FRONTEND_ORIGIN` (fall back to `http://localhost:5173` if unset).
- Add one route: `GET /api/health` → responds `200` with `{ "status": "ok" }`.
- Listen on `process.env.PORT` (fall back to `4000`).
- Log a single line on startup: `Backend listening on port ${port}`.

Don't add the real routers (`routes/refunds.js`, `routes/admin.js`) yet — leave them as empty files with a one-line placeholder export. You'll fill them in Milestone 3. Wiring them in now with no logic behind them is exactly the kind of dead code the PRD warns against.

**Why CORS is locked to one origin, not `*`:** this backend will eventually handle a form field with an email address and order details. There's no reason for any origin other than your own frontend to be allowed to call it. Setting this correctly now means you don't have to remember to tighten it later.

### 4. Scaffold the frontend with Vite

```
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install react-router-dom
```

`react-router-dom` is your one frontend dependency beyond React for this milestone — you have room for up to 4 more later if you genuinely need them, but you won't.

### 5. Wire a hello-world `App.jsx`

For this milestone only, `App.jsx` doesn't need routing or pages yet — just prove the frontend can reach the backend:

- On mount, `fetch` `${import.meta.env.VITE_API_URL}/api/health`.
- Render "Backend status: ok" on success, or "Backend unreachable" on failure.
- Read the API base URL from `import.meta.env.VITE_API_URL`, never hard-code `http://localhost:4000` inline — you'll need this to be configurable when the app runs inside Docker.

Create `frontend/.env` (local dev only, not committed) with:
```
VITE_API_URL=http://localhost:4000
```

You'll replace this file entirely with the real customer form and admin dashboard in Milestone 4. This step exists purely to prove the wiring works.

### 6. Dockerize the backend

`backend/Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
COPY data ./data
EXPOSE 4000
CMD ["node", "src/server.js"]
```

Notes:
- `--omit=dev` keeps `nodemon` out of the image — you don't need hot-reload in the container the reviewer runs.
- Copying `data/` into the image means the seed JSON ships with the container, so `docker-compose up` on a clean clone works with zero manual setup steps, exactly as the PRD's grading rubric expects. The trade-off (worth stating in the README in Milestone 6) is that `audit-log.json` resets on every image rebuild — acceptable for this assessment, since there's deliberately no database.

### 7. Dockerize the frontend

`frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
```

**This `ARG`/`ENV` pair before `npm run build` is not optional boilerplate — it's the whole reason the frontend can find the backend at all.** Vite inlines `import.meta.env.VITE_*` variables into the JavaScript bundle *at build time*. If you set `VITE_API_URL` only as a runtime environment variable on the container, it will have no effect — the value baked into the bundle during `npm run build` is the one that ships to the browser. Get this wrong and the frontend will silently try to call the API URL from whatever `.env` file happened to exist when the image was built, not the one in `docker-compose.yml`.

`npm run preview` serves the production build Vite just created. This avoids adding a separate static file server (nginx, `serve`, etc.) as a dependency — one less thing in the dependency budget, and one less moving part for the reviewer to reason about.

### 8. Write `docker-compose.yml`

At the repo root:

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    env_file:
      - .env
    environment:
      - PORT=4000
      - FRONTEND_ORIGIN=http://localhost:5173

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: http://localhost:4000
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

Two important details:
- `VITE_API_URL` is set to `http://localhost:4000`, not a Docker service name like `http://backend:4000`. That's deliberate: the frontend's JavaScript runs in the *reviewer's browser*, not inside the Docker network, so it needs an address the browser's machine can actually resolve. `http://backend:4000` would only work for server-to-server calls inside the Compose network, which this app doesn't need.
- `env_file: .env` is how the backend receives `DEEPSEEK_API_KEY` without it ever being written into `docker-compose.yml` itself or committed to source control.

### 9. Write `.env.example` and `.gitignore`

`.env.example` (repo root, committed):
```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

`.gitignore` (repo root):
```
node_modules/
dist/
.env
*.log
```

Note that `backend/data/audit-log.json` is **not** gitignored. Commit it as an empty array `[]` — it's small, it's part of what makes the app runnable out of the box, and a reviewer opening the admin dashboard on first run should see "no requests yet" rather than a missing-file error.

---

## Verify this milestone works

1. `cp .env.example .env` and fill in a real `DEEPSEEK_API_KEY` (not needed yet for this milestone, but get the file in place now).
2. From the repo root: `docker-compose up --build`.
3. Visit `http://localhost:5173` — you should see "Backend status: ok".
4. `curl http://localhost:4000/api/health` — should return `{"status":"ok"}`.
5. Stop the stack, delete `node_modules` and any dangling containers, and run `docker-compose up --build` again from a completely clean state to confirm there are no hidden manual steps. This clean-clone test is explicitly graded (PRD Section 1 and Section 13) — it's worth doing now, not just at the end.

## Security checklist for this milestone

- [ ] `.env` is in `.gitignore` and was never committed.
- [ ] CORS on the backend is restricted to `FRONTEND_ORIGIN`, not `*`.
- [ ] No secret or API key appears anywhere in frontend code or the frontend Docker image.

## Performance checklist for this milestone

- [ ] The frontend is served from a production build (`npm run build` + `npm run preview`), not the Vite dev server, inside Docker.
- [ ] The backend has no synchronous, blocking calls in `server.js`.

## Definition of done

- `docker-compose up --build` from a clean clone brings up both services with one command and no manual steps.
- The frontend successfully calls the backend and displays its health status.
- The folder structure matches PRD Section 4 exactly, with placeholder files only where later milestones will add logic.
- Nothing in this milestone does more than prove the wiring works — no real business logic yet. That's intentional.

## Common traps to avoid

- Don't let an AI assistant "helpfully" add authentication, a database, or a state-management library at this stage — all explicitly out of scope per PRD Section 2.
- Don't hard-code `http://localhost:4000` inside `App.jsx` — always go through `VITE_API_URL`.
- Don't reach for nginx, `serve`, or any static-file-server package for the frontend container — `vite preview` already does this for free.
