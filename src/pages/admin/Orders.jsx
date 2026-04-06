import React, { useState } from 'react';
import './Orders.css';

const initialOrders = [
    { id: 'ORD-101', member: 'Alexander H.', items: ['Wagyu Beef Carpaccio', 'Gold Leaf Martini'], status: 'New Orders', time: '10 mins ago' },
    { id: 'ORD-102', member: 'Sarah M.', items: ['Lobster Thermidor'], status: 'Preparing', time: '25 mins ago' },
    { id: 'ORD-103', member: 'James B.', items: ['Truffle Risotto', 'Cabernet Sauvignon'], status: 'Ready', time: '40 mins ago' },
    { id: 'ORD-104', member: 'Emma W.', items: ['Oysters Rockefeller', 'Champagne'], status: 'New Orders', time: '5 mins ago' },
];

const COLUMNS = ['New Orders', 'Preparing', 'Ready'];

const Orders = () => {
    const [orders, setOrders] = useState(initialOrders);
    const [draggedOrder, setDraggedOrder] = useState(null);

    const handleDragStart = (e, order) => {
        setDraggedOrder(order);
        e.dataTransfer.effectAllowed = "move";
        // Transparent drag image or default
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e, status) => {
        e.preventDefault();
        if (draggedOrder && draggedOrder.status !== status) {
            setOrders(prev => prev.map(o =>
                o.id === draggedOrder.id ? { ...o, status: status } : o
            ));
        }
        setDraggedOrder(null);
    };

    return (
        <div className="orders-page">
            <div className="kanban-header">
                <h2>Live Kitchen Orders</h2>
                <button className="refresh-btn">Refresh Board</button>
            </div>

            <div className="kanban-board">
                {COLUMNS.map(columnId => (
                    <div
                        key={columnId}
                        className="kanban-column"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, columnId)}
                    >
                        <div className="column-header">
                            <h3>{columnId}</h3>
                            <span className="count-badge">
                                {orders.filter(o => o.status === columnId).length}
                            </span>
                        </div>

                        <div className="column-content">
                            {orders
                                .filter(o => o.status === columnId)
                                .map(order => (
                                    <div
                                        key={order.id}
                                        className="kanban-card"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, order)}
                                    >
                                        <div className="card-header">
                                            <span className="order-id">{order.id}</span>
                                            <span className="order-time">{order.time}</span>
                                        </div>
                                        <h4 className="member-name">{order.member}</h4>
                                        <ul className="order-items-list">
                                            {order.items.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                        <div className="card-actions">
                                            {/* Simple move buttons for accessibility/touch */}
                                            {columnId !== 'New Orders' && (
                                                <button onClick={() => setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: COLUMNS[COLUMNS.indexOf(columnId) - 1] } : o))}>←</button>
                                            )}
                                            {columnId !== 'Ready' && (
                                                <button onClick={() => setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: COLUMNS[COLUMNS.indexOf(columnId) + 1] } : o))}>→</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Orders;
