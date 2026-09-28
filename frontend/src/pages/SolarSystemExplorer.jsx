import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Radio,
  Play,
  Pause,
  Upload,
  Activity,
  Sparkles,
  Database,
  Sliders,
  FileAudio,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  Compass,
  Maximize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const TARGET_COLORS = {
  moon: {
    glow: 'rgba(226, 232, 240, 0.25)',
    border: 'rgba(226, 232, 240, 0.4)',
    accent: '#cbd5e1',
    gradient: 'linear-gradient(135deg, #475569, #94a3b8)'
  },
  mars: {
    glow: 'rgba(239, 68, 68, 0.3)',
    border: 'rgba(239, 68, 68, 0.4)',
    accent: '#f87171',
    gradient: 'linear-gradient(135deg, #7f1d1d, #ef4444)'
  },
  jupiter: {
    glow: 'rgba(245, 158, 11, 0.3)',
    border: 'rgba(245, 158, 11, 0.4)',
    accent: '#fbbf24',
    gradient: 'linear-gradient(135deg, #78350f, #f59e0b)'
  },
  saturn_enceladus: {
    glow: 'rgba(217, 119, 6, 0.3)',
    border: 'rgba(217, 119, 6, 0.4)',
    accent: '#fde047',
    gradient: 'linear-gradient(135deg, #713f12, #eab308)'
  },
  voyager_interstellar: {
    glow: 'rgba(56, 189, 248, 0.35)',
    border: 'rgba(56, 189, 248, 0.4)',
    accent: '#38bdf8',
    gradient: 'linear-gradient(135deg, #0369a1, #38bdf8)'
  },
  chandra_sonification: {
    glow: 'rgba(168, 85, 247, 0.35)',
    border: 'rgba(168, 85, 247, 0.4)',
    accent: '#c084fc',
    gradient: 'linear-gradient(135deg, #581c87, #a855f7)'
  }
};

export default function SolarSystemExplorer() {
  const { authFetch } = useAuth();

  const [targets, setTargets] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState(null);

  // Audio Playback State
  const [playingTargetId, setPlayingTargetId] = useState(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef(new Audio());

  // Analysis State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(null);
  const [showFullSpectrogram, setShowFullSpectrogram] = useState(false);

  // Fetch targets catalog
  const loadTargets = async () => {
    setLoadingTargets(true);
    try {
      const res = await fetch(`${API_BASE}/space/targets`);
      if (res.ok) {
        const data = await res.json();
        setTargets(data.targets || []);
        if (data.targets && data.targets.length > 0 && !selectedTarget) {
          setSelectedTarget(data.targets[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load space targets:', e);
    } finally {
      setLoadingTargets(false);
    }
  };

  useEffect(() => {
    loadTargets();
  }, []);

  // Audio Playback Listener
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setPlayingTargetId(null);
      setAudioProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  const togglePlayAudio = (target) => {
    const audio = audioRef.current;
    if (playingTargetId === target.id) {
      audio.pause();
      setPlayingTargetId(null);
    } else {
      audio.pause();
      audio.src = `${API_BASE}/space/audio/${target.id}`;
      audio.play().then(() => {
        setPlayingTargetId(target.id);
        setSelectedTarget(target);
      }).catch(err => {
        console.warn('Playback error:', err);
      });
    }
  };

  // Seed / Re-index space vector database
  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setSeedSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/space/seed`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSeedSuccess(`Database synchronized: ${data.indexed_targets?.length || 6} cosmic bodies indexed into ChromaDB.`);
        loadTargets();
      } else {
        setErrorMessage(data.error?.message || 'Failed to seed vector database.');
      }
    } catch (err) {
      setErrorMessage(`Error contacting space database: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // Analyze space audio file
  const handleAnalyze = async (fileToAnalyze) => {
    const file = fileToAnalyze || uploadedFile;
    if (!file) {
      setErrorMessage('Please select or upload a space audio recording to analyze.');
      return;
    }

    setAnalyzing(true);
    setErrorMessage(null);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // authFetch if logged in, standard fetch otherwise
      const res = authFetch
        ? await authFetch('/space/analyze', { method: 'POST', body: formData })
        : await fetch(`${API_BASE}/space/analyze`, { method: 'POST', body: formData });

      const data = await res.json();
      if (res.ok) {
        setAnalysisResult(data);
      } else {
        setErrorMessage(data.error?.message || data.detail || 'Analysis failed. Please verify the audio file.');
      }
    } catch (err) {
      setErrorMessage(`Network error analyzing space telemetry: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Trigger analysis directly using target reference sample
  const handleAnalyzePreset = async (target) => {
    try {
      setAnalyzing(true);
      setErrorMessage(null);
      // Fetch the sample audio blob
      const res = await fetch(`${API_BASE}/space/audio/${target.id}`);
      if (!res.ok) throw new Error('Could not fetch preset telemetry clip');
      const blob = await res.blob();
      const file = new File([blob], `${target.id}_telemetry.wav`, { type: 'audio/wav' });
      setUploadedFile(file);
      await handleAnalyze(file);
    } catch (err) {
      setErrorMessage(`Error running preset telemetry: ${err.message}`);
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* Hero / Telemetry HUD */}
      <div className="glass-panel" style={{
        padding: '32px',
        marginBottom: '32px',
        background: 'radial-gradient(ellipse at 80% 20%, rgba(56, 189, 248, 0.15), rgba(15, 23, 42, 0.85))',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span className="cosmic-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <Sparkles size={13} />
              Operational Mode 2
            </span>
            <span className="cosmic-badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <Radio size={13} />
              NASA & Chandra Sonified Telemetry
            </span>
          </div>

          <h2 style={{
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '10px',
            background: 'linear-gradient(to right, #ffffff, #93c5fd, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Solar System Acoustic Explorer
          </h2>

          <p style={{ color: 'var(--text-secondary)', maxWidth: '780px', fontSize: '0.96rem', lineHeight: '1.6', marginBottom: '24px' }}>
            Acoustic classification of real extraterrestrial sensor recordings and sonified astrophysical telemetry.
            Extracts 128-band Mel-spectrograms and 2,048-dimensional PANNs deep neural embeddings to match unknown signals
            against high-dimensional planetary acoustic manifolds.
          </p>

          {/* Quick HUD Metrics */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            alignItems: 'center'
          }}>
            <div style={{
              background: 'rgba(10, 15, 36, 0.7)',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Globe size={15} color="var(--accent-cyan)" />
              <span style={{ color: 'var(--text-secondary)' }}>Targets:</span>
              <span style={{ fontWeight: 700, color: '#fff' }}>6 Celestial Bodies</span>
            </div>

            <div style={{
              background: 'rgba(10, 15, 36, 0.7)',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Activity size={15} color="#c084fc" />
              <span style={{ color: 'var(--text-secondary)' }}>Backbone:</span>
              <span style={{ fontWeight: 700, color: '#fff' }}>PANNs Cnn14 (2048-D)</span>
            </div>

            <div style={{
              background: 'rgba(10, 15, 36, 0.7)',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Database size={15} color="#34d399" />
              <span style={{ color: 'var(--text-secondary)' }}>ChromaDB:</span>
              <span style={{ fontWeight: 700, color: '#fff' }}>space_sounds</span>
            </div>

            <button
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              style={{
                marginLeft: 'auto',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: 'var(--accent-cyan)',
                padding: '8px 18px',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <RotateCcw size={14} className={isSeeding ? 'spin' : ''} />
              <span>{isSeeding ? 'Synchronizing Manifolds...' : 'Sync ChromaDB Index'}</span>
            </button>
          </div>

          {seedSuccess && (
            <div style={{
              marginTop: '16px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} />
              <span>{seedSuccess}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Celestial Targets Catalog (Left) & Telemetry Analyzer (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        marginBottom: '36px'
      }}>

        {/* Section 1: Celestial Audio Catalog & Telemetry Cards */}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={20} color="var(--accent-cyan)" />
                Celestial Acoustic Manifolds
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Audition authentic sonifications and inspect instrument spectral telemetry.
              </p>
            </div>
          </div>

          {loadingTargets ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading cosmic audio catalog...
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '18px'
            }}>
              {targets.map((target) => {
                const styling = TARGET_COLORS[target.id] || TARGET_COLORS.voyager_interstellar;
                const isPlaying = playingTargetId === target.id;
                const isSelected = selectedTarget?.id === target.id;

                return (
                  <div
                    key={target.id}
                    className="cosmic-card"
                    style={{
                      borderColor: isSelected ? styling.border : 'rgba(56, 189, 248, 0.15)',
                      boxShadow: isSelected ? `0 0 25px ${styling.glow}` : 'none'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: styling.accent,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em'
                        }}>
                          {target.mission}
                        </span>
                        <h4 style={{ fontSize: '1.08rem', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                          {target.name}
                        </h4>
                      </div>

                      {/* Playback Button */}
                      <button
                        onClick={() => togglePlayAudio(target)}
                        title={isPlaying ? 'Pause Audio' : 'Listen to Acoustic Telemetry'}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: isPlaying ? styling.gradient : 'rgba(30, 41, 59, 0.8)',
                          border: `1px solid ${styling.border}`,
                          color: isPlaying ? '#030712' : styling.accent,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isPlaying ? `0 0 15px ${styling.accent}` : 'none'
                        }}
                      >
                        {isPlaying ? <Pause size={18} fill="#030712" /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                      </button>
                    </div>

                    {/* Sensor & Wave Metrics */}
                    <div style={{
                      background: 'rgba(10, 15, 36, 0.5)',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      marginBottom: '14px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Instrument:</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{target.instrument}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Wave Type:</span>
                        <span style={{ color: styling.accent, fontWeight: 500 }}>{target.wave_type}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Frequency:</span>
                        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{target.frequency_range}</span>
                      </div>
                    </div>

                    {/* Acoustic Signature Description */}
                    <p style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5',
                      marginBottom: '16px',
                      minHeight: '48px'
                    }}>
                      {target.acoustic_signature}
                    </p>

                    {/* Audio Playing Bar Indicator */}
                    {isPlaying && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <Volume2 size={14} color={styling.accent} />
                          <span style={{ fontSize: '0.75rem', color: styling.accent, fontWeight: 600 }}>Streaming Telemetry Audio</span>
                          <div style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}>
                            <div className="waveform-bar" style={{ animationDelay: '0.1s', background: styling.accent }} />
                            <div className="waveform-bar" style={{ animationDelay: '0.3s', background: styling.accent }} />
                            <div className="waveform-bar" style={{ animationDelay: '0.5s', background: styling.accent }} />
                            <div className="waveform-bar" style={{ animationDelay: '0.2s', background: styling.accent }} />
                          </div>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${audioProgress}%`, background: styling.accent, transition: 'width 0.1s linear' }} />
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleAnalyzePreset(target)}
                        disabled={analyzing}
                        style={{
                          flex: 1,
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Activity size={14} color="var(--accent-cyan)" />
                        <span>Run ML Pipeline</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Upload / Ingestion & Analysis Studio */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={20} color="var(--accent-cyan)" />
              Cosmic Telemetry Ingestion & Spectrogram Studio
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Upload any audio recording or sonified radio signal to extract its 128 Mel-band spectrogram and classify it against indexed celestial bodies.
            </p>

            {/* Drag & drop upload area */}
            <div
              style={{
                border: '2px dashed rgba(56, 189, 248, 0.3)',
                borderRadius: '16px',
                padding: '36px 20px',
                textAlign: 'center',
                background: 'rgba(10, 15, 36, 0.4)',
                marginBottom: '20px',
                cursor: 'pointer',
                position: 'relative'
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setUploadedFile(e.dataTransfer.files[0]);
                }
              }}
            >
              <input
                type="file"
                accept="audio/*,.wav,.mp3,.ogg,.flac"
                id="space-file-input"
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%'
                }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadedFile(e.target.files[0]);
                  }
                }}
              />
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(56, 189, 248, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                color: 'var(--accent-cyan)'
              }}>
                <Upload size={24} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                {uploadedFile ? uploadedFile.name : 'Drop cosmic audio recording here'}
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {uploadedFile
                  ? `${(uploadedFile.size / 1024).toFixed(1)} KB — Ready to compute 128 Mel-bands & 2048-D embedding`
                  : 'Supports WAV, MP3, FLAC, OGG (Automatically resampled to 32kHz, 5.0s window)'}
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div style={{
                marginBottom: '20px',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                color: '#fb7185',
                padding: '12px 18px',
                borderRadius: '12px',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <AlertTriangle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                id="btn-analyze-space"
                className="btn-primary"
                onClick={() => handleAnalyze()}
                disabled={!uploadedFile || analyzing}
                style={{
                  opacity: !uploadedFile || analyzing ? 0.6 : 1,
                  cursor: !uploadedFile || analyzing ? 'not-allowed' : 'pointer'
                }}
              >
                <Activity size={18} />
                <span>{analyzing ? 'Extracting Spectrogram & Vector Matching...' : 'Analyze Space Telemetry'}</span>
              </button>

              {targets.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleAnalyzePreset(targets[2] || targets[0])}
                  disabled={analyzing}
                >
                  <Sparkles size={16} color="var(--accent-cyan)" />
                  <span>Analyze Jupiter Whistler Preset</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 3: Analysis Results Display */}
          {analysisResult && (
            <div className="glass-panel" style={{ padding: '32px', animation: 'fadeIn 0.4s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span className="cosmic-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '8px' }}>
                    <CheckCircle2 size={13} />
                    Analysis Complete
                  </span>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                    Acoustic Telemetry Match Results
                  </h3>
                </div>

                <div style={{
                  background: 'rgba(10, 15, 36, 0.8)',
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)'
                }}>
                  Backbone: <strong style={{ color: '#fff' }}>PANNs Cnn14 (2,048 dims)</strong>
                </div>
              </div>

              {/* Top Match Spotlight */}
              {analysisResult.top_match && (
                <div style={{
                  background: 'radial-gradient(ellipse at 90% 10%, rgba(56, 189, 248, 0.2), rgba(15, 23, 42, 0.95))',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '28px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '20px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Primary Celestial Fingerprint Match
                    </span>
                    <h4 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                      {analysisResult.top_match.name}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px', maxWidth: '600px' }}>
                      {analysisResult.top_match.acoustic_signature}
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', background: 'rgba(10, 15, 36, 0.8)', padding: '16px 28px', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                    <div style={{
                      fontSize: '2.4rem',
                      fontWeight: 900,
                      fontFamily: 'var(--font-mono)',
                      background: 'linear-gradient(to right, #38bdf8, #818cf8)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      {analysisResult.top_match.match_confidence_pct}%
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Cosine Similarity
                    </span>
                  </div>
                </div>
              )}

              {/* Spectrogram & Telemetry Metrics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '24px',
                marginBottom: '28px'
              }}>

                {/* Left: 128 Mel-Spectrogram Image */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                      128-Band Mel-Spectrogram (Base64 Rendered)
                    </h5>
                    <button
                      onClick={() => setShowFullSpectrogram(!showFullSpectrogram)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-cyan)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <Maximize2 size={14} />
                      <span>{showFullSpectrogram ? 'Collapse' : 'Expand'}</span>
                    </button>
                  </div>

                  <div style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    background: '#000'
                  }}>
                    <img
                      src={analysisResult.spectrogram_base64}
                      alt="Cosmic Audio Spectrogram"
                      style={{
                        width: '100%',
                        height: showFullSpectrogram ? 'auto' : '240px',
                        objectFit: showFullSpectrogram ? 'contain' : 'cover',
                        display: 'block'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <span>0.0s (Window Start)</span>
                    <span>128 Mel Filterbanks / 32 kHz Mono</span>
                    <span>5.0s (Window End)</span>
                  </div>
                </div>

                {/* Right: Physical Telemetry Metrics */}
                <div>
                  <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                    Acoustic Physical Telemetry Metrics
                  </h5>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ background: 'rgba(10, 15, 36, 0.6)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Estimated Peak Spectral Frequency</span>
                      <strong style={{ fontSize: '1rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {analysisResult.telemetry_metrics?.estimated_peak_frequency_hz} Hz
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(10, 15, 36, 0.6)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Dominant Mel Filterbank Band</span>
                      <strong style={{ fontSize: '1rem', color: '#c084fc', fontFamily: 'var(--font-mono)' }}>
                        Band {analysisResult.telemetry_metrics?.dominant_mel_band} / 128
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(10, 15, 36, 0.6)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Acoustic Dynamic Range</span>
                      <strong style={{ fontSize: '1rem', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                        {analysisResult.telemetry_metrics?.dynamic_range_db} dB
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(10, 15, 36, 0.6)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Standard Sampling Frequency</span>
                      <strong style={{ fontSize: '1rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        {analysisResult.telemetry_metrics?.sample_rate_hz} Hz
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* All Matches Ranked List */}
              {analysisResult.matches && analysisResult.matches.length > 0 && (
                <div>
                  <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
                    Ranked Celestial Cosine Similarity Index (ChromaDB)
                  </h5>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {analysisResult.matches.map((match, idx) => {
                      const styling = TARGET_COLORS[match.target_id] || TARGET_COLORS.voyager_interstellar;
                      return (
                        <div
                          key={match.target_id}
                          style={{
                            background: 'rgba(10, 15, 36, 0.5)',
                            padding: '12px 18px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <span style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.1)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)'
                          }}>
                            {idx + 1}
                          </span>

                          <div style={{ flex: 1, minWidth: '180px' }}>
                            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.92rem' }}>
                              {match.name}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              {match.wave_type} · {match.frequency_range}
                            </div>
                          </div>

                          <div style={{ width: '180px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Similarity</span>
                              <strong style={{ color: styling.accent, fontFamily: 'var(--font-mono)' }}>
                                {match.match_confidence_pct}%
                              </strong>
                            </div>
                            <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${Math.max(5, match.match_confidence_pct)}%`,
                                  background: styling.gradient,
                                  borderRadius: '3px'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
