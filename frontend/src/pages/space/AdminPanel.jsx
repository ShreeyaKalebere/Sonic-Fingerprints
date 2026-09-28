import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Database, Cpu, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export default function AdminPanel() {
  const { authFetch } = useAuth();

  const [modelInfo, setModelInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchModelInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/space/model-info`);
      if (res.ok) {
        const data = await res.json();
        setModelInfo(data);
      }
    } catch (err) {
      console.warn('Could not fetch model info:', err);
    } finally {
      setLoadingInfo(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    setErrorMsg(null);
    setRetrainResult(null);

    try {
      const res = await authFetch('/space/retrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epochs: 20 })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error?.message || data.detail || 'Retraining failed.');
      } else {
        setRetrainResult(data);
        fetchModelInfo();
      }
    } catch (err) {
      setErrorMsg(`Network error during retraining: ${err.message}`);
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      
      {/* Admin Panel Header */}
      <div className="glass-panel" style={{ padding: 'var(--space-xl) var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <ShieldCheck size={24} color="var(--accent-secondary)" />
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            ML Model Management & Retraining Studio
          </h3>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
          Inspect current neural classification head checkpoints and trigger full catalog retraining.
        </p>

        {/* Model Info Cards */}
        {loadingInfo ? (
          <div style={{ color: 'var(--text-secondary)' }}>Loading model metadata...</div>
        ) : modelInfo ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-lg)'
          }}>
            <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Model Version</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                v{modelInfo.version || '1.0.0'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Trained on Clips</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                {modelInfo.trained_on_clip_count || 6} Real Clips
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Last Retrained</span>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                {modelInfo.last_retrained_at
                  ? new Date(modelInfo.last_retrained_at).toLocaleString()
                  : 'Pretrained Baseline'}
              </div>
            </div>
          </div>
        ) : null}

        {/* Retrain Action */}
        <div style={{
          background: 'var(--bg-elevated)',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-md)'
        }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>
              Synchronize Augmented Dataset & Retrain Classifiers
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Re-slices all current /data/space audio into 3s windows, executes audiomentations, and retrains BodyClassifier and TypeClassifier.
            </p>
          </div>

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="btn-space-secondary"
          >
            <RefreshCw size={16} className={retraining ? 'spin' : ''} />
            <span>{retraining ? 'Retraining Neural Heads...' : 'Retrain Classifiers'}</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            marginTop: 'var(--space-md)',
            background: 'var(--bg-elevated)',
            borderLeft: '3px solid var(--error)',
            borderTop: '1px solid var(--border-subtle)',
            borderRight: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            color: 'var(--error)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.86rem'
          }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Retrain Result */}
        {retrainResult && (
          <div style={{
            marginTop: 'var(--space-lg)',
            background: 'var(--bg-elevated)',
            borderLeft: '3px solid var(--success)',
            borderTop: '1px solid var(--border-subtle)',
            borderRight: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', marginBottom: '12px' }}>
              <CheckCircle2 size={18} />
              <strong style={{ fontSize: '1.05rem', fontFamily: 'var(--font-heading)' }}>Retraining Complete!</strong>
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '14px' }}>
              {retrainResult.model_info?.honest_evaluation_note || retrainResult.training_report?.honest_evaluation_note}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', fontSize: '0.82rem' }}>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '8px 14px', borderRadius: 'var(--radius-sm)' }}>
                Total Augmented Samples: <strong className="font-mono">{retrainResult.model_info?.augmented_samples_count || 72}</strong>
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '8px 14px', borderRadius: 'var(--radius-sm)' }}>
                Val Body Accuracy: <strong className="font-mono">{(retrainResult.model_info?.final_val_body_accuracy * 100).toFixed(1)}%</strong>
              </div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: '8px 14px', borderRadius: 'var(--radius-sm)' }}>
                Val Type Accuracy: <strong className="font-mono">{(retrainResult.model_info?.final_val_type_accuracy * 100).toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
