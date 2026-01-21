import React from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
    return (
        <div className="admin-dashboard">
            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <span className="kpi-label">Today's Sales</span>
                    <h3 className="kpi-value">\${4.2}k</h3>
                    <span className="kpi-trend positive">+12% vs last week</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">Active Bookings</span>
                    <h3 className="kpi-value">8</h3>
                    <span className="kpi-trend neutral">4 tables remaining</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">Low Stock Items</span>
                    <h3 className="kpi-value warning">3</h3>
                    <span className="kpi-trend negative">Urgent reorder needed</span>
                </div>
            </div>

            <div className="dashboard-row-2">
                {/* Revenue Chart (CSS Implementation) */}
                <div className="chart-card">
                    <h3>Weekly Revenue</h3>
                    <div className="bar-chart">
                        <div className="bar-group">
                            <div className="bar" style={{ height: '60%' }}></div>
                            <span className="bar-label">Mon</span>
                        </div>
                        <div className="bar-group">
                            <div className="bar" style={{ height: '45%' }}></div>
                            <span className="bar-label">Tue</span>
                        </div>
                        <div className="bar-group">
                            <div className="bar" style={{ height: '75%' }}></div>
                            <span className="bar-label">Wed</span>
                        </div>
                        <div className="bar-group">
                            <div className="bar" style={{ height: '50%' }}></div>
                            <span className="bar-label">Thu</span>
                        </div>
                        <div className="bar-group">
                            <div className="bar" style={{ height: '90%' }}></div>
                            <span className="bar-label">Fri</span>
                        </div>
                        <div className="bar-group">
                            <div className="bar" style={{ height: '95%' }}></div>
                            <span className="bar-label">Sat</span>
                        </div>
                        <div className="bar-group">
                            <div className="bar" style={{ height: '80%' }}></div>
                            <span className="bar-label">Sun</span>
                        </div>
                    </div>
                </div>

                {/* Approval List */}
                <div className="approvals-card">
                    <h3>Pending Member Approvals</h3>
                    <ul className="approval-list">
                        <li className="approval-item">
                            <div className="applicant-info">
                                <strong>James Sterling</strong>
                                <span>Applied 2 hours ago</span>
                            </div>
                            <div className="applicant-actions">
                                <button className="btn-approve">Approve</button>
                                <button className="btn-reject">Decline</button>
                            </div>
                        </li>
                        <li className="approval-item">
                            <div className="applicant-info">
                                <strong>Sofia Valli</strong>
                                <span>Applied 5 hours ago</span>
                            </div>
                            <div className="applicant-actions">
                                <button className="btn-approve">Approve</button>
                                <button className="btn-reject">Decline</button>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
