import React from 'react';
import {
  Mic,
  Home,
  History as HistoryIcon,
  LogOut,
  User as UserIcon,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  currentMode,
  onSelectMode,
  currentTab,
  onSelectTab,
  registeredRoomsCount,
  onOpenLogin,
  onOpenRegister
}) {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="app-header">
      {/* Top Bar: Brand, Dual-Mode Selector & User Profile */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 'var(--space-md)'
      }}>
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }} onClick={() => onSelectMode(currentMode)}>
          <img
            src="/sonic-fingerprint-icon.svg"
            alt="Sonic Fingerprint"
            style={{
              width: '38px',
              height: '38px',
              flexShrink: 0
            }}
          />
          <div>
            <h1 className="brand-title" style={{
              fontSize: '1.35rem',
              lineHeight: 1.15,
              margin: 0
            }}>
              SONIC FINGERPRINT
            </h1>
            <div className="brand-subtitle" style={{
              marginTop: '3px',
              color: currentMode === 'space' ? 'var(--accent-secondary)' : 'var(--accent-primary)',
              fontWeight: 600
            }}>
              {currentMode === 'space' ? 'SOLAR SYSTEM ACOUSTIC EXPLORER' : 'PHYSICAL ROOM RECOGNITION'}
            </div>
          </div>
        </div>

        {/* Dual Operational Mode Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-elevated)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.25)'
        }}>
          <button
            id="mode-switch-room"
            onClick={() => onSelectMode('room')}
            className={`mode-pill ${currentMode === 'room' ? 'active-room' : ''}`}
          >
            <Home size={15} />
            <span>Room Mode</span>
          </button>

          <button
            id="mode-switch-space"
            onClick={() => onSelectMode('space')}
            className={`mode-pill ${currentMode === 'space' ? 'active-space' : ''}`}
          >
            <Globe size={15} />
            <span>Space Mode</span>
            <span style={{
              background: currentMode === 'space' ? 'var(--accent-secondary)' : 'rgba(255, 255, 255, 0.1)',
              color: currentMode === 'space' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 'var(--radius-sm)',
              marginLeft: '2px'
            }}>
              NASA
            </span>
          </button>
        </div>

        {/* User profile & Logout OR Guest Sign In */}
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--bg-elevated)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <UserIcon size={14} color="var(--accent-primary)" />
              <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || 'User'}
              </span>
            </div>

            <button
              id="btn-logout"
              onClick={logout}
              title="Sign Out"
              style={{
                background: 'rgba(255, 92, 92, 0.1)',
                border: '1px solid rgba(255, 92, 92, 0.3)',
                color: 'var(--error)',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              id="btn-nav-login"
              onClick={onOpenLogin}
              className="btn-secondary"
              style={{ padding: '7px 16px', fontSize: '0.85rem' }}
            >
              Sign In
            </button>
            <button
              id="btn-nav-register"
              onClick={onOpenRegister}
              className="btn-primary"
              style={{ padding: '7px 16px', fontSize: '0.85rem' }}
            >
              Create Account
            </button>
          </div>
        )}
      </div>

      {/* Sub-Nav Bar: Tabs for Mode 1 (Room Recognition) */}
      {currentMode === 'room' && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)' }}>
          <nav style={{
            display: 'flex',
            background: 'var(--bg-elevated)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            gap: '4px'
          }}>
            <button
              id="nav-tab-record"
              onClick={() => onSelectTab('record')}
              style={{
                padding: '8px 18px',
                fontSize: '0.88rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                background: currentTab === 'record' ? 'var(--accent-primary)' : 'transparent',
                color: currentTab === 'record' ? 'var(--bg-primary)' : 'var(--text-secondary)'
              }}
            >
              <Mic size={15} />
              <span>Record Room</span>
            </button>

            <button
              id="nav-tab-rooms"
              onClick={() => onSelectTab('rooms')}
              style={{
                padding: '8px 18px',
                fontSize: '0.88rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                background: currentTab === 'rooms' ? 'var(--accent-primary)' : 'transparent',
                color: currentTab === 'rooms' ? 'var(--bg-primary)' : 'var(--text-secondary)'
              }}
            >
              <Home size={15} />
              <span>My Rooms</span>
              {registeredRoomsCount > 0 && (
                <span className="font-mono" style={{
                  background: currentTab === 'rooms' ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                  color: currentTab === 'rooms' ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-sm)',
                  marginLeft: '4px'
                }}>
                  {registeredRoomsCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-history"
              onClick={() => onSelectTab('history')}
              style={{
                padding: '8px 18px',
                fontSize: '0.88rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                background: currentTab === 'history' ? 'var(--accent-primary)' : 'transparent',
                color: currentTab === 'history' ? 'var(--bg-primary)' : 'var(--text-secondary)'
              }}
            >
              <HistoryIcon size={15} />
              <span>History</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
