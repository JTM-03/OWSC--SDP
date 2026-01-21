import React, { useState } from 'react';
import './Inventory.css';

const initialInventory = [
    { id: 1, name: 'Wagyu Beef (A5)', quantity: 12, unit: 'kg', reorder: 5, status: 'High' },
    { id: 2, name: 'Truffle Oil', quantity: 2, unit: 'L', reorder: 3, status: 'Low' },
    { id: 3, name: 'Vintage Champagne', quantity: 45, unit: 'bottles', reorder: 10, status: 'High' },
    { id: 4, name: 'Lobster', quantity: 0, unit: 'units', reorder: 8, status: 'Critical' },
    { id: 5, name: 'Gold Leaf Sheets', quantity: 100, unit: 'sheets', reorder: 50, status: 'Medium' },
];

const Inventory = () => {
    const [items] = useState(initialInventory);
    const [search, setSearch] = useState('');

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'High': return 'status-green';
            case 'Medium': return 'status-green';
            case 'Low': return 'status-amber';
            case 'Critical': return 'status-red';
            default: return 'status-gray';
        }
    };

    return (
        <div className="inventory-page">
            <div className="inventory-header">
                <h2>Inventory Management</h2>
                <div className="inventory-actions">
                    <input
                        type="text"
                        placeholder="Search inventory..."
                        className="search-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button className="add-btn">Record New Delivery</button>
                </div>
            </div>

            <div className="inventory-table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Quantity on Hand</th>
                            <th>Reorder Level</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(item => (
                            <tr key={item.id}>
                                <td className="cell-name">{item.name}</td>
                                <td>{item.quantity} {item.unit}</td>
                                <td>{item.reorder} {item.unit}</td>
                                <td>
                                    <span className={`status-badge ${getStatusColor(item.status)}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td>
                                    <button className="icon-action">✏️</button>
                                    <button className="icon-action text-red">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Inventory;
