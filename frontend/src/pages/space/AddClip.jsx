import React, { useState } from 'react';
import { Upload, PlusCircle, CheckCircle2, AlertTriangle, Radio, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { convertBlobToWav } from '../../utils/audioToWav';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

const KNOWN_BODIES = [
  { id: 'moon', label: 'Moon' },
  { id: 'mars', label: 'Mars' },
  { id: 'jupiter', label: 'Jupiter' },
  { id: 'saturn_enceladus', label: 'Saturn & Enceladus' },
  { id: 'voyager_interstellar', label: 'Voyager Interstellar' },
  { id: 'chandra_sonification', label: 'Chandra Sonifications' },
  { id: 'other', label: '★ Other / New Celestial Body...' }
];

export default function AddClip({ onClipIngested }) {
  const { authFetch } = useAuth();

  const [mission, setMission] = useState('');
  const [selectedBody, setSelectedBody] = useState('moon');
  const [customBody, setCustomBody] = useState('');
  const [instrument, setInstrument] = useState('');
  const [audioType, setAudioType] = useState('recorded');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'warning' | 'error', message: '' }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setToast({ type: 'error', message: 'Please select an audio file to ingest.' });
      return;
    }

    const effectiveBody = selectedBody === 'other' ? customBody.trim().toLowerCase() : selectedBody;
    if (!effectiveBody) {
      setToast({ type: 'error', message: 'Please provide a celestial body identifier.' });
      return;
    }

    const effectiveAudioType = audioType === 'not_sure' ? 'sonified' : audioType;

    setLoading(true);
    setToast(null);

    let fileToSend = file;
    try {
      const wavBlob = await convertBlobToWav(file);
      fileToSend = new File([wavBlob], (file.name || 'ingested_telemetry').replace(/\.[^/.]+$/, "") + ".wav", { type: 'audio/wav' });
    } catch (convErr) {
      console.warn('WAV pre-conversion warning in AddClip:', convErr);
    }

    const formData = new FormData();
    formData.append('mission', mission.trim());
    formData.append('body', effectiveBody);
    formData.append('instrument', instrument.trim() || 'Acoustic / Plasma Sensor');
    formData.append('audio_type', effectiveAudioType);
    formData.append('description', description.trim());
    formData.append('source_url', sourceUrl.trim() || 'https://www.nasa.gov');
    formData.append('file', fileToSend);

    try {
      const res = await authFetch('/space/ingest', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ type: 'error', message: data.error?.message || data.detail || 'Ingestion failed.' });
      } else {
        if (data.is_new_category) {
          setToast({
            type: 'warning',
            message: '⚠️ New category detected — searchable now in ChromaDB, but needs retraining to classify correctly.'
          });
        } else {
          setToast({
            type: 'success',
            message: '✅ Clip added — instantly searchable in the acoustic library!'
          });
        }

        // Reset form
        setMission('');
        setInstrument('');
        setDescription('');
        setSourceUrl('');
        setFile(null);
        if (selectedBody === 'other') setCustomBody('');

        if (onClipIngested) onClipIngested();
      }
    } catch (err) {
      setToast({ type: 'error', message: `Network error during ingestion: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      
      <div className="glass-panel" style={{ padding: 'var(--space-xl) var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <PlusCircle size={22} color="var(--accent-secondary)" />
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            Ingest New Space Telemetry Clip
          </h3>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
          Instantly vectorizes telemetry into ChromaDB <strong>"space_clips"</strong> and saves metadata to MongoDB and disk.
        </p>

        {/* Toast Notification with Left Border */}
        {toast && (
          <div style={{
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-md)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg-elevated)',
            borderLeft: `3px solid ${
              toast.type === 'success'
                ? 'var(--success)'
                : (toast.type === 'warning' ? 'var(--warning)' : 'var(--error)')
            }`,
            borderTop: '1px solid var(--border-subtle)',
            borderRight: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            color: toast.type === 'success' ? 'var(--success)' : (toast.type === 'warning' ? 'var(--warning)' : 'var(--error)')
          }}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{toast.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          
          {/* Mission Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Mission Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cassini-Huygens Saturn Orbit, Voyager 1 Interstellar, Apollo 14"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Body Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Celestial Target *
              </label>
              <select
                value={selectedBody}
                onChange={(e) => setSelectedBody(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                {KNOWN_BODIES.map(b => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
            </div>

            {selectedBody === 'other' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '6px' }}>
                  Custom Body Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. europa, titan, venus, sun"
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--warning)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            )}
          </div>

          {/* Instrument & Audio Type */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Instrument / Sensor
              </label>
              <input
                type="text"
                placeholder="e.g. Triaxial Seismometer, Waves Dipole Antenna, RPWS"
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Audio Type *
              </label>
              <select
                value={audioType}
                onChange={(e) => setAudioType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="recorded">🎙️ Recorded Audio (Mechanical / Seismic Vibration)</option>
                <option value="sonified">📡 Sonified Data (Radio / Plasma Wave Translation)</option>
                <option value="not_sure">❓ Not sure (Will default to Sonified)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Scientific Acoustic Description
            </label>
            <textarea
              rows={3}
              placeholder="Describe the acoustic phenomenon, resonance frequencies, whistler dispersion, or impact sounds..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Source URL */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Source Archive URL
            </label>
            <input
              type="url"
              placeholder="https://www.nasa.gov/mission_pages/..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Audio File Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Audio Recording (.wav, .mp3, .flac, .ogg) *
            </label>
            <input
              type="file"
              required
              accept="audio/*,.wav,.mp3,.ogg,.flac"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                }
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Submit Button: Primary action -> btn-primary */}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              marginTop: '10px'
            }}
          >
            <Upload size={17} />
            <span>{loading ? 'Vectorizing and Ingesting...' : 'Ingest Space Telemetry'}</span>
          </button>

        </form>
      </div>

    </div>
  );
}
