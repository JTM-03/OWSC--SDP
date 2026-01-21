import React, { useState } from 'react';
import { menuItems } from '../../data/mockData';
import './Order.css';
import foodImg from '../../assets/food-platter.png'; // Fallback import

const Order = () => {
    const [activeCategory, setActiveCategory] = useState('All');
    const [cart, setCart] = useState([]);

    // Get unique categories
    const categories = ['All', ...new Set(menuItems.map(item => item.category))];

    // Filter items
    const filteredItems = activeCategory === 'All'
        ? menuItems
        : menuItems.filter(item => item.category === activeCategory);

    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId) => {
        setCart(prev => prev.filter(i => i.id !== itemId));
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
        <div className="order-page">
            {/* Column 1: Categories */}
            <aside className="order-sidebar">
                <h3>Menu</h3>
                <ul className="category-list">
                    {categories.map(cat => (
                        <li
                            key={cat}
                            className={activeCategory === cat ? 'active' : ''}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </li>
                    ))}
                </ul>
            </aside>

            {/* Column 2: Items Grid */}
            <main className="order-grid">
                {filteredItems.map(item => (
                    <div key={item.id} className="menu-item-card">
                        <div className="item-image-wrapper">
                            {/* Use local import if dynamic fails or placeholder */}
                            <img src={foodImg} alt={item.name} className="item-image" />
                            {!item.available && <div className="out-of-stock-overlay">Out of Stock</div>}
                        </div>
                        <div className="item-content">
                            <h4>{item.name}</h4>
                            <p className="item-desc">{item.description || 'Delicate and refined flavors.'}</p>
                            <div className="item-footer">
                                <span className="item-price">\${item.price}</span>
                                <button
                                    className="add-btn"
                                    disabled={!item.available}
                                    onClick={() => addToCart(item)}
                                >
                                    {item.available ? '+' : '×'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </main>

            {/* Column 3: Cart */}
            <aside className="order-cart">
                <div className="cart-card">
                    <h3>Your Order</h3>
                    {cart.length === 0 ? (
                        <p className="empty-cart">Cart is empty</p>
                    ) : (
                        <ul className="cart-items">
                            {cart.map(item => (
                                <li key={item.id} className="cart-item">
                                    <div className="cart-item-info">
                                        <span className="item-qty">{item.quantity}x</span>
                                        <span>{item.name}</span>
                                    </div>
                                    <div className="cart-item-right">
                                        <span>\${item.price * item.quantity}</span>
                                        <button onClick={() => removeFromCart(item.id)} className="remove-btn">×</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="cart-summary">
                        <div className="cart-total">
                            <span>Total</span>
                            <span>\${cartTotal}</span>
                        </div>
                        <button className="checkout-btn" disabled={cart.length === 0}>
                            Place Order
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default Order;
