import { useEffect, useState } from 'react';
import { fetchAdminRequests } from '../api/client.js';

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | done | error
  const [errorMessage, setErrorMessage] = useState('');

  async function fetchData() {
    try {
      const data = await fetchAdminRequests();
      setRequests(data);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  }

  async function handleRefresh() {
    setStatus('loading');
    await fetchData();
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <section>
      <h1>Refund requests</h1>
      <button onClick={handleRefresh} disabled={status === 'loading'}>Refresh</button>

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
