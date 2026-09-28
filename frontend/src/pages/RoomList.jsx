import React, { useState, useEffect } from 'react';
import { Home, Calendar, Radio, ArrowRight, Loader2, PlusCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RoomList({ onTestRoom, onNavigateRecord }) {
  const { authFetch } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/room/list');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to load rooms.');
      }
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError(`Unable to load rooms: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [authFetch]);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            Registered Physical Rooms
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Acoustic fingerprints stored in ChromaDB vector collection for matching.
          </p>
        </div>

        <button
          id="btn-nav-record-from-list"
          onClick={onNavigateRecord}
          className="btn-primary"
        >
          <PlusCircle size={16} />
          Record New Room
        </button>
      </div>

      {error && (
        <div style={{
          background: 'var(--bg-elevated)',
          borderLeft: '3px solid var(--error)',
          borderTop: '1px solid var(--border-subtle)',
          borderRight: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          color: 'var(--error)',
          fontSize: '0.88rem',
          marginBottom: 'var(--space-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={fetchRooms} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={36} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Loading registered rooms...</p>
        </div>
      ) : rooms.length === 0 ? (
        /* Empty State */
        <div 
          className="glass-panel" 
          style={{ 
            padding: '50px 30px', 
            textAlign: 'center',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-strong)'
          }}
        >
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-primary-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: 'var(--accent-primary)'
          }}>
            <Home size={30} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>No Registered Rooms Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '460px', margin: '8px auto 20px auto' }}>
            You haven't registered any room fingerprints yet. Record 10 seconds of ambient acoustic noise in a room to save its sonic signature.
          </p>
          <button
            onClick={onNavigateRecord}
            className="btn-primary"
          >
            Record Your First Room
          </button>
        </div>
      ) : (
        /* Rooms Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
          {rooms.map((room) => {
            const formattedDate = new Date(room.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <div 
                key={room.id}
                className="interactive-card room-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--accent-primary-glow)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)'
                    }}>
                      <Home size={20} />
                    </div>
                    <span className="badge-recorded" style={{ fontSize: '0.7rem' }}>
                      Vector Stored
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>
                    {room.room_name}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={13} />
                    <span className="font-mono">Registered {formattedDate}</span>
                  </div>

                  <div style={{ marginTop: '10px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)' }}>
                    ID: {room.chroma_id.slice(0, 22)}...
                  </div>
                </div>

                <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => onTestRoom(room.room_name)}
                    className="btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', padding: '8px', fontSize: '0.85rem' }}
                  >
                    <span>Test Against This Room</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
