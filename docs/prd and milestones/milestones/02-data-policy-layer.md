# Milestone 2: Data & Policy Layer

**Goal:** build the flat-JSON data layer — 15 synthetic customer/order records deliberately covering every edge case the PRD grades, a structured `policy.json`, and a small `db.js` helper that everything else in the backend reads and writes through.

This corresponds to PRD Section 9, Step 2, and implements the schema from PRD Section 5.

Assumes Milestone 1 is done: the folder skeleton and Docker wiring already exist.

---

## Ground rules recap

Same conventions as Milestone 1: `camelCase` functions, `kebab-case` files, async I/O only, JSDoc only where the name doesn't already say enough, no speculative abstraction. This milestone in particular is the one most tempting to over-build (an AI assistant will happily suggest a "repository layer" or a validation library) — resist it. `db.js` is a single file with a handful of small functions. That's the whole data layer.

---

## Design decision: how the data is split

The PRD describes one combined schema (`customer_id`, `name`, `email`, `order_id`, `item`, `price`, `purchase_date`, `status`, `order_condition`). Store it as two related files rather than one flat combined list — it avoids repeating a customer's name and email on every order, and it mirrors how you'd actually query "does this order belong to this customer" (the mismatch check in Milestone 3 needs exactly this join).

`backend/data/customers.json` — array of `{ customer_id, name, email }`.
`backend/data/orders.json` — array of `{ order_id, customer_id, item, price, purchase_date, status, order_condition }`, where `status` is `"final_sale"` or `"standard"`, and `order_condition` is `"ok"`, `"damaged"`, or `"incorrect_item"`.

Each order references exactly one customer via `customer_id`. This assessment uses a 1:1 mapping — 15 customers, each with exactly one order — which keeps the mismatch test case simple: to test "order belongs to a different customer," you just submit a valid `order_id` with the wrong `customer_id` at request time. No special seed data is needed for that case, or for "order doesn't exist" — both are constructed by the *request*, not the dataset. Keep that in mind: the dataset only needs to cover variations in the orders themselves (final sale, out of window, over threshold, damaged, incorrect item, boundary dates). Milestone 5 covers the request-time-only cases.

---

## The 15 seed records

All dates below are anchored to **September 24, 2026** — the day this PRD was issued — with a 30-day refund window. Most records sit comfortably inside or outside that window (a handful of days old, or several months old) so the test results don't drift as days pass during the assessment. Two records (#13 and #14) are deliberately placed *on* the window boundary to test that edge precisely; see the note at the end of this section if you're building this more than a few days after September 24.

| # | order_id / customer_id | Name | Item | Price | Purchase date | Status | Condition | What this record tests |
|---|---|---|---|---|---|---|---|---|
| 1 | ORD-1001 / CUST-001 | Alice Mensah | Wireless Earbuds Pro | 89.99 | 2026-09-18 | standard | ok | Plain return, no issue → deterministic **approve** |
| 2 | ORD-1002 / CUST-002 | Ben Okafor | Bluetooth Speaker | 45.00 | 2026-07-10 | standard | ok | Outside the 30-day window → deterministic **deny** |
| 3 | ORD-1003 / CUST-003 | Chidinma Eze | Designer Sunglasses | 120.00 | 2026-09-15 | final_sale | ok | Final sale → deterministic **deny** |
| 4 | ORD-1004 / CUST-004 | David Musa | Leather Wallet | 60.00 | 2026-05-01 | final_sale | ok | Final sale **and** out of window — tests that the final-sale rule is checked first |
| 5 | ORD-1005 / CUST-005 | Efe Ibrahim | 4K Monitor | 620.00 | 2026-09-10 | standard | damaged | Damaged, but over $500 → deterministic **escalate**, AI never called |
| 6 | ORD-1006 / CUST-006 | Funke Adeyemi | Running Shoes | 75.00 | 2026-09-20 | standard | damaged | Damaged, under $500 → genuinely ambiguous, goes to the **AI** |
| 7 | ORD-1007 / CUST-007 | Grace Chukwu | Kitchen Blender | 55.00 | 2026-09-22 | standard | incorrect_item | Incorrect item, under $500 → goes to the **AI** |
| 8 | ORD-1008 / CUST-008 | Hassan Bello | Office Chair | 310.00 | 2026-09-05 | standard | damaged | Damaged, higher amount but still under $500 → goes to the **AI** |
| 9 | ORD-1009 / CUST-009 | Ifeoma Nnamdi | Smartwatch | 199.99 | 2026-09-19 | standard | ok | Plain return → deterministic **approve** |
| 10 | ORD-1010 / CUST-010 | Junaid Suleiman | Laptop Backpack | 40.00 | 2026-09-21 | standard | incorrect_item | Goes to the **AI**; also reused at request time in Milestone 5 with a prompt-injection message |
| 11 | ORD-1011 / CUST-011 | Kelechi Obi | Coffee Maker | 90.00 | 2026-09-23 | standard | incorrect_item | Goes to the **AI** |
| 12 | ORD-1012 / CUST-012 | Lola Adigun | Gaming Mouse | 550.00 | 2026-09-12 | standard | incorrect_item | Over $500 → deterministic **escalate** (second example, different condition than #5) |
| 13 | ORD-1013 / CUST-013 | Mustapha Yusuf | Tablet Stand | 25.00 | 2026-09-24 | standard | ok | Purchased *today* — boundary test at day 0 → deterministic **approve** |
| 14 | ORD-1014 / CUST-014 | Ngozi Eze | Noise Cancelling Headphones | 199.00 | 2026-08-25 | standard | damaged | Purchased exactly 30 days ago — boundary test at the edge of the window (inclusive) → goes to the **AI** |
| 15 | ORD-1015 / CUST-015 | Omar Farouk | Electric Kettle | 999.00 | 2026-06-01 | final_sale | damaged | Final sale, over $500, and damaged all at once — tests that final-sale precedence beats every other rule → deterministic **deny** |

### `backend/data/customers.json`

```json
[
  { "customer_id": "CUST-001", "name": "Alice Mensah", "email": "alice.mensah@example.com" },
  { "customer_id": "CUST-002", "name": "Ben Okafor", "email": "ben.okafor@example.com" },
  { "customer_id": "CUST-003", "name": "Chidinma Eze", "email": "chidinma.eze@example.com" },
  { "customer_id": "CUST-004", "name": "David Musa", "email": "david.musa@example.com" },
  { "customer_id": "CUST-005", "name": "Efe Ibrahim", "email": "efe.ibrahim@example.com" },
  { "customer_id": "CUST-006", "name": "Funke Adeyemi", "email": "funke.adeyemi@example.com" },
  { "customer_id": "CUST-007", "name": "Grace Chukwu", "email": "grace.chukwu@example.com" },
  { "customer_id": "CUST-008", "name": "Hassan Bello", "email": "hassan.bello@example.com" },
  { "customer_id": "CUST-009", "name": "Ifeoma Nnamdi", "email": "ifeoma.nnamdi@example.com" },
  { "customer_id": "CUST-010", "name": "Junaid Suleiman", "email": "junaid.suleiman@example.com" },
  { "customer_id": "CUST-011", "name": "Kelechi Obi", "email": "kelechi.obi@example.com" },
  { "customer_id": "CUST-012", "name": "Lola Adigun", "email": "lola.adigun@example.com" },
  { "customer_id": "CUST-013", "name": "Mustapha Yusuf", "email": "mustapha.yusuf@example.com" },
  { "customer_id": "CUST-014", "name": "Ngozi Eze", "email": "ngozi.eze@example.com" },
  { "customer_id": "CUST-015", "name": "Omar Farouk", "email": "omar.farouk@example.com" }
]
```

### `backend/data/orders.json`

```json
[
  { "order_id": "ORD-1001", "customer_id": "CUST-001", "item": "Wireless Earbuds Pro", "price": 89.99, "purchase_date": "2026-09-18", "status": "standard", "order_condition": "ok" },
  { "order_id": "ORD-1002", "customer_id": "CUST-002", "item": "Bluetooth Speaker", "price": 45.00, "purchase_date": "2026-07-10", "status": "standard", "order_condition": "ok" },
  { "order_id": "ORD-1003", "customer_id": "CUST-003", "item": "Designer Sunglasses", "price": 120.00, "purchase_date": "2026-09-15", "status": "final_sale", "order_condition": "ok" },
  { "order_id": "ORD-1004", "customer_id": "CUST-004", "item": "Leather Wallet", "price": 60.00, "purchase_date": "2026-05-01", "status": "final_sale", "order_condition": "ok" },
  { "order_id": "ORD-1005", "customer_id": "CUST-005", "item": "4K Monitor", "price": 620.00, "purchase_date": "2026-09-10", "status": "standard", "order_condition": "damaged" },
  { "order_id": "ORD-1006", "customer_id": "CUST-006", "item": "Running Shoes", "price": 75.00, "purchase_date": "2026-09-20", "status": "standard", "order_condition": "damaged" },
  { "order_id": "ORD-1007", "customer_id": "CUST-007", "item": "Kitchen Blender", "price": 55.00, "purchase_date": "2026-09-22", "status": "standard", "order_condition": "incorrect_item" },
  { "order_id": "ORD-1008", "customer_id": "CUST-008", "item": "Office Chair", "price": 310.00, "purchase_date": "2026-09-05", "status": "standard", "order_condition": "damaged" },
  { "order_id": "ORD-1009", "customer_id": "CUST-009", "item": "Smartwatch", "price": 199.99, "purchase_date": "2026-09-19", "status": "standard", "order_condition": "ok" },
  { "order_id": "ORD-1010", "customer_id": "CUST-010", "item": "Laptop Backpack", "price": 40.00, "purchase_date": "2026-09-21", "status": "standard", "order_condition": "incorrect_item" },
  { "order_id": "ORD-1011", "customer_id": "CUST-011", "item": "Coffee Maker", "price": 90.00, "purchase_date": "2026-09-23", "status": "standard", "order_condition": "incorrect_item" },
  { "order_id": "ORD-1012", "customer_id": "CUST-012", "item": "Gaming Mouse", "price": 550.00, "purchase_date": "2026-09-12", "status": "standard", "order_condition": "incorrect_item" },
  { "order_id": "ORD-1013", "customer_id": "CUST-013", "item": "Tablet Stand", "price": 25.00, "purchase_date": "2026-09-24", "status": "standard", "order_condition": "ok" },
  { "order_id": "ORD-1014", "customer_id": "CUST-014", "item": "Noise Cancelling Headphones", "price": 199.00, "purchase_date": "2026-08-25", "status": "standard", "order_condition": "damaged" },
  { "order_id": "ORD-1015", "customer_id": "CUST-015", "item": "Electric Kettle", "price": 999.00, "purchase_date": "2026-06-01", "status": "final_sale", "order_condition": "damaged" }
]
```

**If you're building this more than a few days after September 24, 2026**, records #13 and #14 will drift off their intended boundary (day 0 and day 30). Recompute them with:

```js
const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
```

and update `purchase_date` on ORD-1013 and ORD-1014 accordingly. Everything else has enough margin (either a few days old or several months old) that it doesn't need adjusting.

### `backend/data/policy.json`

Exactly as specified in PRD Section 5 — this is the one file the AI never gets to modify or override:

```json
{
  "final_sale_no_refund": true,
  "refund_window_days": 30,
  "human_review_threshold_usd": 500,
  "auto_approve_conditions": ["damaged", "incorrect_item"],
  "escalate_conditions": ["conflicting_order_info", "suspicious_pattern"]
}
```

Note this uses `"damaged"` and `"incorrect_item"` to match the `order_condition` values exactly (the PRD's own example used `damaged_item`; keep the policy file's values consistent with the data schema's `order_condition` enum so the code that checks `policy.auto_approve_conditions.includes(order.order_condition)` in Milestone 3 doesn't need a translation layer between the two).

### `backend/data/audit-log.json`

Starts empty, committed as-is:

```json
[]
```

---

## `backend/db.js`

This is the only file that touches the filesystem. Every route and service goes through it — nothing else in the backend calls `fs` directly.

**Design decisions to follow:**
- Resolve file paths relative to the module's own location (`fileURLToPath(import.meta.url)` + `path.dirname`), not `process.cwd()`. This makes the backend work correctly no matter what directory it's launched from — a small detail, but it's the kind of thing that breaks "works on my machine" demos.
- Every function is `async` and uses `fs/promises`. No synchronous `fs` calls anywhere.
- No caching layer, no in-memory database, no SQLite. At 15 records, re-reading a JSON file on every request costs a fraction of a millisecond — adding a cache here would be solving a problem that doesn't exist, and the PRD explicitly asks you to avoid that instinct (Section 8: "no speculative architecture").
- No locking library for writes. This is a single-process app with low request volume during a take-home review — a full-file overwrite via `writeFile` is more than sufficient.

**Functions to expose:**

```js
// backend/db.js
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');

async function readJson(filename) {
  const raw = await readFile(path.join(dataDir, filename), 'utf-8');
  return JSON.parse(raw);
}

async function writeJson(filename, data) {
  await writeFile(path.join(dataDir, filename), JSON.stringify(data, null, 2));
}

export function readCustomers() {
  return readJson('customers.json');
}

export function readOrders() {
  return readJson('orders.json');
}

export function readPolicy() {
  return readJson('policy.json');
}

export async function getCustomerById(customerId) {
  const customers = await readCustomers();
  return customers.find((c) => c.customer_id === customerId) ?? null;
}

export async function getOrderById(orderId) {
  const orders = await readOrders();
  return orders.find((o) => o.order_id === orderId) ?? null;
}

export async function appendAuditLog(entry) {
  const log = await readJson('audit-log.json');
  const record = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...entry };
  log.push(record);
  await writeJson('audit-log.json', log);
  return record;
}

export async function getAuditLog() {
  return readJson('audit-log.json');
}
```

That's the entire data layer — well under 100 lines, one clear responsibility per function, nothing speculative. `crypto.randomUUID()` is built into Node 20, so audit entries get a stable unique ID without adding a UUID package to the dependency budget.

---

## Security checklist for this milestone

- [ ] No customer-supplied value (`customer_id`, `order_id`, or anything from the request body) is ever used to build a filename or file path. The four JSON filenames are hard-coded constants inside `db.js` — IDs are only ever used to `.find()` inside the already-loaded array. There is no path-traversal surface in this layer at all, by construction.
- [ ] The admin endpoint (built in Milestone 3) will only return the fields the dashboard actually displays — don't casually spread an entire customer object (including email) into a response if the table doesn't show it.

## Performance checklist for this milestone

- [ ] All reads and writes go through `fs/promises`, never the synchronous `fs` API.
- [ ] No caching, no database, no extra dependency added to solve a 15-record read problem that doesn't need solving.

## Definition of done

- `customers.json`, `orders.json`, and `policy.json` exist with the exact data above.
- `audit-log.json` exists as an empty array.
- `db.js` exports the seven functions listed above, is under 100 lines, and is the only file in the backend that imports `fs`.
- You can `node -e "import('./db.js').then(db => db.getOrderById('ORD-1005').then(console.log))"` (adjust the import path) and get back the 4K Monitor record.

## Common traps to avoid

- Don't add a validation library (`zod`, `joi`, `ajv`) for 15 hand-written, already-correct records — that's real request-body validation's job in Milestone 3, not this milestone's.
- Don't merge `customers.json` and `orders.json` into one denormalized file "to keep it simple" — the split is what makes the mismatch check in Milestone 3 trivial to implement correctly.
- Don't let audit log writes race each other by making `appendAuditLog` anything other than a straightforward `await`-in-sequence read-modify-write — no queue, no debounce, no batching. This app doesn't have the concurrency to need it.
