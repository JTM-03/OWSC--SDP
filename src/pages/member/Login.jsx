import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const MemberLogin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        // Simulate login for now
        console.log('Logging in with:', email);
        navigate('/member/dashboard');
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1 className="login-logo">Lumina</h1>
                <p className="login-subtitle">Member Access Portal</p>

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="form-group">
                        <input
                            type="email"
                            className="form-input"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="login-btn">
                        Enter
                    </button>
                </form>

                <div className="register-link">
                    <span>Not a member?</span>
                    <a href="#" onClick={(e) => e.preventDefault()}>Request Access</a>
                </div>
            </div>
        </div>
    );
};

export default MemberLogin;
