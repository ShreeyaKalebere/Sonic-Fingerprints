import React, { useState, useEffect } from 'react';
import { Upload, Activity, AlertCircle, CheckCircle2, Mic, Sparkles, Image, RefreshCw } from 'lucide-react';
import { convertBlobToWav } from '../../utils/audioToWav';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const BODY_LABELS = {
  moon: 'Moon (Lunar Surface)',
  mars: 'Mars (Planetary Boundary)',
  jupiter: 'Jupiter (Jovian Magnetosphere)',
  saturn_enceladus: 'Saturn & Enceladus (Ring & Plume)',
  voyager_interstellar: 'Voyager (Interstellar Medium)',
  chandra_sonification: 'Chandra Sonifications (Black Hole Waves)'
};

export default function Analyze({ initialClip }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedClipName, setSelectedClipName] = useState(initialClip?.mission || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [notTrainedMessage, setNotTrainedMessage] = useState(null);
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
      setAnalyzing(true);
      const res = await fetch(`${API_BASE}/space/audio/${clip.id}`);
      if (!res.ok) throw new Error('Could not load clip audio');
      const blob = await res.blob();
      const file = new File([blob], clip.filename || `${clip.body}_clip.wav`, { type: 'audio/wav' });
      setSelectedFile(file);
      await runClassification(file);
    } catch (err) {
      setErrorMessage(`Failed to load clip for analysis: ${err.message}`);
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedClipName(file.name);
      setResult(null);
      setErrorMessage(null);
      setNotTrainedMessage(null);
    }
  };

  const runClassification = async (fileToRun) => {
    const file = fileToRun || selectedFile;
    if (!file) {
      setErrorMessage('Please select or drop an audio telemetry file.');
      return;
    }

    setAnalyzing(true);
    setErrorMessage(null);
    setNotTrainedMessage(null);
    setResult(null);

    let fileToSend = file;
    try {
      const wavBlob = await convertBlobToWav(file);
      fileToSend = new File([wavBlob], (file.name || 'space_telemetry').replace(/\.[^/.]+$/, "") + ".wav", { type: 'audio/wav' });
    } catch (convErr) {
      console.warn('WAV pre-conversion warning in Analyze:', convErr);
    }

    const formData = new FormData();
    formData.append('file', fileToSend);

    try {
      const res = await fetch(`${API_BASE}/space/classify`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.status === 503) {
        setNotTrainedMessage(
          data.error?.message ||
          'The neural classification heads have not been trained yet. Please train the classifiers in the Admin Panel to enable telemetry classification.'
        );
      } else if (!res.ok) {
        setErrorMessage(data.error?.message || data.detail || 'Classification failed.');
      } else {
        setResult(data);
      }
    } catch (err) {
      setErrorMessage(`Network connection error: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto' }}>
      
      {/* Studio Header */}
      <div className="glass-panel" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-xs)', fontFamily: 'var(--font-heading)' }}>
          <Activity size={22} color="var(--accent-secondary)" />
          Celestial Telemetry Classifier
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
          Analyzes acoustic telemetry via the 2,048-dimensional PANNs Cnn14 embedding backbone.
          Simultaneously runs inference through the 6-class <strong>BodyClassifier</strong> and 2-class <strong>TypeClassifier</strong>.
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
            <Upload size={24} />
          </div>

          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>
            {selectedClipName ? `Selected: ${selectedClipName}` : 'Drop space telemetry audio here or click to browse'}
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Automatically resampled to 32 kHz mono time-series with deterministic 5.0-second temporal windowing
          </p>
        </div>

        {/* Not Trained Friendly Alert */}
        {notTrainedMessage && (
          <div style={{
            background: 'var(--bg-elevated)',
            borderLeft: '3px solid var(--warning)',
            borderTop: '1px solid var(--border-subtle)',
            borderRight: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--warning)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.88rem'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{notTrainedMessage}</span>
          </div>
        )}

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

        {/* Action Button */}
        <button
          className="btn-primary"
          onClick={() => runClassification()}
          disabled={!selectedFile || analyzing}
        >
          <Activity size={17} />
          <span>{analyzing ? 'Computing 128 Mel-bands & Classifying...' : 'Run Neural Classification'}</span>
        </button>
      </div>

      {/* Results Section */}
      {result && (
        <div className="glass-panel" style={{ padding: 'var(--space-lg)', animation: 'fadeIn 0.3s ease-out' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="badge-recorded" style={{ marginBottom: '8px' }}>
                <CheckCircle2 size={13} />
                Classification Output
              </span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                Extraterrestrial Acoustic Predictions
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
              Neural Head: Softmax over 2048-D PANNs
            </div>
          </div>

          {/* Dual Verdict Banners */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-xl)'
          }}>
            {/* Top Body */}
            {(() => {
              const isRecordedBody = ['moon', 'mars'].includes(result.top_body);
              const accentColor = isRecordedBody ? 'var(--success)' : 'var(--accent-secondary)';
              const glowColor = isRecordedBody ? 'rgba(61, 220, 151, 0.2)' : 'var(--accent-secondary-glow)';
              return (
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${accentColor}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-md)',
                  boxShadow: `0 0 16px ${glowColor}`
                }}>
                  <span style={{ fontSize: '0.72rem', color: accentColor, fontWeight: 700, textTransform: 'uppercase' }}>
                    Predicted Celestial Body
                  </span>
                  <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'var(--font-heading)' }}>
                    {BODY_LABELS[result.top_body] || result.top_body}
                  </h4>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: accentColor, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                    {(result.body[result.top_body] * 100).toFixed(1)}% Confidence
                  </div>
                </div>
              );
            })()}

            {/* Top Type */}
            {(() => {
              const isRecType = result.top_type === 'recorded';
              const typeColor = isRecType ? 'var(--success)' : 'var(--accent-secondary)';
              const typeGlow = isRecType ? 'rgba(61, 220, 151, 0.2)' : 'var(--accent-secondary-glow)';
              return (
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${typeColor}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-md)',
                  boxShadow: `0 0 16px ${typeGlow}`
                }}>
                  <span style={{ fontSize: '0.72rem', color: typeColor, fontWeight: 700, textTransform: 'uppercase' }}>
                    Predicted Acoustic Paradigm
                  </span>
                  <h4 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', fontFamily: 'var(--font-heading)' }}>
                    {isRecType ? '🎙️ Physical Recorded Wave' : '📡 Sonified Telemetry'}
                  </h4>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: typeColor, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                    {(result.type[result.top_type] * 100).toFixed(1)}% Confidence
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sorted Body Confidence Bars */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)', fontFamily: 'var(--font-heading)' }}>
              BodyClassifier Probabilities (All 6 Classes)
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(result.body)
                .sort(([, a], [, b]) => b - a)
                .map(([bodyKey, prob]) => {
                  const isTop = bodyKey === result.top_body;
                  const pct = (prob * 100).toFixed(1);
                  const isRecorded = ['moon', 'mars'].includes(bodyKey);
                  const fillColor = isRecorded ? 'var(--success)' : 'var(--accent-secondary)';

                  return (
                    <div key={bodyKey} style={{
                      background: isTop ? 'var(--bg-elevated)' : 'rgba(21, 26, 36, 0.5)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: isTop ? `1px solid ${fillColor}` : '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ fontWeight: isTop ? 700 : 500, color: isTop ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {isTop ? '★ ' : ''}{BODY_LABELS[bodyKey] || bodyKey}
                          <span style={{ fontSize: '0.72rem', marginLeft: '6px', color: fillColor, opacity: 0.85 }}>
                            ({isRecorded ? 'Recorded' : 'Sonified'})
                          </span>
                        </span>
                        <strong style={{ fontFamily: 'var(--font-mono)', color: isTop ? fillColor : 'var(--text-secondary)' }}>
                          {pct}%
                        </strong>
                      </div>
                      <div className="confidence-track">
                        <div style={{
                          height: '100%',
                          width: `${Math.max(2, prob * 100)}%`,
                          background: fillColor,
                          borderRadius: 'var(--radius-sm)',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* TypeClassifier Probabilities */}
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)', fontFamily: 'var(--font-heading)' }}>
              TypeClassifier Probabilities (Recorded vs Sonified)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
              {Object.entries(result.type).map(([typeKey, prob]) => {
                const isTop = typeKey === result.top_type;
                const isRec = typeKey === 'recorded';
                const pct = (prob * 100).toFixed(1);
                const color = isRec ? 'var(--success)' : 'var(--accent-secondary)';

                return (
                  <div key={typeKey} style={{
                    background: 'var(--bg-elevated)',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: isTop ? `1px solid ${color}` : '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '8px' }}>
                      <span className={isRec ? 'badge-recorded' : 'badge-sonified'}>
                        {isRec ? '🎙️ Recorded Audio' : '📡 Sonified Data'}
                      </span>
                      <strong style={{ fontFamily: 'var(--font-mono)', color: color }}>
                        {pct}%
                      </strong>
                    </div>
                    <div className="confidence-track">
                      <div style={{
                        height: '100%',
                        width: `${Math.max(2, prob * 100)}%`,
                        background: color,
                        borderRadius: 'var(--radius-sm)',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mel-Spectrogram Rendering */}
          {result.spectrogram_b64 && (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)', fontFamily: 'var(--font-heading)' }}>
                128-Band Mel-Spectrogram Artifact (0 - 16,000 Hz)
              </h4>
              <div className="spectrogram-card">
                <img
                  src={result.spectrogram_b64}
                  alt="Telemetry Mel-Spectrogram"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '8px' }}>
                <span>0.0s (Window Start)</span>
                <span>N_mels = 128 Filterbanks · 32,000 Hz Mono</span>
                <span>5.0s (Window End)</span>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
