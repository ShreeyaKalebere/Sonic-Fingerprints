import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.fields) {
          setFieldErrors(data.error.fields);
        } else {
          setGeneralError(data.error?.message || 'Login failed. Please check your credentials.');
        }
        setLoading(false);
        return;
      }

      // Success: Save in AuthContext in-memory
      login(data.token, data.user);
    } catch (err) {
      setGeneralError(`Network connection error: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '75vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-md)'
    }}>
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: 'var(--space-xl) var(--space-lg)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Header Branding with new logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          <img
            src="/sonic-fingerprint-icon.svg"
            alt="Sonic Fingerprint Logo"
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto var(--space-md) auto',
              display: 'block'
            }}
          />
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            letterSpacing: '0.5px'
          }}>
            SONIC FINGERPRINT
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Acoustic Intelligence Platform
          </p>
        </div>

        {generalError && (
          <div className="toast-box toast-error" style={{ marginBottom: 'var(--space-md)', fontSize: '0.85rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, color: 'var(--error)' }} />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email input */}
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-login-email"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: fieldErrors.email ? '1px solid var(--error)' : '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
              />
              <Mail size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
            </div>
            {fieldErrors.email && (
              <span style={{ color: 'var(--error)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Password input */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-login-password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: fieldErrors.password ? '1px solid var(--error)' : '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.92rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
              />
              <Lock size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
            </div>
            {fieldErrors.password && (
              <span style={{ color: 'var(--error)', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Submit button */}
          <button
            id="btn-login-submit"
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.92rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <button
            id="btn-switch-to-register"
            onClick={onSwitchToRegister}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}
