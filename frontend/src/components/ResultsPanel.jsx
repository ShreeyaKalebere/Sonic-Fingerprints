import React, { useState } from 'react';
import { 
  CheckCircle2, 
  HelpCircle, 
  PlusCircle, 
  Activity, 
  Layers, 
  Sparkles, 
  Home, 
  RefreshCw,
  AlertCircle,
  FileText,
  Download,
  Printer,
  ShieldCheck,
  Award,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ResultsPanel({
  classificationData,
  matchData,
  recordedBlob,
  onReset,
  onRoomRegistered
}) {
  const { authFetch } = useAuth();
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [justRegistered, setJustRegistered] = useState(null);

  // Parse classification probabilities and sort descending
  const classification = classificationData?.classification || {};
  const sortedClasses = Object.entries(classification).sort((a, b) => b[1] - a[1]);
  const topLabel = classificationData?.top_label || sortedClasses[0]?.[0] || 'Unknown';
  const spectrogramB64 = classificationData?.spectrogram_b64;

  const isMatched = matchData?.matched || !!justRegistered;
  const matchedRoomName = justRegistered?.room_name || matchData?.room_name;
  const similarityScore = justRegistered ? 1.0 : (matchData?.similarity ?? 0.0);
  const similarityPercent = Math.round(similarityScore * 100);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const cleanName = roomNameInput.trim();
    if (!cleanName) {
      setRegisterError('Room name cannot be empty.');
      return;
    }

    if (!recordedBlob) {
      setRegisterError('Audio recording is missing.');
      return;
    }

    setRegistering(true);
    setRegisterError(null);

    try {
      const formData = new FormData();
      formData.append('file', recordedBlob, 'room_recording.wav');
      formData.append('room_name', cleanName);

      const res = await authFetch('/room/register', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error?.message || data.detail || 'Failed to register room.';
        setRegisterError(errorMsg);
        setRegistering(false);
        return;
      }

      // Success
      setJustRegistered({ room_name: cleanName, room_id: data.room_id });
      setShowRegisterModal(false);
      setRoomNameInput('');
      if (onRoomRegistered) {
        onRoomRegistered(cleanName);
      }
    } catch (err) {
      setRegisterError(`Network error: ${err.message}`);
    } finally {
      setRegistering(false);
    }
  };

  const handleDownloadJson = () => {
    const reportData = {
      title: "Sonic Fingerprint Acoustic Certificate",
      generated_at: new Date().toISOString(),
      match_result: {
        matched: isMatched,
        room_name: matchedRoomName || "Unregistered Space",
        similarity_score: similarityScore,
        similarity_percentage: `${similarityPercent}%`,
        threshold: ">= 85%"
      },
      environment_classification: {
        top_label: topLabel,
        all_classes: Object.fromEntries(sortedClasses)
      },
      backbone: "PANNs Cnn14 (2,048-dim embedding)",
      sample_rate: "32,000 Hz",
      spectrogram_mel_bands: 128
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sonic_fingerprint_report_${(matchedRoomName || topLabel).replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginTop: 'var(--space-lg)', animation: 'fadeIn 0.3s ease' }}>
      
      {/* 1. ROOM MATCH CARD */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: 'var(--space-md) var(--space-lg)', 
          marginBottom: 'var(--space-lg)',
          borderLeft: isMatched ? '4px solid var(--success)' : '4px solid var(--warning)',
          background: isMatched 
            ? 'linear-gradient(135deg, rgba(61, 220, 151, 0.08) 0%, var(--bg-secondary) 100%)'
            : 'linear-gradient(135deg, rgba(255, 200, 87, 0.08) 0%, var(--bg-secondary) 100%)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: isMatched ? 'var(--success)' : 'var(--warning)' }}>
              Acoustic Fingerprint Match
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              {isMatched ? (
                <>
                  <CheckCircle2 size={24} color="var(--success)" />
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                    {matchedRoomName}
                  </h3>
                </>
              ) : (
                <>
                  <HelpCircle size={24} color="var(--warning)" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                    No matching room found
                  </h3>
                </>
              )}
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              {isMatched
                ? `Acoustic signature matches registered room with ${similarityPercent}% cosine similarity (threshold >= 85%).`
                : 'This acoustic signature does not closely match any of your currently registered rooms.'}
            </p>
          </div>

          {/* Right badge and CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isMatched ? (
              <div style={{
                background: 'rgba(61, 220, 151, 0.15)',
                border: '1px solid var(--success)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 18px',
                textAlign: 'center'
              }}>
                <span className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>
                  {similarityPercent}%
                </span>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Similarity
                </span>
              </div>
            ) : (
              <button
                id="btn-register-room-cta"
                onClick={() => setShowRegisterModal(true)}
                className="btn-primary"
                style={{ padding: '10px 18px', fontSize: '0.88rem' }}
              >
                <PlusCircle size={16} />
                Register This Room
              </button>
            )}

            <button
              id="btn-export-certificate"
              onClick={() => setShowCertificateModal(true)}
              className="btn-secondary"
              style={{ padding: '10px 16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              title="Generate & Export Acoustic Certificate"
            >
              <FileText size={16} color="var(--accent-primary)" />
              <span>Certificate</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DUAL COLUMN: CLASSIFICATION + SPECTROGRAM */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        
        {/* Left: Environment Classification Probabilities */}
        <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--accent-primary)" />
              Environment Classification
            </h4>
            <span className="badge-recorded" style={{ textTransform: 'capitalize' }}>
              Top: {topLabel.replace('_', ' ')}
            </span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            Acoustic environment categorization produced by deep feedforward head:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sortedClasses.map(([label, score]) => {
              const pct = Math.round(score * 100);
              const isTop = label === topLabel;
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ 
                      fontWeight: isTop ? 700 : 500, 
                      color: isTop ? 'var(--text-primary)' : 'var(--text-secondary)',
                      textTransform: 'capitalize',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {isTop && <Sparkles size={13} color="var(--accent-primary)" />}
                      {label.replace('_', ' ')}
                    </span>
                    <span className="font-mono" style={{ fontWeight: 600, color: isTop ? 'var(--accent-primary)' : 'var(--text-disabled)' }}>
                      {pct}%
                    </span>
                  </div>

                  {/* Horizontal progress bar */}
                  <div className="confidence-track">
                    <div 
                      className="confidence-fill-room"
                      style={{
                        width: `${Math.max(4, pct)}%`,
                        opacity: isTop ? 1 : 0.65
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Mel-Spectrogram Visualization */}
        <div className="glass-panel" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--accent-secondary)" />
              Extracted Mel-Spectrogram
            </h4>
            <span className="badge-sonified">128 Mel Bands</span>
          </div>

          <div className="spectrogram-card" style={{ minHeight: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {spectrogramB64 ? (
              <img
                src={spectrogramB64}
                alt="Room Mel-Spectrogram"
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 'var(--radius-sm)' }}
              />
            ) : (
              <div style={{ color: 'var(--text-disabled)', fontSize: '0.85rem' }}>
                Spectrogram unavailable
              </div>
            )}
          </div>

          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>Window: 5.0s normalized</span>
            <span className="font-mono">Sample Rate: 32 kHz</span>
            <span>Colormap: Magma</span>
          </div>
        </div>

      </div>

      {/* 3. BOTTOM ACTIONS */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: 'var(--space-md)' }}>
        <button
          onClick={onReset}
          className="btn-secondary"
        >
          <RefreshCw size={15} />
          Record Another Audio Clip
        </button>
      </div>

      {/* REGISTRATION MODAL */}
      {showRegisterModal && (
        <div className="modal-backdrop">
          <div 
            className="modal-content" 
            style={{ maxWidth: '460px' }}
          >
            <button
              onClick={() => {
                setShowRegisterModal(false);
                setRegisterError(null);
              }}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Home size={22} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Register New Room</h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Store this audio fingerprint in ChromaDB to recognize this physical room in future recordings.
            </p>

            {registerError && (
              <div className="toast-box toast-error" style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
                <AlertCircle size={16} color="var(--error)" />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Room Name
                </label>
                <input
                  id="input-register-room-name"
                  type="text"
                  placeholder="e.g. Master Bedroom, Acoustic Studio, Kitchen"
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="btn-secondary"
                  disabled={registering}
                >
                  Cancel
                </button>
                <button
                  id="btn-modal-submit-register"
                  type="submit"
                  className="btn-primary"
                  disabled={registering}
                >
                  {registering ? 'Fingerprinting...' : 'Save Room Fingerprint'}
                </button>
              </div>
            </form>
          </div>
      {/* 4. OFFICIAL ACOUSTIC CERTIFICATE MODAL */}
      {showCertificateModal && (
        <div className="modal-backdrop" style={{ animation: 'fadeIn 0.2s ease', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div 
            className="modal-content printable-certificate" 
            style={{ 
              maxWidth: '680px', 
              width: '95%',
              padding: '30px 34px',
              borderRadius: '20px',
              background: 'linear-gradient(180deg, #111827 0%, #0b0f19 100%)',
              border: '1px solid rgba(255, 138, 61, 0.4)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ff8a3d, #7c5cfc)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(255, 138, 61, 0.3)'
                }}>
                  <ShieldCheck size={26} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                    ACOUSTIC VERIFICATION CERTIFICATE
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Sonic Fingerprint Deep Acoustic Neural System • PANNs Verification
                  </span>
                </div>
              </div>
              <button 
                className="no-print btn-icon"
                onClick={() => setShowCertificateModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Certificate Body Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Identified Space
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {matchedRoomName || "Unregistered Space"}
                </div>
                <div style={{ fontSize: '0.8rem', color: isMatched ? 'var(--success)' : 'var(--warning)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={14} />
                  {isMatched ? `Verified (${similarityPercent}% Match)` : 'Acoustic Fingerprint Cataloged'}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Environment Profile
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '4px', textTransform: 'capitalize' }}>
                  {topLabel.replace('_', ' ')}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Confidence: {Math.round((sortedClasses[0]?.[1] || 0) * 100)}% Top Affinity
                </div>
              </div>
            </div>

            {/* Embedded Spectrogram Snapshot */}
            {spectrogramB64 && (
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    128-Mel Band Acoustic Signature Snapshot
                  </span>
                  <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Sample Rate: 32 kHz • Window: 5.0s
                  </span>
                </div>
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#000' }}>
                  <img src={spectrogramB64} alt="Acoustic Spectrogram" style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                </div>
              </div>
            )}

            {/* Verification Metadata Footer */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span>Backbone: </span>
                <strong style={{ color: 'var(--text-secondary)' }}>PANNs Cnn14 (2,048-D)</strong>
              </div>
              <div>
                <span>Timestamp: </span>
                <strong style={{ color: 'var(--text-secondary)' }}>{new Date().toLocaleString()}</strong>
              </div>
              <div>
                <span>Status: </span>
                <strong style={{ color: 'var(--success)' }}>AUTHENTICATED</strong>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                id="btn-certificate-download-json"
                type="button"
                onClick={handleDownloadJson}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <Download size={14} />
                Download JSON
              </button>
              <button
                id="btn-certificate-print"
                type="button"
                onClick={() => window.print()}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <Printer size={14} />
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
