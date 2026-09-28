import React, { useState, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  RotateCcw, 
  Upload, 
  Layers, 
  Home, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Radio, 
  Volume2,
  FileAudio,
  Loader2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import AudioVisualizer from '../components/AudioVisualizer';
import ResultsPanel from '../components/ResultsPanel';
import { convertBlobToWav } from '../utils/audioToWav';

export default function RoomRecord({ onRoomRegistered, targetRoomForTest }) {
  const { authFetch } = useAuth();
  const {
    startRecording,
    stopRecording,
    resetRecording,
    setCustomAudioBlob,
    isRecording,
    recordedBlob,
    recordedUrl,
    elapsedSeconds,
    maxDuration,
    setMaxDuration,
    remainingSeconds,
    audioStream,
    permissionDenied,
    errorMessage: recorderError
  } = useAudioRecorder(30);

  const [loading, setLoading] = useState(false);
  const [pipelineError, setPipelineError] = useState(null);
  const [classificationResult, setClassificationResult] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [showDirectRegisterModal, setShowDirectRegisterModal] = useState(false);
  const [directRoomName, setDirectRoomName] = useState('');
  const [directRegisterError, setDirectRegisterError] = useState(null);
  const [directRegistering, setDirectRegistering] = useState(false);

  // Live Continuous Auto-Detection State
  const [isLiveMonitoring, setIsLiveMonitoring] = useState(false);
  const [liveCycleCount, setLiveCycleCount] = useState(0);
  const [isLiveAnalyzing, setIsLiveAnalyzing] = useState(false);
  const [liveRecordedBlob, setLiveRecordedBlob] = useState(null);
  const isLiveMonitoringRef = useRef(false);
  const liveStreamRef = useRef(null);
  const liveRecorderRef = useRef(null);
  const liveTimeoutRef = useRef(null);

  // Stop live monitoring cleanly
  const stopLiveMonitoring = () => {
    isLiveMonitoringRef.current = false;
    setIsLiveMonitoring(false);
    setIsLiveAnalyzing(false);

    if (liveTimeoutRef.current) {
      clearTimeout(liveTimeoutRef.current);
      liveTimeoutRef.current = null;
    }
    if (liveRecorderRef.current && liveRecorderRef.current.state !== 'inactive') {
      try { liveRecorderRef.current.stop(); } catch (e) {}
    }
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach(track => track.stop());
      liveStreamRef.current = null;
    }
  };

  // Run periodic 4-second audio slice analysis loop
  const runLiveCycle = (stream) => {
    if (!isLiveMonitoringRef.current) return;

    const chunks = [];
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    }

    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      liveRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (!isLiveMonitoringRef.current) return;
        if (chunks.length > 0) {
          setIsLiveAnalyzing(true);
          try {
            const rawBlob = new Blob(chunks, { type: mimeType });
            const wavBlob = await convertBlobToWav(rawBlob);
            setLiveRecordedBlob(wavBlob);

            const classifyForm = new FormData();
            classifyForm.append('file', wavBlob, 'live_sample.wav');

            const matchForm = new FormData();
            matchForm.append('file', wavBlob, 'live_sample.wav');

            const [classifyRes, matchRes] = await Promise.all([
              authFetch('/room/classify', { method: 'POST', body: classifyForm }),
              authFetch('/room/match', { method: 'POST', body: matchForm })
            ]);

            if (classifyRes.ok && isLiveMonitoringRef.current) {
              const classifyData = await classifyRes.json();
              setClassificationResult(classifyData);
            }
            if (matchRes.ok && isLiveMonitoringRef.current) {
              const matchData = await matchRes.json();
              setMatchResult(matchData);
            }
            setLiveCycleCount(prev => prev + 1);
          } catch (cycleErr) {
            console.warn('Live monitoring cycle warning:', cycleErr);
          } finally {
            setIsLiveAnalyzing(false);
          }
        }

        // Schedule next cycle if still active
        if (isLiveMonitoringRef.current && liveStreamRef.current) {
          liveTimeoutRef.current = setTimeout(() => {
            runLiveCycle(liveStreamRef.current);
          }, 800);
        }
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 4000);
    } catch (recErr) {
      console.error('MediaRecorder start error in live cycle:', recErr);
      stopLiveMonitoring();
    }
  };

  // Start live continuous monitoring
  const startLiveMonitoring = async () => {
    try {
      setPipelineError(null);
      isLiveMonitoringRef.current = true;
      setIsLiveMonitoring(true);
      setLiveCycleCount(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      });
      liveStreamRef.current = stream;
      runLiveCycle(stream);
    } catch (err) {
      console.error('Failed to start live monitor:', err);
      setPipelineError(`Microphone access error: ${err.message}`);
      stopLiveMonitoring();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveMonitoring();
    };
  }, []);

  const fileInputRef = useRef(null);

  // Handle file upload fallback
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !/\.(wav|mp3|ogg|flac|m4a|webm)$/i.test(file.name)) {
      setPipelineError('Please select a valid audio file (WAV, MP3, OGG, FLAC, WEBM).');
      return;
    }

    setPipelineError(null);
    setClassificationResult(null);
    setMatchResult(null);
    await setCustomAudioBlob(file, file.name);
  };

  // Run Classify and Match in parallel
  const handleClassifyAndMatch = async () => {
    if (!recordedBlob) return;

    setLoading(true);
    setPipelineError(null);

    try {
      // Ensure audio payload is converted to clean 16-bit PCM WAV
      let wavBlob = recordedBlob;
      try {
        wavBlob = await convertBlobToWav(recordedBlob);
      } catch (convErr) {
        console.warn('WAV conversion warning:', convErr);
      }

      const classifyForm = new FormData();
      classifyForm.append('file', wavBlob, 'audio_sample.wav');

      const matchForm = new FormData();
      matchForm.append('file', wavBlob, 'audio_sample.wav');

      const [classifyRes, matchRes] = await Promise.all([
        authFetch('/room/classify', { method: 'POST', body: classifyForm }),
        authFetch('/room/match', { method: 'POST', body: matchForm })
      ]);

      const classifyData = await classifyRes.json();
      const matchData = await matchRes.json();

      if (!classifyRes.ok) {
        throw new Error(classifyData.error?.message || classifyData.detail || 'Classification failed.');
      }
      if (!matchRes.ok) {
        throw new Error(matchData.error?.message || matchData.detail || 'Room matching failed.');
      }

      setClassificationResult(classifyData);
      setMatchResult(matchData);
    } catch (err) {
      console.error('Pipeline processing error:', err);
      setPipelineError(`Pipeline error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Direct registration from Review state
  const handleDirectRegister = async (e) => {
    e.preventDefault();
    const cleanName = directRoomName.trim();
    if (!cleanName) {
      setDirectRegisterError('Room name is required.');
      return;
    }

    setDirectRegistering(true);
    setDirectRegisterError(null);

    try {
      // Ensure audio payload is converted to clean 16-bit PCM WAV
      let wavBlob = recordedBlob;
      try {
        wavBlob = await convertBlobToWav(recordedBlob);
      } catch (convErr) {
        console.warn('WAV conversion warning:', convErr);
      }

      const formData = new FormData();
      formData.append('file', wavBlob, 'registered_room.wav');
      formData.append('room_name', cleanName);

      const res = await authFetch('/room/register', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data.error?.message || data.detail || 'Room registration failed.';
        setDirectRegisterError(msg);
        setDirectRegistering(false);
        return;
      }

      setShowDirectRegisterModal(false);
      setDirectRoomName('');
      if (onRoomRegistered) {
        onRoomRegistered(cleanName);
      }
      // Also automatically trigger classify & match to show the user the new match!
      await handleClassifyAndMatch();
    } catch (err) {
      setDirectRegisterError(`Network error: ${err.message}`);
    } finally {
      setDirectRegistering(false);
    }
  };

  const handleFullReset = () => {
    resetRecording();
    setClassificationResult(null);
    setMatchResult(null);
    setPipelineError(null);
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      
      {/* Target Room notice if user clicked "Test against this room" */}
      {targetRoomForTest && (
        <div style={{
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Home size={18} color="var(--accent-cyan)" />
          <span style={{ fontSize: '0.88rem' }}>
            Testing acoustic fingerprint against target room: <strong style={{ color: 'var(--accent-cyan)' }}>"{targetRoomForTest}"</strong>
          </span>
        </div>
      )}

      {/* Main Recording Console */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '36px 28px', 
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 15, 36, 0.95) 100%)',
          borderRadius: '24px'
        }}
      >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            Physical Room Fingerprint Recorder
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '540px', margin: '6px auto 0 auto' }}>
            Capture up to {maxDuration} seconds of ambient environmental noise to identify or register physical spaces.
          </p>

        {/* Mode Switch: Manual Snapshot vs Live Continuous Auto-Detect */}
        {!recordedBlob && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
            <button
              id="btn-mode-snapshot"
              type="button"
              disabled={isRecording || isLiveMonitoring}
              onClick={() => {}}
              style={{
                padding: '7px 18px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: !isLiveMonitoring ? '1px solid var(--accent-primary)' : '1px solid rgba(148, 163, 184, 0.2)',
                background: !isLiveMonitoring ? 'rgba(255, 138, 61, 0.15)' : 'transparent',
                color: !isLiveMonitoring ? 'var(--accent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Manual Snapshot
            </button>
            <button
              id="btn-mode-live-monitor"
              type="button"
              disabled={isRecording}
              onClick={isLiveMonitoring ? stopLiveMonitoring : startLiveMonitoring}
              style={{
                padding: '7px 18px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                border: isLiveMonitoring ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.4)',
                background: isLiveMonitoring ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.08)',
                color: isLiveMonitoring ? '#f87171' : '#fca5a5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isLiveMonitoring ? '0 0 15px rgba(239, 68, 68, 0.3)' : 'none'
              }}
            >
              <span className={isLiveMonitoring ? "radar-live-dot" : ""} style={!isLiveMonitoring ? { width: 8, height: 8, borderRadius: '50%', background: '#ef4444' } : {}} />
              {isLiveMonitoring ? `Live Monitor Active (Scan #${liveCycleCount})` : '⚡ Live Auto-Detect'}
            </button>
          </div>
        )}

        {/* Recording Duration Preset Selector (when not recording or reviewing) */}
        {!recordedBlob && !loading && !isLiveMonitoring && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Duration:
            </span>
            {[10, 15, 30, 60].map(dur => (
              <button
                key={dur}
                type="button"
                disabled={isRecording}
                onClick={() => setMaxDuration(dur)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: isRecording ? 'not-allowed' : 'pointer',
                  border: maxDuration === dur ? '1px solid var(--accent-cyan)' : '1px solid rgba(148, 163, 184, 0.2)',
                  background: maxDuration === dur ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  color: maxDuration === dur ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                {dur}s
              </button>
            ))}
          </div>
        )}

        {/* Permission Denied / Recorder Error Alert */}
        {(permissionDenied || recorderError) && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            padding: '14px 18px',
            borderRadius: '12px',
            color: '#fb7185',
            fontSize: '0.88rem',
            marginBottom: '24px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Microphone Error:</strong> {recorderError || 'Permission denied.'}
              <div style={{ marginTop: '6px', fontSize: '0.82rem', color: '#fda4af' }}>
                Tip: You can also upload any pre-recorded audio file (.wav, .mp3) below to test the room recognition pipeline.
              </div>
            </div>
          </div>
        )}

        {/* Pipeline Error with Retry */}
        {pipelineError && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            padding: '14px 18px',
            borderRadius: '12px',
            color: '#fb7185',
            fontSize: '0.88rem',
            marginBottom: '24px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} />
              <span>{pipelineError}</span>
            </div>
            <button
              onClick={handleClassifyAndMatch}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* LIVE MONITORING VIEW                                          */}
        {/* ------------------------------------------------------------- */}
        {isLiveMonitoring && (
          <div style={{ padding: '24px 10px', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                border: '3px solid #ef4444',
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(15, 23, 42, 0.9) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 35px rgba(239, 68, 68, 0.4)',
                position: 'relative'
              }}>
                <Radio size={42} color="#f87171" />
              </div>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '9999px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#f87171', fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px' }}>
              <span className="radar-live-dot" />
              LIVE CONTINUOUS MONITORING ACTIVE
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '18px' }}>
              {isLiveAnalyzing ? (
                <span style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Analyzing live acoustic window • Scan #{liveCycleCount + 1}...
                </span>
              ) : (
                <span>Sampling ambient background (auto-updating every 4s) • Completed Scans: {liveCycleCount}</span>
              )}
            </div>

            <button
              id="btn-stop-live-monitor"
              type="button"
              onClick={stopLiveMonitoring}
              className="btn-secondary"
              style={{ border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', padding: '10px 24px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Square size={16} fill="#fca5a5" />
              Stop Live Monitoring
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STATE A: IDLE / RECORDING                                     */}
        {/* ------------------------------------------------------------- */}
        {!recordedBlob && !loading && !isLiveMonitoring && (
          <div>
            {/* Record / Stop Button */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-lg) 0' }}>
              <button
                id="btn-toggle-record"
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                  width: '92px',
                  height: '92px',
                  borderRadius: '50%',
                  border: isRecording ? '3px solid var(--error)' : '3px solid var(--accent-primary)',
                  background: isRecording
                    ? 'radial-gradient(circle, var(--error) 0%, #991b1b 100%)'
                    : 'var(--accent-primary)',
                  color: isRecording ? '#ffffff' : 'var(--bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: isRecording
                    ? '0 0 35px rgba(255, 92, 92, 0.6)'
                    : '0 0 30px var(--accent-primary-glow)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {isRecording ? <Square size={34} fill="#fff" /> : <Mic size={36} strokeWidth={2.3} />}
              </button>
            </div>

            {/* Countdown / Recording Status */}
            {isRecording ? (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <div className="countdown-display" style={{ marginBottom: '8px' }}>
                  {String(Math.floor((maxDuration - elapsedSeconds) / 60)).padStart(2, '0')}:{String((maxDuration - elapsedSeconds) % 60).padStart(2, '0')}
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 18px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 138, 61, 0.12)',
                  border: '1px solid rgba(255, 138, 61, 0.3)'
                }}>
                  <span className="pulse-dot amber" />
                  <span className="font-mono" style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--accent-primary)' }}>
                    Recording acoustic noise ({elapsedSeconds}s / {maxDuration}s) — Click square to stop
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Click microphone to record live audio (up to {maxDuration}s — stop anytime)
              </div>
            )}

            {/* Live Audio Visualizer */}
            <AudioVisualizer stream={audioStream} isRecording={isRecording} mode="room" />

            {/* Fallback File Upload Area */}
            {!isRecording && (
              <div style={{
                marginTop: 'var(--space-lg)',
                paddingTop: 'var(--space-md)',
                borderTop: '1px dashed var(--border-subtle)'
              }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  id="btn-upload-file-fallback"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '8px 18px' }}
                >
                  <Upload size={15} />
                  Or upload an audio sample (.wav, .mp3)
                </button>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STATE B: REVIEW RECORDED AUDIO                                */}
        {/* ------------------------------------------------------------- */}
        {recordedBlob && !loading && !classificationResult && (
          <div style={{ padding: '10px 0', animation: 'fadeIn 0.3s ease' }}>
            
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '14px', color: 'var(--accent-cyan)' }}>
                <Volume2 size={20} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Audio Sample Ready for Analysis</span>
              </div>

              {recordedUrl && (
                <audio
                  id="audio-player-review"
                  controls
                  src={recordedUrl}
                  style={{ width: '100%', maxWidth: '480px', height: '42px', outline: 'none' }}
                />
              )}
            </div>

            {/* Review Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                id="btn-classify-only"
                onClick={handleClassifyAndMatch}
                className="btn-primary"
                style={{ padding: '12px 24px', fontSize: '0.95rem' }}
              >
                <Sparkles size={17} />
                Classify & Match Room
              </button>

              <button
                id="btn-register-new-room"
                onClick={() => setShowDirectRegisterModal(true)}
                className="btn-secondary"
                style={{ padding: '12px 22px', fontSize: '0.95rem' }}
              >
                <Home size={17} />
                Register as New Room
              </button>

              <button
                id="btn-discard-rerecord"
                onClick={handleFullReset}
                className="btn-secondary"
                style={{ padding: '12px 20px', fontSize: '0.95rem', color: '#fb7185' }}
              >
                <RotateCcw size={16} />
                Discard & Re-record
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STATE C: PROCESSING SPINNER                                   */}
        {/* ------------------------------------------------------------- */}
        {loading && (
          <div style={{ padding: '40px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <Loader2 size={44} color="var(--accent-cyan)" className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Analyzing Acoustic Fingerprint...
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>
              Running 128-band Mel-Spectrogram extraction and PANNs deep acoustic embedding.
            </p>
          </div>
        )}

      </div>

      {/* ------------------------------------------------------------- */}
      {/* STATE D: RESULTS PANEL                                        */}
      {/* ------------------------------------------------------------- */}
      {classificationResult && matchResult && (
        <ResultsPanel
          classificationData={classificationResult}
          matchData={matchResult}
          recordedBlob={recordedBlob || liveRecordedBlob}
          onReset={handleFullReset}
          onRoomRegistered={onRoomRegistered}
        />
      )}

      {/* DIRECT REGISTRATION MODAL */}
      {showDirectRegisterModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div 
            className="glass-panel" 
            style={{ 
              maxWidth: '460px', 
              width: '100%', 
              padding: '28px', 
              position: 'relative',
              background: '#0c1229',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
          >
            <button
              onClick={() => {
                setShowDirectRegisterModal(false);
                setDirectRegisterError(null);
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
              <Home size={22} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Register This Room</h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Save this 10-second acoustic recording into ChromaDB as a reference signature for this space.
            </p>

            {directRegisterError && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                padding: '10px 14px',
                borderRadius: '8px',
                color: '#fb7185',
                fontSize: '0.85rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{directRegisterError}</span>
              </div>
            )}

            <form onSubmit={handleDirectRegister}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Room Name
                </label>
                <input
                  id="input-direct-room-name"
                  type="text"
                  placeholder="e.g. Living Room, Studio B, Conference Hall"
                  value={directRoomName}
                  onChange={(e) => setDirectRoomName(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowDirectRegisterModal(false)}
                  className="btn-secondary"
                  disabled={directRegistering}
                >
                  Cancel
                </button>
                <button
                  id="btn-direct-submit-register"
                  type="submit"
                  className="btn-primary"
                  disabled={directRegistering}
                >
                  {directRegistering ? 'Registering...' : 'Save Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
