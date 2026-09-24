import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState('checking...');

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    fetch(`${apiUrl}/api/health`)
      .then((res) => {
        if (!res.ok) throw new Error('Not ok');
        return res.json();
      })
      .then((data) => {
        if (data.status === 'ok') {
          setStatus('ok');
        } else {
          setStatus('unreachable');
        }
      })
      .catch(() => {
        setStatus('unreachable');
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Worknoon AI Refund System</h1>
      <p>Backend status: {status}</p>
    </div>
  );
}

export default App;
