import { useState, useRef, useEffect, useCallback } from 'react';
import { convertBlobToWav } from '../utils/audioToWav';

/**
 * Custom React hook for recording audio via browser MediaRecorder.
 * Enforces a strict 10-second automatic cutoff, provides active live stream for AudioVisualizer,
 * and handles microphone permission denials with clear error states.
 */
export function useAudioRecorder(initialMaxDuration = 30) {
  const [maxDuration, setMaxDuration] = useState(initialMaxDuration);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioStream, setAudioStream] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const activeStreamRef = useRef(null);

  // Clear previous blob URL on unmount or reset
  useEffect(() => {
    return () => {
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [recordedUrl]);

  // Cleanly stop media recording
  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
      }
    }

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(track => track.stop());
      activeStreamRef.current = null;
    }

    setAudioStream(null);
    setIsRecording(false);
  }, []);

  // Automatic cutoff at maxDuration (defaults to 30 seconds)
  useEffect(() => {
    if (isRecording && elapsedSeconds >= maxDuration) {
      stopRecording();
    }
  }, [isRecording, elapsedSeconds, maxDuration, stopRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    setPermissionDenied(false);
    setRecordedBlob(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setElapsedSeconds(0);
    audioChunksRef.current = [];

    // Check mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Audio recording is not supported in this browser environment.';
      setErrorMessage(msg);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // keep ambient room noise intact
          autoGainControl: false,
          sampleRate: 44100
        }
      });

      activeStreamRef.current = stream;
      setAudioStream(stream);

      // Pick supported mime type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        ''
      ];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (!mime || MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const recorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const mime = selectedMimeType || 'audio/webm';
        const rawBlob = new Blob(audioChunksRef.current, { type: mime });
        try {
          // Decode browser recording and re-encode to pristine 16-bit PCM WAV
          const wavBlob = await convertBlobToWav(rawBlob);
          setRecordedBlob(wavBlob);
          const url = URL.createObjectURL(wavBlob);
          setRecordedUrl(url);
        } catch (convErr) {
          console.warn('WAV conversion fallback to raw blob:', convErr);
          setRecordedBlob(rawBlob);
          const url = URL.createObjectURL(rawBlob);
          setRecordedUrl(url);
        }
      };

      recorder.start(250); // timeslice 250ms for chunking
      setIsRecording(true);

      // Start elapsed timer (updates every second)
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to access microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser to record room acoustics.');
      } else {
        setErrorMessage(`Microphone error: ${err.message || 'Unable to access audio device'}`);
      }
      setIsRecording(false);
      setAudioStream(null);
    }
  }, [recordedUrl]);

  // Reset all state
  const resetRecording = useCallback(() => {
    stopRecording();
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setRecordedBlob(null);
    setElapsedSeconds(0);
    setErrorMessage(null);
    setPermissionDenied(false);
  }, [stopRecording, recordedUrl]);

  // Set recorded blob manually (for file uploads or sample test audio)
  const setCustomAudioBlob = useCallback(async (blob, filename = 'custom_audio.wav') => {
    resetRecording();
    try {
      const wavBlob = await convertBlobToWav(blob);
      const namedBlob = new File([wavBlob], filename.replace(/\.[^/.]+$/, "") + ".wav", { type: 'audio/wav' });
      setRecordedBlob(namedBlob);
      const url = URL.createObjectURL(namedBlob);
      setRecordedUrl(url);
      setElapsedSeconds(10);
    } catch (e) {
      const namedBlob = new File([blob], filename, { type: blob.type || 'audio/wav' });
      setRecordedBlob(namedBlob);
      const url = URL.createObjectURL(namedBlob);
      setRecordedUrl(url);
      setElapsedSeconds(10);
    }
  }, [resetRecording]);

  return {
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
    remainingSeconds: Math.max(0, maxDuration - elapsedSeconds),
    audioStream,
    permissionDenied,
    errorMessage
  };
}
