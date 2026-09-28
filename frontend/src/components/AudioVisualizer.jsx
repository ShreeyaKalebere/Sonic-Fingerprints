import React, { useEffect, useRef } from 'react';

/**
 * Live Audio Frequency Visualizer using Web Audio API's AnalyserNode.
 * Renders glowing spectrum bars on a <canvas> during active recording:
 * - Room Mode: var(--accent-primary) (#FF8A3D)
 * - Space Mode: var(--accent-secondary) (#7C5CFC)
 * Automatically disconnects and cleans up all audio nodes on stop/unmount.
 */
export default function AudioVisualizer({ stream, isRecording, mode = 'room' }) {
  const canvasRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  const isSpaceMode = mode === 'space';
  const baseColor = isSpaceMode ? '#7C5CFC' : '#FF8A3D';
  const idleColor = isSpaceMode ? 'rgba(124, 92, 252, 0.2)' : 'rgba(255, 138, 61, 0.2)';
  const lightColor = isSpaceMode ? '#9E86FD' : '#FFA767';

  useEffect(() => {
    if (!isRecording || !stream) {
      // Clean up when not recording
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (e) {}
        sourceRef.current = null;
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch (e) {}
        analyserRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
        audioContextRef.current = null;
      }

      // Draw resting idle state on canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = idleColor;
        const barWidth = 4;
        const gap = 3;
        const totalBars = Math.floor(canvas.width / (barWidth + gap));
        for (let i = 0; i < totalBars; i++) {
          const x = i * (barWidth + gap);
          const y = canvas.height / 2 - 2;
          ctx.fillRect(x, y, barWidth, 4);
        }
      }
      return;
    }

    // Set up Web Audio API nodes
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128; // 64 frequency bins
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      const render = () => {
        if (!isRecording) return;

        animationFrameIdRef.current = requestAnimationFrame(render);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barCount = 36;
        const barWidth = Math.floor(canvas.width / barCount) - 3;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i * step] || 0;
          const percent = value / 255;
          const height = Math.max(6, percent * (canvas.height - 10));
          const x = i * (barWidth + 3);
          const y = canvas.height - height;

          // Mode-specific gradient
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, baseColor);
          gradient.addColorStop(1, lightColor);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, barWidth, height, [3, 3, 0, 0]);
          } else {
            ctx.rect(x, y, barWidth, height);
          }
          ctx.fill();
        }
      };

      render();

    } catch (err) {
      console.warn('AudioVisualizer setup error:', err);
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (e) {}
      }
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch (e) {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, [isRecording, stream, isSpaceMode, baseColor, idleColor, lightColor]);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 'var(--space-sm) 0'
    }}>
      <canvas
        ref={canvasRef}
        width={320}
        height={56}
        style={{
          width: '100%',
          maxWidth: '320px',
          height: '56px',
          display: 'block'
        }}
      />
    </div>
  );
}
