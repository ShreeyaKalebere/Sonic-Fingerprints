import os
import pathlib
from typing import Optional, Union, Tuple
import numpy as np
import requests
import torch

HF_PANNS_WEIGHTS_URL = "https://huggingface.co/thelou1s/panns-inference/resolve/main/Cnn14_mAP=0.431.pth"
HF_PANNS_LABELS_URL = "https://raw.githubusercontent.com/qiuqiangkong/audioset_tagging_cnn/master/metadata/class_labels_indices.csv"

def _pre_ensure_labels_csv():
    try:
        home = pathlib.Path.home()
        panns_dir = home / "panns_data"
        panns_dir.mkdir(parents=True, exist_ok=True)
        csv_path = panns_dir / "class_labels_indices.csv"
        if not csv_path.exists():
            repo_csv = pathlib.Path(__file__).resolve().parent.parent / "panns_data" / "class_labels_indices.csv"
            if repo_csv.exists():
                import shutil
                shutil.copyfile(str(repo_csv), str(csv_path))
            else:
                resp = requests.get(HF_PANNS_LABELS_URL, timeout=10)
                if resp.status_code == 200:
                    with open(csv_path, 'wb') as f:
                        f.write(resp.content)
    except Exception:
        pass

_pre_ensure_labels_csv()

try:
    import panns_inference
except Exception:
    panns_inference = None


class AcousticBackbone:
    """
    Pretrained acoustic embedding backbone using PANNs (Cnn14 trained on AudioSet).
    Extracts high-dimensional acoustic representations (2048-dim vectors)
    for both Room Acoustic Signatures and Cosmic/Space Sonification Audio.
    """

    def __init__(
        self,
        checkpoint_path: Optional[Union[str, pathlib.Path]] = None,
        device: Optional[str] = None
    ):
        # Determine device
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        self.checkpoint_path = self._resolve_checkpoint(checkpoint_path)
        self._ensure_labels_csv()
        self.model = None
        self._load_model()

    def _resolve_checkpoint(self, checkpoint_path: Optional[Union[str, pathlib.Path]]) -> str:
        """Find or download the PANNs Cnn14 weights safely without requiring system wget."""
        if checkpoint_path and os.path.exists(checkpoint_path):
            return str(checkpoint_path)

        home = pathlib.Path.home()
        candidates = [
            home / "panns_data" / "Cnn14_mAP=0.431.pth",
            home / ".cache" / "panns_data" / "Cnn14_mAP=0.431.pth",
            pathlib.Path(__file__).parent.parent / "models" / "Cnn14_mAP=0.431.pth"
        ]

        for cand in candidates:
            if cand.exists() and cand.stat().st_size > 3e8:
                return str(cand)

        # Target download location
        target_path = candidates[0]
        target_path.parent.mkdir(parents=True, exist_ok=True)

        print(f"[AcousticBackbone] Downloading PANNs Cnn14 weights to {target_path} ...")
        with requests.get(HF_PANNS_WEIGHTS_URL, stream=True, timeout=60) as resp:
            resp.raise_for_status()
            with open(target_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=1024 * 1024 * 4):
                    if chunk:
                        f.write(chunk)
        print(f"[AcousticBackbone] Checkpoint downloaded successfully ({target_path.stat().st_size} bytes).")
        return str(target_path)

    def _ensure_labels_csv(self):
        """Ensure class labels indices CSV exists so panns_inference does not invoke wget."""
        labels_path = pathlib.Path.home() / "panns_data" / "class_labels_indices.csv"
        if not labels_path.exists():
            labels_path.parent.mkdir(parents=True, exist_ok=True)
            print("[AcousticBackbone] Downloading AudioSet class labels CSV...")
            resp = requests.get(HF_PANNS_LABELS_URL, timeout=30)
            resp.raise_for_status()
            with open(labels_path, "w", encoding="utf-8") as f:
                f.write(resp.text)

    def _load_model(self):
        """Initialize the PANNs AudioTagging inference engine."""
        print(f"[AcousticBackbone] Loading PANNs model on device '{self.device}'...")
        self.model = panns_inference.AudioTagging(
            checkpoint_path=self.checkpoint_path,
            device=self.device
        )
        print(f"[AcousticBackbone] Model loaded successfully from {self.checkpoint_path}.")

    def extract_features_and_tags(self, waveform: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Extract L2-normalized 2048-dim embedding and 527 AudioSet tag probabilities.
        Automatically performs multi-window overlapping temporal pooling for audio longer than 5 seconds.
        """
        if self.model is None:
            raise RuntimeError("Model is not initialized.")

        waveform = np.asarray(waveform, dtype=np.float32)
        if waveform.ndim > 1:
            waveform = np.mean(waveform, axis=0)

        window_size = 32000 * 5  # 5.0 seconds at 32kHz
        hop_size = 32000 * 2.5   # 2.5 seconds hop (50% overlap)
        n_samples = len(waveform)

        if n_samples <= window_size:
            # Pad short audio to 5 seconds
            if n_samples < window_size:
                pad_width = window_size - n_samples
                padded = np.pad(waveform, (0, pad_width), mode='constant')
            else:
                padded = waveform
            audio_batch = padded[np.newaxis, :]
        else:
            # Multi-window sliding temporal slicing
            windows = []
            start = 0
            while start + window_size <= n_samples:
                windows.append(waveform[start : start + window_size])
                start += int(hop_size)
            # Include final tail window if remaining
            if start < n_samples:
                tail = waveform[-window_size:]
                windows.append(tail)
            audio_batch = np.array(windows, dtype=np.float32)

        with torch.no_grad():
            clipwise_outputs, embeddings = self.model.inference(audio_batch)

        # Temporal pooling across all windows
        mean_embedding = np.mean(embeddings, axis=0)
        norm = np.linalg.norm(mean_embedding)
        norm_embedding = mean_embedding / (norm + 1e-9)

        mean_tags = np.mean(clipwise_outputs, axis=0)
        return norm_embedding, mean_tags

    def extract_embedding(self, waveform: np.ndarray) -> np.ndarray:
        """
        Extract 2048-dimensional embedding from a normalized 32kHz audio waveform.
        Uses multi-segment pooling for full audio duration.
        """
        emb, _ = self.extract_features_and_tags(waveform)
        return emb

    @property
    def embedding_dim(self) -> int:
        """Feature dimensionality of the pretrained backbone."""
        return 2048
