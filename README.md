# Worknoon AI Refund System Assessment

## 1. What this is
An AI-assisted customer support refund eligibility system built for the Worknoon take-home assessment. It automates refund request evaluations using a strict deterministic policy engine combined with DeepSeek AI semantic reasoning for ambiguous claims, backed by robust prompt-injection guardrails. The stack consists of an **Express** backend, **React** frontend, flat **JSON** data storage, **DeepSeek AI**, and **Docker Compose**.

---

## 2. Setup
Clone the repository and start the entire stack with Docker Compose:

```bash
git clone <repo-url>
cd worknoon-refund-system
cp .env.example .env
# Edit .env and add your DEEPSEEK_API_KEY
docker-compose up --build
```

- **Customer & Admin App:** `http://localhost:5173`
- **Backend Health Check:** `http://localhost:4000/api/health`

---

## 3. Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | Yes | — | Auth for the DeepSeek API |
| `DEEPSEEK_BASE_URL` | No | `https://api.deepseek.com` | DeepSeek's OpenAI-compatible endpoint |
| `DEEPSEEK_MODEL` | No | `deepseek-chat` | Model used for ambiguous-case reasoning |
| `PORT` | No | `4000` | Backend port |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Locks backend CORS to this origin |
| `VITE_API_URL` | No | `http://localhost:4000` | Backend URL baked into the frontend at build time |

---

## 4. Architecture

```text
worknoon-refund-system/
├── backend/
│   ├── src/
│   │   ├── routes/         # Express routes (refunds, admin)
│   │   ├── services/       # policyEngine.js & aiService.js
│   │   ├── db.js           # Flat JSON data access
│   │   └── server.js       # Express server entry point
│   └── data/               # customers.json, orders.json, policy.json, audit-log.json
├── frontend/
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── pages/          # CustomerRequest.jsx & AdminDashboard.jsx
│   │   └── App.jsx         # Router & layout
└── docker-compose.yml
```

- **Frontend** (React) — Two views (Customer Request & Admin Dashboard), talks exclusively to its own backend API.
- **Backend** (Express) — Two endpoints (`/api/refund-request`, `/api/admin/...`), owns all validation, policy evaluation, and audit logging.
- **Data** (Flat JSON) — In-memory / file-based persistence for customers, orders, policies, and audit logs; no external database required.
- **AI** (DeepSeek) — Consulted strictly for genuinely ambiguous cases (e.g. damaged or incorrect item claims within policy parameters), never for hard policy rules or overrides.

---

## 5. How the AI integration works

### Decision Flow
Every refund request passes through a rigorous, ordered decision pipeline in `policyEngine.js`:
1. **Order Lookup & Ownership Verification** — Verifies order exists and belongs to the requesting customer (`escalated` on failure).
2. **Prompt Injection / Heuristic Guardrails** — Scans message for instruction override attempts, persona switches, or system prompt extraction (`escalated` deterministically).
3. **Final-Sale Policy** — Checks if order status is `final_sale` and policy disables refunds (`denied` deterministically).
4. **Refund Window** — Checks if purchase date is within `refund_window_days` (default 30 days) (`denied` deterministically).
5. **Human Review Threshold** — Checks if item price exceeds `human_review_threshold_usd` ($500) (`escalated` deterministically).
6. **Order Condition / Ambiguity Check** — If condition is `ok` (standard return), auto-approved deterministically. If condition is `damaged` or `incorrect_item`, the claim is genuinely ambiguous and passed to the AI.
7. **AI Reasoning** — DeepSeek evaluates the credibility and clarity of the customer's explanation against the order facts, returning structured JSON (`approved`, `denied`, or `escalated`).
8. **Post-AI Re-Validation** — Re-checks amount thresholds and validates the AI response schema to ensure safety.
9. **Audit Logging** — Appends complete decision metadata, policy checks, and timestamps to `audit-log.json`.

### Design Principles
- **Most requests never reach the AI:** Hard policy rules (final sale, expired window, high-value thresholds, injections, invalid orders) short-circuit deterministically.
- **Prompt-Injection Defense:** Customer messages are passed strictly as delimited data inside the user prompt, never concatenated into system instructions. The system prompt explicitly forbids following instructions inside messages.
- **The Core Guarantee:** **The AI never has the authority to override policy — it can only be trusted within the boundaries the deterministic layer has already confirmed, and even then its output is re-validated post-AI.**

---

## 6. Testing & Edge Cases
Edge-case testing and injection resistance have been verified across all 15 test cases specified in PRD Section 10 and Milestone 5 (15/15 passing):
- **Injections & Override Attempts:** Catch instruction overrides ("Ignore policy", "I'm a VIP", system prompt extraction) via heuristic guardrails (`escalated`).
- **Data Validation & Authorization:** Handle non-existent orders, customer mismatches, and missing fields (`escalated` / `400`).
- **Policy Enforcement:** Enforce final-sale precedence and 30-day refund windows (`denied`).
- **Thresholds & AI Routing:** Auto-approve valid standard returns (`ok`), escalate high-value orders over $500, and delegate credible damage/incorrect claims to DeepSeek AI.

---

## 7. Assumptions & Trade-offs
- **Authentication:** Order ID + Customer ID is treated as sufficient identification without complex user sessions, by design (PRD Section 2).
- **Auto-Approval:** Plain returns with `order_condition: "ok"` and no policy violations are auto-approved deterministically as permitted by policy rules.
- **Defense in Depth:** The $500 threshold check runs both pre-AI and post-AI to guarantee high-value orders are always escalated.
- **Audit Log Persistence:** `audit-log.json` resets on container rebuild due to flat-file storage without persistent volumes—acceptable for single-session assessment.
- **No Automated Test Suite:** Automated testing frameworks are out of scope per PRD Section 2; verification is fully documented via manual test matrix results.
