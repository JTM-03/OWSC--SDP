import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './AdminLayout.css';

const AdminLayout = () => {
    const location = useLocation();

    const isActive = (path) => location.pathname.includes(path);

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="sidebar-brand">
                    <h2>Lumina<span>Admin</span></h2>
                </div>
                <nav className="sidebar-nav">
                    <Link to="/admin/dashboard" className={isActive('dashboard') ? 'active' : ''}>
                        Dashboard
                    </Link>
                    <Link to="/admin/orders" className={isActive('orders') ? 'active' : ''}>
                        Live Orders
                    </Link>
                    <Link to="/admin/inventory" className={isActive('inventory') ? 'active' : ''}>
                        Inventory
                    </Link>
                    <Link to="/admin/members" className={isActive('members') ? 'active' : ''}>
                        Members
                    </Link>
                </nav>
                <div className="sidebar-footer">
                    <span>Logged as Manager</span>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <h3>Overview</h3>
                    <div className="admin-header-actions">
                        <button className="icon-btn">🔔</button>
                        <button className="icon-btn">⚙️</button>
                    </div>
                </header>
                <div className="admin-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
