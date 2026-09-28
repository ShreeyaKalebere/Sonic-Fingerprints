import React, { useState, useEffect } from 'react';
import { Clock, Radio, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export default function RecentIngestions({ refreshTrigger }) {
  const [recents, setRecents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = async () => {
    try {
      const res = await fetch(`${API_BASE}/space/recent-ingestions`);
      if (res.ok) {
        const data = await res.json();
        setRecents(data.recent_clips || []);
      }
    } catch (e) {
      console.warn('Could not fetch recent ingestions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, [refreshTrigger]);

  if (loading && recents.length === 0) {
    return null;
  }

  if (recents.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)' }}>
        <Clock size={16} color="var(--accent-secondary)" />
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
          Recent Telemetry Additions
        </h4>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          Live MongoDB Feed
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {recents.slice(0, 5).map((clip) => {
          const isRec = clip.audio_type === 'recorded';
          return (
            <div
              key={clip._id || clip.chroma_id}
              style={{
                background: 'var(--bg-elevated)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {clip.mission}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {clip.body.toUpperCase()} · {clip.instrument}
                </div>
              </div>

              <span className={isRec ? 'badge-recorded' : 'badge-sonified'} style={{ fontSize: '0.68rem', padding: '2px 6px', whiteSpace: 'nowrap' }}>
                {isRec ? '🎙️ Rec' : '📡 Son'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
