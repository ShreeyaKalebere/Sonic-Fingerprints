/**
 * Browser-native Audio to 16-bit PCM WAV Converter.
 * 
 * Uses Web Audio API (AudioContext) to decode any browser-supported audio format
 * (WebM Opus, MP3, AAC, Ogg, etc.) into raw Float32 samples, then packages them
 * into a clean standard PCM 16-bit WAV Blob for seamless processing by soundfile/librosa.
 */

export function audioBufferToWav(audioBuffer) {
  const numChannels = 1; // Standardize to mono for ML backbones
  const sampleRate = audioBuffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;

  // Extract mono channel or downmix multi-channel to mono
  let channelData;
  if (audioBuffer.numberOfChannels === 1) {
    channelData = audioBuffer.getChannelData(0);
  } else {
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    channelData = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      channelData[i] = (left[i] + right[i]) / 2;
    }
  }

  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataByteCount = channelData.length * bytesPerSample;
  const totalBufferSize = 44 + dataByteCount;

  const arrayBuffer = new ArrayBuffer(totalBufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteCount, true);
  writeString(8, 'WAVE');

  // "fmt " sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // "data" sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataByteCount, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

export async function convertBlobToWav(rawBlobOrFile) {
  if (!rawBlobOrFile) return null;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    console.warn('AudioContext not available; returning raw blob');
    return rawBlobOrFile;
  }

  const audioCtx = new AudioContextClass();
  try {
    const arrayBuffer = await rawBlobOrFile.arrayBuffer();
    // decodeAudioData consumes the arrayBuffer, returns an AudioBuffer
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const wavBlob = audioBufferToWav(audioBuffer);
    return wavBlob;
  } catch (err) {
    console.error('Failed to decode/convert audio to WAV in browser:', err);
    throw err;
  } finally {
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
    }
  }
}
