import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, ExternalLink, Calendar, Radio, Compass, Activity, Search } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const BODIES = [
  { id: 'all', label: 'All Bodies' },
  { id: 'moon', label: 'Moon' },
  { id: 'mars', label: 'Mars' },
  { id: 'jupiter', label: 'Jupiter' },
  { id: 'saturn_enceladus', label: 'Saturn & Enceladus' },
  { id: 'voyager_interstellar', label: 'Voyager Interstellar' },
  { id: 'chandra_sonification', label: 'Chandra Sonifications' }
];

export default function ClipLibrary({ onSelectClipForAnalyze, onSelectClipForSimilarity }) {
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBodyTab, setActiveBodyTab] = useState('all');
  const [activeAudioType, setActiveAudioType] = useState('all'); // 'all', 'recorded', 'sonified'

  const [playingClipId, setPlayingClipId] = useState(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const audioRef = useRef(new Audio());

  const fetchClips = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/space/clips`;
      const params = new URLSearchParams();
      if (activeBodyTab !== 'all') params.append('body', activeBodyTab);
      if (activeAudioType !== 'all') params.append('audio_type', activeAudioType);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setClips(data.clips || []);
      }
    } catch (err) {
      console.error('Error fetching space clips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClips();
  }, [activeBodyTab, activeAudioType]);

  // Audio Playback Listener
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setPlayingClipId(null);
      setPlaybackProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  const togglePlayClip = (clip) => {
    const audio = audioRef.current;
    if (playingClipId === clip.id) {
      audio.pause();
      setPlayingClipId(null);
    } else {
      audio.pause();
      audio.src = `${API_BASE}/space/audio/${clip.id}`;
      audio.play().then(() => {
        setPlayingClipId(clip.id);
      }).catch(err => {
        console.warn('Playback error:', err);
      });
    }
  };

  return (
    <div>
      {/* Header and Controls */}
      <div style={{ marginBottom: 'var(--space-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-heading)' }}>
            <Compass size={22} color="var(--accent-secondary)" />
            Space Acoustic Catalog
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Curated NASA, Cassini, Juno & Chandra acoustic sensor telemetry library.
          </p>
        </div>

        {/* Audio Type Filter (Recorded vs Sonified) */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-secondary)',
          padding: '4px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          gap: '4px'
        }}>
          <button
            onClick={() => setActiveAudioType('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeAudioType === 'all' ? 'var(--accent-secondary)' : 'transparent',
              color: activeAudioType === 'all' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            All Types
          </button>
          <button
            onClick={() => setActiveAudioType('recorded')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid',
              borderColor: activeAudioType === 'recorded' ? 'var(--success)' : 'transparent',
              background: activeAudioType === 'recorded' ? 'rgba(61, 220, 151, 0.15)' : 'transparent',
              color: activeAudioType === 'recorded' ? 'var(--success)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🎙️ Recorded
          </button>
          <button
            onClick={() => setActiveAudioType('sonified')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid',
              borderColor: activeAudioType === 'sonified' ? 'var(--accent-secondary)' : 'transparent',
              background: activeAudioType === 'sonified' ? 'rgba(124, 92, 252, 0.15)' : 'transparent',
              color: activeAudioType === 'sonified' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📡 Sonified
          </button>
        </div>
      </div>

      {/* Body Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '10px',
        marginBottom: 'var(--space-lg)'
      }}>
        {BODIES.map(b => (
          <button
            key={b.id}
            onClick={() => setActiveBodyTab(b.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              border: activeBodyTab === b.id ? '1px solid var(--accent-secondary)' : '1px solid var(--border-subtle)',
              background: activeBodyTab === b.id ? 'rgba(124, 92, 252, 0.15)' : 'var(--bg-secondary)',
              color: activeBodyTab === b.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeBodyTab === b.id ? '0 0 10px var(--accent-secondary-glow)' : 'none',
              fontSize: '0.84rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Clips Grid */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading catalog telemetry clips...
        </div>
      ) : clips.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
          <Radio size={36} color="var(--text-disabled)" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '6px', fontFamily: 'var(--font-heading)' }}>No Clips Found for Selected Filter</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto' }}>
            There are currently no clips matching this body or audio type in the catalog.
            You can add new clips via the Live Ingestion pipeline.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 'var(--space-md)'
        }}>
          {clips.map((clip) => {
            const isPlaying = playingClipId === clip.id;
            const isRecorded = clip.audio_type === 'recorded';

            return (
              <div
                key={clip.id}
                className="interactive-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isPlaying ? '1px solid var(--accent-secondary)' : '1px solid var(--border-subtle)',
                  boxShadow: isPlaying ? '0 0 20px var(--accent-secondary-glow)' : undefined
                }}
              >
                <div>
                  {/* Top Bar: Badge & Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span className={isRecorded ? 'badge-recorded' : 'badge-sonified'}>
                      {isRecorded ? '🎙️ Recorded Audio' : '📡 Sonified Data'}
                    </span>

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={12} />
                      {clip.date}
                    </span>
                  </div>

                  {/* Mission & Body */}
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>
                    {clip.mission}
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', fontWeight: 600, marginBottom: '12px' }}>
                    Target: {clip.body.toUpperCase()} · Sensor: {clip.instrument}
                  </div>

                  {/* Description */}
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.5',
                    marginBottom: 'var(--space-md)',
                    minHeight: '44px'
                  }}>
                    {clip.description}
                  </p>
                </div>

                <div>
                  {/* Audio Playing Bar */}
                  {isPlaying && (
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Volume2 size={13} color="var(--accent-secondary)" />
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>Streaming Telemetry</span>
                        <div style={{ display: 'flex', gap: '3px', marginLeft: 'auto' }}>
                          <div className="waveform-bar" style={{ animationDelay: '0.1s', background: 'var(--accent-secondary)' }} />
                          <div className="waveform-bar" style={{ animationDelay: '0.3s', background: 'var(--accent-secondary)' }} />
                          <div className="waveform-bar" style={{ animationDelay: '0.2s', background: 'var(--accent-secondary)' }} />
                        </div>
                      </div>
                      <div style={{ height: '4px', background: 'var(--bg-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${playbackProgress}%`, background: 'var(--accent-secondary)' }} />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => togglePlayClip(clip)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        background: isPlaying ? 'var(--accent-secondary)' : 'var(--bg-elevated)',
                        color: isPlaying ? '#ffffff' : 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isPlaying ? '0 0 12px var(--accent-secondary-glow)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isPlaying ? <Pause size={14} fill="#ffffff" /> : <Play size={14} style={{ marginLeft: '1px' }} />}
                      <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>

                    {onSelectClipForAnalyze && (
                      <button
                        onClick={() => onSelectClipForAnalyze(clip)}
                        title="Analyze with ML Classifiers"
                        className="btn-primary"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '0.8rem',
                          borderRadius: 'var(--radius-md)'
                        }}
                      >
                        <Activity size={13} />
                        <span>Classify</span>
                      </button>
                    )}

                    {onSelectClipForSimilarity && (
                      <button
                        onClick={() => onSelectClipForSimilarity(clip)}
                        title="Find Nearest Celestial Signatures"
                        className="btn-space-secondary"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '0.8rem',
                          borderRadius: 'var(--radius-md)'
                        }}
                      >
                        <Search size={13} />
                        <span>Similar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
