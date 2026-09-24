# Milestone 4: Frontend

**Goal:** build the two working views the PRD asks for — a customer-facing refund request form, and an admin dashboard listing past decisions — talking to the backend you finished in Milestone 3.

This corresponds to PRD Section 9, Step 4, and implements PRD Section 7.

Assumes Milestones 1–3 are done: the backend's two endpoints work, and the hello-world `App.jsx` from Milestone 1 is ready to be replaced with the real app.

---

## Ground rules recap

Same conventions as before: function components with hooks only, no class components, no state-management library (`useState`/`useEffect` is genuinely enough for two views), `PascalCase.jsx` for components, `camelCase.js` everywhere else. No pagination, search, filtering, sorting, theming, or responsive polish — all explicitly out of scope per PRD Section 2. Minimal styling, function over polish — don't let an AI assistant push you toward a design system or a component library for a two-page assessment app.

---

## `frontend/src/api/client.js`

This is the *only* file in the frontend that knows the backend's URL or makes a `fetch` call. Both pages import from here rather than calling `fetch` themselves — one seam, one place to change if the API contract ever shifts.

```js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function submitRefundRequest({ customer_id, order_id, message }) {
  const res = await fetch(`${API_URL}/api/refund-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_id, order_id, message }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || 'Something went wrong.');
  return body;
}

export async function fetchAdminRequests() {
  const res = await fetch(`${API_URL}/api/admin/requests`);
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || 'Could not load requests.');
  return body.requests;
}
```

**Security note, and it's worth being explicit about this:** the frontend only ever talks to *this* backend, never to DeepSeek directly. There is no DeepSeek key anywhere in frontend code, in `.env`, in the frontend Docker image, or in any network request the browser makes. If you find yourself adding `VITE_DEEPSEEK_API_KEY` to anything, stop — that would ship your API key to every visitor's browser dev tools. The backend is the only thing that ever calls DeepSeek, which is exactly why `aiService.js` lives on the server side in Milestone 3.

---

## `frontend/src/App.jsx`

Replace the Milestone 1 hello-world version with routing between the two real pages:

```jsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import CustomerRequest from './pages/CustomerRequest.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <NavLink to="/" end>Request a refund</NavLink>
        <NavLink to="/admin">Admin dashboard</NavLink>
      </nav>
      <main className="container">
        <Routes>
          <Route path="/" element={<CustomerRequest />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
```

---

## `frontend/src/pages/CustomerRequest.jsx`

Three fields — `customer_id`, `order_id`, and a `message` textarea — matching exactly what `POST /api/refund-request` expects. On submit, show the result: a color-coded decision badge, the plain-language reasoning, and (since it's already there in the response and genuinely useful) the list of policy checks that were run.

Behavior to get right:
- Disable the submit button while a request is in flight, so a slow AI call can't be double-submitted.
- Trim whitespace from inputs before sending.
- Show a friendly error message on failure (network error, validation error) — never show a raw error object or stack trace.
- Clear or keep the form after a successful submission is your call; either is fine, just don't leave the UI in an ambiguous "did that work?" state.

```jsx
import { useState } from 'react';
import { submitRefundRequest } from '../api/client.js';

const DECISION_LABEL = { approved: 'Approved', denied: 'Denied', escalated: 'Escalated for review' };

export default function CustomerRequest() {
  const [customerId, setCustomerId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');
    try {
      const response = await submitRefundRequest({
        customer_id: customerId.trim(),
        order_id: orderId.trim(),
        message: message.trim(),
      });
      setResult(response);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  }

  return (
    <section>
      <h1>Request a refund</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="customerId">Customer ID</label>
        <input id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required />

        <label htmlFor="orderId">Order ID</label>
        <input id="orderId" value={orderId} onChange={(e) => setOrderId(e.target.value)} required />

        <label htmlFor="message">What happened?</label>
        <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} />

        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Submitting…' : 'Submit request'}
        </button>
      </form>

      <div aria-live="polite">
        {status === 'error' && <p className="error">{errorMessage}</p>}
        {status === 'done' && result && (
          <div className={`result badge-${result.decision}`}>
            <h2>{DECISION_LABEL[result.decision]}</h2>
            <p>{result.reasoning}</p>
            <ul>
              {result.policy_checks.map((check) => (
                <li key={check.rule}>{check.rule}: {check.result}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
```

Note there's no `dangerouslySetInnerHTML` anywhere here, and there shouldn't be — `result.reasoning` comes from either your own code or the AI, and React already escapes it safely as plain text when rendered with `{result.reasoning}`. Don't let an assistant "helpfully" add raw HTML rendering for this field; there's no reason to and it would open the door to injected markup.

---

## `frontend/src/pages/AdminDashboard.jsx`

A table of past decisions: customer, order, decision, reasoning, source (deterministic vs. AI), and timestamp. Fetch on mount; a manual refresh button is a reasonable, small addition (not the same thing as pagination/search/sort, which stay out of scope).

```jsx
import { useEffect, useState } from 'react';
import { fetchAdminRequests } from '../api/client.js';

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | done | error
  const [errorMessage, setErrorMessage] = useState('');

  async function load() {
    setStatus('loading');
    try {
      const data = await fetchAdminRequests();
      setRequests(data);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section>
      <h1>Refund requests</h1>
      <button onClick={load} disabled={status === 'loading'}>Refresh</button>

      {status === 'error' && <p className="error">{errorMessage}</p>}
      {status === 'done' && requests.length === 0 && <p>No requests yet.</p>}
      {status === 'done' && requests.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Order</th>
              <th>Decision</th>
              <th>Reasoning</th>
              <th>Source</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.customer_id}</td>
                <td>{r.order_id}</td>
                <td><span className={`badge-${r.decision}`}>{r.decision}</span></td>
                <td>{r.reasoning}</td>
                <td>{r.source}</td>
                <td>{new Date(r.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
```

---

## `frontend/src/App.css`

Keep this genuinely small — a readable font stack, a max-width container, and three status colors reused by both pages via the `badge-<decision>` class names above:

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  margin: 0;
  color: #1a1a1a;
  background: #fafafa;
}

.nav {
  display: flex;
  gap: 1.5rem;
  padding: 1rem 2rem;
  background: #1a1a1a;
}
.nav a { color: #fff; text-decoration: none; }
.nav a.active { text-decoration: underline; }

.container {
  max-width: 720px;
  margin: 2rem auto;
  padding: 0 1rem;
}

form { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
input, textarea, button { font: inherit; padding: 0.5rem; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: 0.6; }

table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #ddd; }

.error { color: #b00020; }

.badge-approved { background: #d4edda; color: #155724; padding: 0.15rem 0.5rem; border-radius: 4px; }
.badge-denied { background: #f8d7da; color: #721c24; padding: 0.15rem 0.5rem; border-radius: 4px; }
.badge-escalated { background: #fff3cd; color: #856404; padding: 0.15rem 0.5rem; border-radius: 4px; }
```

---

## Security checklist for this milestone

- [ ] No API key, secret, or DeepSeek credential exists anywhere in the frontend source, build output, or Docker image.
- [ ] Every piece of user- or AI-originated text (`reasoning`, `message`, etc.) is rendered through normal JSX text interpolation — no `dangerouslySetInnerHTML` anywhere in the app.
- [ ] Errors shown to the user are the friendly `err.message` from `client.js`, never a raw response body or stack trace.

## Performance checklist for this milestone

- [ ] The admin dashboard fetches once on mount (`useEffect` with an empty dependency array), not on every render.
- [ ] The submit button is disabled during a pending request, preventing accidental duplicate submissions (and duplicate AI calls) from a slow response.

## Definition of done

- Submitting a valid customer ID, order ID, and message on the customer page produces a visible decision and reasoning, matching what the backend actually returned.
- The admin dashboard lists every request made so far, newest first, with decision, reasoning, source, and timestamp.
- Both pages handle the loading, empty, and error states visibly — no blank screen while waiting, no silent failure.
- No console errors in the browser dev tools during normal use.

## Common traps to avoid

- Don't add Redux, Zustand, or React Query for two pages and three pieces of state — `useState`/`useEffect` is the right amount of tooling here.
- Don't add a CSS framework or component library — it would eat most of the frontend's dependency budget for a benefit the PRD explicitly says not to chase (Section 7: "minimal styling, function over polish").
- Don't build the admin table to accept a search box or column sort "since it's easy to add" — it's explicitly out of scope, and unused UI controls read as dead UI to a reviewer, which the rubric penalizes directly.
