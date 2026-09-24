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
