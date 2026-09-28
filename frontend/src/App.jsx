import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Navbar from './components/Navbar';
import RoomRecord from './pages/RoomRecord';
import RoomList from './pages/RoomList';
import History from './pages/History';
import SpaceContainer from './pages/space/SpaceContainer';

function AppContent() {
  const { isAuthenticated, authFetch } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentMode, setCurrentMode] = useState('space'); // 'room' | 'space' (default to space to showcase newly implemented Mode 2)
  const [currentTab, setCurrentTab] = useState('record'); // 'record' | 'rooms' | 'history'
  const [targetRoomForTest, setTargetRoomForTest] = useState(null);
  const [registeredRoomsCount, setRegisteredRoomsCount] = useState(0);

  // Fetch count of registered rooms
  const updateRoomsCount = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await authFetch('/room/list');
      if (res.ok) {
        const data = await res.json();
        setRegisteredRoomsCount(data.rooms?.length || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      updateRoomsCount();
      setShowAuthModal(false);
    }
  }, [isAuthenticated, authFetch]);

  // Jump from RoomList to Record screen
  const handleTestRoom = (roomName) => {
    setCurrentMode('room');
    setTargetRoomForTest(roomName);
    setCurrentTab('record');
  };

  const handleRoomRegistered = (roomName) => {
    updateRoomsCount();
  };

  const handleSelectMode = (mode) => {
    if (mode === 'room' && !isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setCurrentMode(mode);
    setTargetRoomForTest(null);
  };

  return (
    <div style={{ maxWidth: '1220px', margin: '0 auto', padding: '28px 20px' }}>
      
      {/* Top Navigation with Dual Operational Mode Switcher */}
      <Navbar
        currentMode={currentMode}
        onSelectMode={handleSelectMode}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab !== 'record') setTargetRoomForTest(null);
          setCurrentTab(tab);
        }}
        registeredRoomsCount={registeredRoomsCount}
        onOpenLogin={() => {
          setAuthView('login');
          setShowAuthModal(true);
        }}
        onOpenRegister={() => {
          setAuthView('register');
          setShowAuthModal(true);
        }}
      />

      {/* Main Content Area */}
      <main>
        {showAuthModal && !isAuthenticated ? (
          <div style={{ position: 'relative', marginTop: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <button
                onClick={() => setShowAuthModal(false)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: 'var(--text-secondary)',
                  padding: '6px 16px',
                  borderRadius: '9999px',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                ← Return to Solar System Explorer
              </button>
            </div>
            {authView === 'login' ? (
              <Login onSwitchToRegister={() => setAuthView('register')} />
            ) : (
              <Register onSwitchToLogin={() => setAuthView('login')} />
            )}
          </div>
        ) : currentMode === 'space' ? (
          <SpaceContainer onRequireAuth={() => {
            setAuthView('login');
            setShowAuthModal(true);
          }} />
        ) : (
          <>
            {currentTab === 'record' && (
              <RoomRecord
                targetRoomForTest={targetRoomForTest}
                onRoomRegistered={handleRoomRegistered}
              />
            )}

            {currentTab === 'rooms' && (
              <RoomList
                onTestRoom={handleTestRoom}
                onNavigateRecord={() => {
                  setTargetRoomForTest(null);
                  setCurrentTab('record');
                }}
              />
            )}

            {currentTab === 'history' && (
              <History
                onNavigateRecord={() => {
                  setTargetRoomForTest(null);
                  setCurrentTab('record');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '0.82rem',
        marginTop: 'var(--space-xl)',
        paddingBottom: 'var(--space-lg)',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: 'var(--space-lg)'
      }}>
        <div style={{ marginBottom: '6px' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Sonic Fingerprint & Solar System Acoustic Explorer</strong> • Dual Operational Mode Acoustic Intelligence
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          Shared Acoustic ML Pipeline: 32 kHz Resampling · 128 Mel-Frequency Filterbanks · Pretrained PANNs Cnn14 2,048-dim Vectors · ChromaDB
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
