import React from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
    return (
        <div className="dashboard">
            <section className="dashboard-header">
                <h1>Welcome back, Alexander!</h1>
                <p>Ready to experience luxury tonight?</p>
            </section>

            <section className="dashboard-quick-actions">
                <Link to="/member/booking" className="action-card">
                    <div className="action-icon">📅</div>
                    <h3>Book a Venue</h3>
                    <p>Reserve your private lounge or table.</p>
                </Link>
                <Link to="/member/order" className="action-card">
                    <div className="action-icon">🍸</div>
                    <h3>Order Food & Drinks</h3>
                    <p>Premium dining delivered to your table.</p>
                </Link>
            </section>

            <div className="dashboard-grid">
                <section className="dashboard-section upcoming-bookings">
                    <h2>Upcoming Bookings</h2>
                    <div className="info-card empty-state">
                        <p>No upcoming bookings found.</p>
                        <Link to="/member/booking" className="text-gold">Make a reservation</Link>
                    </div>
                </section>

                <section className="dashboard-section recent-promotions">
                    <h2>Exclusive Offers</h2>
                    <div className="promo-card">
                        <div className="promo-tag">New</div>
                        <h3>Jazz Night Special</h3>
                        <p>50% off on all signature cocktails this Friday.</p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
