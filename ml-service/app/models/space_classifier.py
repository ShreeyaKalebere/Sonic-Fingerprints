import os
import pathlib
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader

from app.data_prep.metadata_schema import ALL_BODIES

BODY_CLASSES = ALL_BODIES
TYPE_CLASSES = ["recorded", "sonified"]

BODY_TO_IDX = {b: i for i, b in enumerate(BODY_CLASSES)}
IDX_TO_BODY = {i: b for i, b in enumerate(BODY_CLASSES)}

TYPE_TO_IDX = {t: i for i, t in enumerate(TYPE_CLASSES)}
IDX_TO_TYPE = {i: t for i, t in enumerate(TYPE_CLASSES)}

WEIGHTS_DIR = pathlib.Path(__file__).parent / "weights"
BODY_WEIGHTS_PATH = WEIGHTS_DIR / "body_classifier.pt"
TYPE_WEIGHTS_PATH = WEIGHTS_DIR / "type_classifier.pt"


class BodyClassifier(nn.Module):
    """Classification head predicting celestial body (6 classes) from 2048-dim PANNs embedding."""
    def __init__(self, embedding_dim: int = 2048, hidden_dim: int = 128, num_classes: int = 6, dropout_p: float = 0.3):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(embedding_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout_p),
            nn.Linear(hidden_dim, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class TypeClassifier(nn.Module):
    """Classification head predicting audio type ('recorded' vs 'sonified') from 2048-dim embedding."""
    def __init__(self, embedding_dim: int = 2048, hidden_dim: int = 128, num_classes: int = 2, dropout_p: float = 0.3):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(embedding_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout_p),
            nn.Linear(hidden_dim, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# In-memory singletons for inference
_BODY_MODEL: Optional[BodyClassifier] = None
_TYPE_MODEL: Optional[TypeClassifier] = None


def load_trained_classifiers() -> Tuple[BodyClassifier, TypeClassifier]:
    """
    Loads saved weights for inference.
    Raises RuntimeError if weights do not exist yet.
    """
    global _BODY_MODEL, _TYPE_MODEL

    if not BODY_WEIGHTS_PATH.exists() or not TYPE_WEIGHTS_PATH.exists():
        raise RuntimeError("Classifiers not yet trained. Model weights not found on disk.")

    device = "cuda" if torch.cuda.is_available() else "cpu"

    if _BODY_MODEL is None:
        body_model = BodyClassifier()
        body_model.load_state_dict(torch.load(BODY_WEIGHTS_PATH, map_location=device))
        body_model.to(device)
        body_model.eval()
        _BODY_MODEL = body_model

    if _TYPE_MODEL is None:
        type_model = TypeClassifier()
        type_model.load_state_dict(torch.load(TYPE_WEIGHTS_PATH, map_location=device))
        type_model.to(device)
        type_model.eval()
        _TYPE_MODEL = type_model

    return _BODY_MODEL, _TYPE_MODEL


def are_classifiers_loaded() -> bool:
    """Check if trained weights are available on disk."""
    return BODY_WEIGHTS_PATH.exists() and TYPE_WEIGHTS_PATH.exists()


def predict_space_audio(embedding_vector: List[float]) -> Dict[str, Any]:
    """
    Runs inference on a 2048-dim embedding vector using both trained heads.
    Returns:
        {
            "body": {body_name: confidence},
            "top_body": str,
            "type": {type_name: confidence},
            "top_type": str
        }
    """
    body_model, type_model = load_trained_classifiers()
    device = "cuda" if torch.cuda.is_available() else "cpu"

    x = torch.tensor([embedding_vector], dtype=torch.float32).to(device)

    with torch.no_grad():
        body_logits = body_model(x)
        body_probs = torch.softmax(body_logits, dim=-1).cpu().numpy()[0]

        type_logits = type_model(x)
        type_probs = torch.softmax(type_logits, dim=-1).cpu().numpy()[0]

    body_conf = {IDX_TO_BODY[i]: float(round(float(p), 4)) for i, p in enumerate(body_probs)}
    top_body = max(body_conf, key=body_conf.get)

    type_conf = {IDX_TO_TYPE[i]: float(round(float(p), 4)) for i, p in enumerate(type_probs)}
    top_type = max(type_conf, key=type_conf.get)

    return {
        "body": body_conf,
        "top_body": top_body,
        "type": type_conf,
        "top_type": top_type
    }


def train_classifiers(augmented_dataset: Dict[str, Any], epochs: int = 20, val_split: float = 0.2) -> Dict[str, Any]:
    """
    Extracts embeddings for every sample in augmented_dataset via shared PANNs backbone,
    trains BodyClassifier and TypeClassifier, prints train/val accuracy honestly,
    and saves weights to WEIGHTS_DIR.
    """
    from core.pipeline import get_default_backbone

    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    backbone = get_default_backbone()

    dataset_dict = augmented_dataset.get("dataset", {})

    all_embeddings = []
    all_body_labels = []
    all_type_labels = []

    print("[Training] Computing 2048-dim PANNs embeddings for all augmented samples...")
    for body, type_map in dataset_dict.items():
        if body not in BODY_TO_IDX:
            continue
        body_idx = BODY_TO_IDX[body]

        for audio_type, samples in type_map.items():
            if audio_type not in TYPE_TO_IDX:
                continue
            type_idx = TYPE_TO_IDX[audio_type]

            for audio_array, filename in samples:
                # Compute embedding
                emb = backbone.extract_embedding(audio_array)
                all_embeddings.append(emb)
                all_body_labels.append(body_idx)
                all_type_labels.append(type_idx)

    total_samples = len(all_embeddings)
    if total_samples < 5:
        raise ValueError(
            f"Insufficient samples to train classifiers: found {total_samples} samples. "
            "Please ensure real audio files are placed into /data/space/{body}/ folders."
        )

    X = np.array(all_embeddings, dtype=np.float32)
    y_body = np.array(all_body_labels, dtype=np.int64)
    y_type = np.array(all_type_labels, dtype=np.int64)

    # Train/Val split
    indices = np.random.permutation(total_samples)
    val_size = max(1, int(total_samples * val_split))
    val_idx = indices[:val_size]
    train_idx = indices[val_size:]

    device = "cuda" if torch.cuda.is_available() else "cpu"

    train_X = torch.tensor(X[train_idx]).to(device)
    train_y_body = torch.tensor(y_body[train_idx]).to(device)
    train_y_type = torch.tensor(y_type[train_idx]).to(device)

    val_X = torch.tensor(X[val_idx]).to(device)
    val_y_body = torch.tensor(y_body[val_idx]).to(device)
    val_y_type = torch.tensor(y_type[val_idx]).to(device)

    body_model = BodyClassifier().to(device)
    type_model = TypeClassifier().to(device)

    body_opt = optim.Adam(body_model.parameters(), lr=1e-3, weight_decay=1e-4)
    type_opt = optim.Adam(type_model.parameters(), lr=1e-3, weight_decay=1e-4)

    criterion = nn.CrossEntropyLoss()

    batch_size = min(16, len(train_idx))
    dataset_train = TensorDataset(train_X, train_y_body, train_y_type)
    loader = DataLoader(dataset_train, batch_size=batch_size, shuffle=True)

    print("\n" + "=" * 70)
    print("TRAINING SPACE CLASSIFIERS (HONEST ACCURACY REPORT)")
    print(f"Total Samples: {total_samples} | Train: {len(train_idx)} | Val: {len(val_idx)}")
    print("=" * 70)

    epoch_logs = []

    for epoch in range(1, epochs + 1):
        body_model.train()
        type_model.train()

        for b_X, b_y_b, b_y_t in loader:
            # Body classifier step
            body_opt.zero_grad()
            out_b = body_model(b_X)
            loss_b = criterion(out_b, b_y_b)
            loss_b.backward()
            body_opt.step()

            # Type classifier step
            type_opt.zero_grad()
            out_t = type_model(b_X)
            loss_t = criterion(out_t, b_y_t)
            loss_t.backward()
            type_opt.step()

        # Validation evaluation
        body_model.eval()
        type_model.eval()
        with torch.no_grad():
            # Train acc
            pred_train_b = body_model(train_X).argmax(dim=-1)
            train_acc_b = float((pred_train_b == train_y_body).float().mean().item())

            pred_train_t = type_model(train_X).argmax(dim=-1)
            train_acc_t = float((pred_train_t == train_y_type).float().mean().item())

            # Val acc
            pred_val_b = body_model(val_X).argmax(dim=-1)
            val_acc_b = float((pred_val_b == val_y_body).float().mean().item())

            pred_val_t = type_model(val_X).argmax(dim=-1)
            val_acc_t = float((pred_val_t == val_y_type).float().mean().item())

        log_entry = {
            "epoch": epoch,
            "train_body_acc": round(train_acc_b, 4),
            "val_body_acc": round(val_acc_b, 4),
            "train_type_acc": round(train_acc_t, 4),
            "val_type_acc": round(val_acc_t, 4)
        }
        epoch_logs.append(log_entry)

        if epoch % 5 == 0 or epoch == epochs or epoch == 1:
            print(
                f"Epoch {epoch:02d}/{epochs:02d} | "
                f"Body Acc (Train: {train_acc_b*100:.1f}%, Val: {val_acc_b*100:.1f}%) | "
                f"Type Acc (Train: {train_acc_t*100:.1f}%, Val: {val_acc_t*100:.1f}%)"
            )

    # Save models
    torch.save(body_model.state_dict(), BODY_WEIGHTS_PATH)
    torch.save(type_model.state_dict(), TYPE_WEIGHTS_PATH)
    print(f"\n[Weights Saved] Body weights: {BODY_WEIGHTS_PATH}")
    print(f"[Weights Saved] Type weights: {TYPE_WEIGHTS_PATH}")

    # Reset in-memory cache to reload new weights
    global _BODY_MODEL, _TYPE_MODEL
    _BODY_MODEL = None
    _TYPE_MODEL = None
    load_trained_classifiers()

    final_val_b = epoch_logs[-1]["val_body_acc"]
    final_val_t = epoch_logs[-1]["val_type_acc"]

    honest_disclosure = (
        f"Trained on {total_samples} augmented samples derived from real clips. "
        f"Final validation accuracy: Body={final_val_b*100:.1f}%, Type={final_val_t*100:.1f}%. "
        "Due to limited real archival samples per body, validation accuracy should be interpreted "
        "as indicative of acoustic pattern memorization rather than generalized out-of-domain robustness."
    )

    return {
        "status": "success",
        "epochs": epochs,
        "total_samples": total_samples,
        "train_samples": len(train_idx),
        "val_samples": len(val_idx),
        "final_train_body_accuracy": epoch_logs[-1]["train_body_acc"],
        "final_val_body_accuracy": final_val_b,
        "final_train_type_accuracy": epoch_logs[-1]["train_type_acc"],
        "final_val_type_accuracy": final_val_t,
        "honest_evaluation_note": honest_disclosure,
        "epochs_history": epoch_logs
    }
