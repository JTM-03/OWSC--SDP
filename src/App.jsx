import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// Placeholder Pages - We will create these next
import MemberLogin from './pages/member/Login';

import MemberLayout from './components/layout/MemberLayout';
import MemberDashboard from './pages/member/Dashboard';
import Booking from './pages/member/Booking';
import Order from './pages/member/Order';

// Login Page is already imported as MemberLogin
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import Orders from './pages/admin/Orders';
import Inventory from './pages/admin/Inventory';
const LandingPage = () => <div className="landing" style={{ padding: '50px', textAlign: 'center' }}>
  <h1 style={{ fontSize: '3rem', fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>Lumina Venue</h1>
  <div style={{ marginTop: '20px' }}>
    <a href="/member/login" style={{ marginRight: '20px', padding: '10px 20px', background: 'var(--color-primary)', color: '#fff', borderRadius: '4px' }}>Member Login</a>
    <a href="/admin" style={{ padding: '10px 20px', background: 'var(--color-secondary)', color: 'var(--color-primary)', borderRadius: '4px', fontWeight: 'bold' }}>Staff Login</a>
  </div>
</div>;

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/member/login" element={<MemberLogin />} />
          <Route path="/member" element={<MemberLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<MemberDashboard />} />
            <Route path="booking" element={<Booking />} />
            <Route path="order" element={<Order />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="inventory" element={<Inventory />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
