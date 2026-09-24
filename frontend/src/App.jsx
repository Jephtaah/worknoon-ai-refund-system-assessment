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
