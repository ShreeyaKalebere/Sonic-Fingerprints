import React, { useState, useEffect } from 'react';
import { Search, Upload, Compass, AlertCircle, CheckCircle2, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import { convertBlobToWav } from '../../utils/audioToWav';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Rule-based "Why Similar" explanation engine
function getRuleBasedSimilarityExplanation(match) {
  const body = (match.body || '').toLowerCase();
  const audioType = (match.audio_type || '').toLowerCase();
  const instrument = (match.instrument || '').toLowerCase();
  const simPct = match.similarity_pct || (match.similarity * 100);

  if (simPct >= 99.0) {
    return 'Identical acoustic fingerprint match against reference telemetry archive.';
  }

  if (body === 'jupiter' || instrument.includes('plasma') || instrument.includes('waves') || instrument.includes('rpws') || instrument.includes('pws')) {
    return 'Both exhibit high-frequency electromagnetic plasma dispersion, whistler-mode sweeps, or auroral chorus emissions.';
  }

  if (audioType === 'recorded') {
    return 'Both represent physical mechanical/seismic vibrations propagating through a dense planetary crust or atmospheric boundary layer.';
  }

  if (body === 'chandra_sonification') {
    return 'Both share complex harmonic pitch spectra and radial frequency modulations characteristic of astronomical sonification maps.';
  }

  if (audioType === 'sonified') {
    return 'Both are sonifications of electromagnetic radio telemetry translated into the human-audible spectrum.';
  }

  return 'Acoustic profiles exhibit matching spectral centroid distribution and low-frequency energy resonance.';
}

export default function SimilaritySearch({ initialClip }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedClipName, setSelectedClipName] = useState(initialClip?.mission || '');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // If initialClip was passed from ClipLibrary
  useEffect(() => {
    if (initialClip) {
      setSelectedClipName(initialClip.mission);
      loadClipAsFile(initialClip);
    }
  }, [initialClip]);

  const loadClipAsFile = async (clip) => {
    try {
      setSearching(true);
      const res = await fetch(`${API_BASE}/space/audio/${clip.id}`);
      if (!res.ok) throw new Error('Could not load clip audio');
      const blob = await res.blob();
      const file = new File([blob], clip.filename || `${clip.body}_query.wav`, { type: 'audio/wav' });
      setSelectedFile(file);
      await runSimilaritySearch(file);
    } catch (err) {
      setErrorMessage(`Failed to load clip for similarity: ${err.message}`);
      setSearching(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedClipName(file.name);
      setResult(null);
      setErrorMessage(null);
    }
  };

  const runSimilaritySearch = async (fileToRun) => {
    const file = fileToRun || selectedFile;
    if (!file) {
      setErrorMessage('Please select or drop an audio telemetry file.');
      return;
    }

    setSearching(true);
    setErrorMessage(null);
    setResult(null);

    let fileToSend = file;
    try {
      const wavBlob = await convertBlobToWav(file);
      fileToSend = new File([wavBlob], (file.name || 'query_telemetry').replace(/\.[^/.]+$/, "") + ".wav", { type: 'audio/wav' });
    } catch (convErr) {
      console.warn('WAV pre-conversion warning in SimilaritySearch:', convErr);
    }

    const formData = new FormData();
    formData.append('file', fileToSend);

    try {
      const res = await fetch(`${API_BASE}/space/similarity`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error?.message || data.detail || 'Similarity search failed.');
      } else {
        setResult(data);
      }
    } catch (err) {
      setErrorMessage(`Network error: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      
      {/* Studio Header */}
      <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-xs)', fontFamily: 'var(--font-heading)' }}>
          <Search size={22} color="var(--accent-secondary)" />
          High-Dimensional Acoustic Similarity Search
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
          Queries ChromaDB <strong>"space_clips"</strong> collection using cosine distance over 2,048-dimensional PANNs embeddings
          to find the top-3 nearest extraterrestrial acoustic signatures.
        </p>

        {/* Upload Zone */}
        <div
          style={{
            border: '2px dashed var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 20px',
            textAlign: 'center',
            background: 'var(--bg-elevated)',
            marginBottom: 'var(--space-md)',
            cursor: 'pointer',
            position: 'relative',
            transition: 'border-color 0.2s ease'
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              const file = e.dataTransfer.files[0];
              setSelectedFile(file);
              setSelectedClipName(file.name);
            }
          }}
        >
          <input
            type="file"
            accept="audio/*,.wav,.mp3,.ogg,.flac"
            onChange={handleFileChange}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              cursor: 'pointer',
              width: '100%',
              height: '100%'
            }}
          />
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(124, 92, 252, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            color: 'var(--accent-secondary)'
          }}>
            <Search size={24} />
          </div>

          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>
            {selectedClipName ? `Selected: ${selectedClipName}` : 'Drop audio clip or click to select query telemetry'}
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            WAV, MP3, FLAC, OGG · Resampled to 32 kHz · Windowed to 5.0s
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            background: 'var(--bg-elevated)',
            borderLeft: '3px solid var(--error)',
            borderTop: '1px solid var(--border-subtle)',
            borderRight: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--error)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.86rem'
          }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Button: Space mode specific action -> btn-space-secondary */}
        <button
          className="btn-space-secondary"
          onClick={() => runSimilaritySearch()}
          disabled={!selectedFile || searching}
        >
          <Search size={17} />
          <span>{searching ? 'Querying ChromaDB Vector Index...' : 'Find Nearest Celestial Matches'}</span>
        </button>
      </div>

      {/* Results Display */}
      {result && (
        <div className="glass-panel" style={{ padding: 'var(--space-lg)', animation: 'fadeIn 0.3s ease-out' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="badge-sonified" style={{ marginBottom: '8px' }}>
                <Sparkles size={13} />
                ChromaDB Cosine Similarity Query
              </span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                Top-3 Nearest Celestial Acoustic Signatures
              </h3>
            </div>

            <div style={{
              background: 'var(--bg-elevated)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)'
            }}>
              Catalog Size: {result.total_indexed || 0} clips
            </div>
          </div>

          {result.matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 10px', color: 'var(--text-disabled)' }} />
              <p>{result.message || 'No matches found in the space_clips collection.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {result.matches.map((match, idx) => {
                const isTop = idx === 0;
                const isRecorded = match.audio_type === 'recorded';
                const explanation = getRuleBasedSimilarityExplanation(match);

                return (
                  <div
                    key={match.clip_id || idx}
                    className="interactive-card"
                    style={{
                      background: isTop ? 'var(--bg-elevated)' : 'var(--bg-secondary)',
                      border: isTop ? '1px solid var(--accent-secondary)' : '1px solid var(--border-subtle)',
                      boxShadow: isTop ? '0 0 20px var(--accent-secondary-glow)' : undefined
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: isTop ? 'var(--accent-secondary)' : 'var(--bg-elevated)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isTop ? '0 0 10px var(--accent-secondary-glow)' : 'none'
                        }}>
                          {idx + 1}
                        </span>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                              {match.mission}
                            </h4>
                            <span className={isRecorded ? 'badge-recorded' : 'badge-sonified'}>
                              {isRecorded ? '🎙️ Recorded' : '📡 Sonified'}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>
                            Target: {match.body.toUpperCase()} · Sensor: {match.instrument || 'Acoustic / Plasma Sensor'}
                          </span>
                        </div>
                      </div>

                      {/* Similarity Score */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '1.8rem',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          color: isTop ? 'var(--accent-secondary)' : 'var(--text-primary)'
                        }}>
                          {match.similarity_pct || (match.similarity * 100).toFixed(1)}%
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          Cosine Similarity
                        </span>
                      </div>
                    </div>

                    {/* Similarity Progress Bar */}
                    <div className="confidence-track" style={{ marginBottom: '14px' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.max(5, match.similarity_pct || (match.similarity * 100))}%`,
                        background: isTop ? 'var(--accent-secondary)' : 'rgba(124, 92, 252, 0.5)',
                        borderRadius: 'var(--radius-sm)',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>

                    {/* Scientific Description */}
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' }}>
                      {match.description}
                    </p>

                    {/* Rule-Based "Why Similar" Note */}
                    <div style={{
                      background: 'var(--bg-secondary)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--text-primary)'
                    }}>
                      <HelpCircle size={15} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />
                      <span>
                        <strong style={{ color: 'var(--accent-secondary)' }}>Acoustic Correlation Rationale:</strong> {explanation}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
