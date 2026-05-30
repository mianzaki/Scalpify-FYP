#!/usr/bin/env python3
"""Mask-grounded hair-journey generation using FLUX.1 Fill [pro].

Stronger than prompt-only grounding: the YOLO bald mask is passed as an inpaint
mask so FLUX regenerates ONLY the bald region and pixel-freezes the face, existing
hair, and background. The red overlay is never sent -- only the clean original + the
binary mask + a per-stage density prompt.

Mask convention (FLUX Fill): white = regenerate, black = keep.
So the bald region = white = where new hair is grown.

Usage:
    python scripts/inpaint_hair_journey.py <image_path> [--stages N] [--dilate 6]
                                           [--safety 5] [--dry-run]
"""
import sys, os, io, time, argparse, json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "scripts"))
load_dotenv(ROOT / ".env")

from ultralytics import YOLO
from grounded_hair_journey import build_grounded_prompts, analyze_bald_region, pad_square, SIZE

MODEL = "black-forest-labs/flux-fill-pro"


def build_bald_mask(image_path, dilate_px=6):
    """Run YOLO, return a CLEAN binary bald mask (uint8 0/255), white=bald=fill."""
    model = YOLO(str(ROOT / "model" / "best.pt"))
    names = model.names
    bald_id = [k for k, v in names.items() if "bald" in v.lower()][0]

    img = cv2.resize(cv2.imread(image_path), (SIZE, SIZE))
    res = model.predict(img, iou=0.4, verbose=False)[0]

    mask = np.zeros((SIZE, SIZE), np.uint8)
    if res.masks is not None:
        masks = res.masks.data.cpu().numpy()
        cls = res.boxes.cls.cpu().numpy()
        for i, c in enumerate(cls):
            if int(c) == bald_id:
                m = (cv2.resize(masks[i], (SIZE, SIZE)) > 0.5).astype(np.uint8)
                mask = np.maximum(mask, m)

    if mask.sum() == 0:
        raise SystemExit("❌ No bald region detected — nothing to inpaint.")

    # --- clean: fill holes, keep largest connected component ---
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lbl, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if n > 1:
        largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        mask = (lbl == largest).astype(np.uint8)

    # --- slight dilation so new hair blends past the hard segmentation edge ---
    if dilate_px > 0:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate_px, dilate_px))
        mask = cv2.dilate(mask, k)

    return (mask * 255).astype(np.uint8), img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--stages", type=int, default=5)
    ap.add_argument("--dilate", type=int, default=6, help="edge dilation px for blending")
    ap.add_argument("--safety", type=int, default=5, help="flux safety_tolerance 0-6 (higher=looser)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out", default=str(ROOT / "outputs" / "_journey_inpaint"))
    args = ap.parse_args()

    out_dir = Path(args.out); out_dir.mkdir(parents=True, exist_ok=True)

    # 1) mask + grounding text (reuse the same region phrase logic)
    mask255, img_bgr = build_bald_mask(args.image, args.dilate)
    ratio, region_phrase, bbox, dbg = analyze_bald_region(args.image)
    prompts = build_grounded_prompts(region_phrase, args.stages)

    # save the inputs we will send (clean original + mask + overlay preview)
    base = pad_square(Image.open(args.image).convert("RGB")).resize((SIZE, SIZE))
    base.save(out_dir / "00_original.png")
    cv2.imwrite(str(out_dir / "00_mask.png"), mask255)
    prev = cv2.resize(cv2.imread(args.image), (SIZE, SIZE)).copy()
    prev[mask255 > 0] = (0.5 * prev[mask255 > 0] + 0.5 * np.array([0, 0, 255])).astype(np.uint8)
    cv2.imwrite(str(out_dir / "00_mask_preview.png"), prev)

    print("=== GROUNDING ==="); print(json.dumps(dbg, indent=2))
    print("mask coverage: %.1f%% of frame  (dilate=%dpx, safety=%d)"
          % (100 * (mask255 > 0).sum() / (SIZE * SIZE), args.dilate, args.safety))
    print("region:", region_phrase)

    if args.dry_run:
        print("\n(dry-run: inputs saved to", out_dir, "— no API calls)")
        return

    import replicate
    os.environ["REPLICATE_API_TOKEN"] = os.getenv("REPLICATE_API_TOKEN")

    # encode the SAME image+mask once
    def to_buf(pil_or_path, is_mask=False):
        b = io.BytesIO()
        if is_mask:
            Image.fromarray(mask255).save(b, format="PNG")
        else:
            base.save(b, format="PNG")
        b.seek(0); return b

    DELAY = 11
    last = 0.0
    for i, (stage, prompt) in enumerate(prompts, 1):
        if last and (time.time() - last) < DELAY:
            w = DELAY - (time.time() - last); print(f"⏳ pacing {w:.0f}s"); time.sleep(w)
        print(f"\n=== {i}/{len(prompts)}: {stage} ===")
        for attempt in range(3):
            try:
                out = replicate.run(MODEL, input={
                    "image": to_buf(None, False),
                    "mask": to_buf(None, True),
                    "prompt": prompt,
                    "steps": 50,
                    "guidance": 60,
                    "safety_tolerance": args.safety,
                    "output_format": "png",
                    "seed": 123456,
                })
                last = time.time()
                fobj = out[0] if isinstance(out, list) else out
                Image.open(io.BytesIO(fobj.read())).save(out_dir / f"{i:02d}_{stage}.png")
                print(f"✅ saved {i:02d}_{stage}.png"); break
            except Exception as e:
                print(f"  attempt {attempt+1} failed: {e}"); time.sleep(6)
        else:
            print(f"  ⚠️  giving up on {stage}")


if __name__ == "__main__":
    main()
