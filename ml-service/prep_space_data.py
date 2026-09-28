#!/usr/bin/env python3
"""
Runnable script for PART A: Data Preparation & Augmentation.
Executes:
1. Metadata builder & schema validator across /data/space/*
2. Dataset augmentation with 3s windows, 1s stride & audiomentations variants
3. Dataset reporting
4. Caches output to /ml-service/app/data_prep/cache/augmented_dataset.pkl
"""

import os
import sys
import pathlib
import pickle

# Ensure ml-service root is in sys.path
current_dir = pathlib.Path(__file__).parent.resolve()
sys.path.insert(0, str(current_dir))

from app.data_prep.metadata_builder import scan_and_build_metadata
from app.data_prep.augmentation import build_augmented_dataset
from app.data_prep.report import print_dataset_report

WORKSPACE_DIR = current_dir.parent
DATA_DIR = WORKSPACE_DIR / "data" / "space"
CACHE_DIR = current_dir / "app" / "data_prep" / "cache"


def main():
    print("=" * 75)
    print("MODE 2: SOLAR SYSTEM EXPLORER — DATA PREPARATION & AUGMENTATION")
    print(f"Target Space Data Directory: {DATA_DIR}")
    print("=" * 75)

    if not DATA_DIR.exists():
        print(f"[Warning] Data directory {DATA_DIR} does not exist. Creating...")
        DATA_DIR.mkdir(parents=True, exist_ok=True)

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE_DIR / "augmented_dataset.pkl"

    # Step 1: Scan and build/validate metadata
    print("\n[Step 1] Scanning for celestial audio clips & checking metadata...")
    created_templates, valid_files, invalid_files = scan_and_build_metadata(DATA_DIR)

    if created_templates:
        print(f"  -> Generated {len(created_templates)} new metadata template JSON files:")
        for path in created_templates:
            print(f"     - {path}")

    if invalid_files:
        print(f"  -> Detected {len(invalid_files)} files with validation issues or unfilled placeholders:")
        for path in invalid_files:
            print(f"     - {path}")

    if valid_files:
        print(f"  -> {len(valid_files)} valid audio clip metadata files verified.")

    # Step 2: Build augmented dataset
    print("\n[Step 2] Slicing into 3.0s windows (1.0s stride) and applying audiomentations...")
    aug_data = build_augmented_dataset(DATA_DIR)

    # Step 3: Print clean dataset report
    print("\n[Step 3] Dataset Summary Report:")
    print_dataset_report(aug_data["counts"])

    # Step 4: Cache results
    with open(cache_file, "wb") as f:
        pickle.dump(aug_data, f)
    print(f"[Cache] Successfully saved augmented dataset cache to:\n  -> {cache_file}")
    print("=" * 75)


if __name__ == "__main__":
    main()
