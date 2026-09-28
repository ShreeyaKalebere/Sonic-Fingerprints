from typing import Dict, Any


def print_dataset_report(counts: Dict[str, Dict[str, Any]]):
    """
    Prints a clean, formatted table of:
    body | real_clips | augmented_samples | audio_type
    with a total row and warnings for any body with 0 real clips.
    """
    header_body = "Celestial Body"
    header_real = "Real Clips"
    header_aug = "Augmented Samples"
    header_type = "Audio Type"

    sep = "+" + "-" * 26 + "+" + "-" * 14 + "+" + "-" * 21 + "+" + "-" * 14 + "+"
    print("\n" + sep)
    print(f"| {header_body:<24} | {header_real:<12} | {header_aug:<19} | {header_type:<12} |")
    print(sep)

    total_real = 0
    total_aug = 0
    empty_bodies = []

    for body, data in counts.items():
        real = data.get("real_clips", 0)
        aug = data.get("augmented_samples", 0)
        atype = data.get("audio_type", "unknown")

        total_real += real
        total_aug += aug

        if real == 0:
            empty_bodies.append(body)

        print(f"| {body:<24} | {real:<12} | {aug:<19} | {atype:<12} |")

    print(sep)
    print(f"| {'TOTAL':<24} | {total_real:<12} | {total_aug:<19} | {'-':<12} |")
    print(sep + "\n")

    if empty_bodies:
        print("!" * 75)
        print("DATASET INCOMPLETENESS WARNINGS:")
        for body in empty_bodies:
            print(f"  [WARNING] Body '{body}' has 0 real audio clips! Place audio files into /data/space/{body}/")
        print("!" * 75 + "\n")
    else:
        print("[Status] All 6 celestial bodies have real audio clips present.\n")
