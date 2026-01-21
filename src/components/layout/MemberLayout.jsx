import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import './MemberLayout.css';

const MemberLayout = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        // Clear auth logic here
        navigate('/member/login');
    };

    return (
        <div className="member-layout">
            <header className="member-header">
                <div className="container header-container">
                    <div className="brand-logo">
                        <Link to="/member/dashboard">Lumina</Link>
                    </div>
                    <nav className="main-nav">
                        <Link to="/member/dashboard" className="nav-link">Dashboard</Link>
                        <Link to="/member/booking" className="nav-link">Book Venue</Link>
                        <Link to="/member/order" className="nav-link">Order Food</Link>
                    </nav>
                    <div className="user-actions">
                        <span className="user-greeting">Hello, Guest</span>
                        <button className="logout-btn" onClick={handleLogout}>Logout</button>
                    </div>
                </div>
            </header>
            <main className="member-content">
                <div className="container">
                    <Outlet />
                </div>
            </main>
            <footer className="member-footer">
                <p>&copy; 2026 Lumina Luxury Venues</p>
            </footer>
        </div>
    );
};

export default MemberLayout;
