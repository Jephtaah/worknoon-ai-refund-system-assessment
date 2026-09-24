const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function submitRefundRequest({ order_id, reason, message }) {
  const res = await fetch(`${API_URL}/api/refund-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id, reason, message }),
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
