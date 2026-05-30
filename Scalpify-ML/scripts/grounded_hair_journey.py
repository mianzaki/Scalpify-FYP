#!/usr/bin/env python3
"""Grounded hair-journey generation.

Unlike the stock journey (which feeds the plain photo + a generic prompt and lets
the image model GUESS where the bald area is), this script first runs the YOLO
bald segmentation, derives a spatial description of the bald region, and injects
that description into each FUE stage prompt. The clean original photo is still the
image input -- the red overlay is NEVER sent to the generator.

Usage:
    python scripts/grounded_hair_journey.py <image_path> [--dry-run] [--stages N]

--dry-run builds + prints the grounded prompts WITHOUT calling the paid Replicate API.
"""
import sys, os, io, time, argparse, json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "src"))
load_dotenv(ROOT / ".env")

from ultralytics import YOLO

SIZE = 512


# ----------------------------- analysis / grounding -----------------------------

def analyze_bald_region(image_path: str, model_path: str = None):
    """Run YOLO, return (baldness_ratio, region_phrase, bbox, debug)."""
    model_path = model_path or str(ROOT / "model" / "best.pt")
    model = YOLO(model_path)
    names = model.names
    bald_id = [k for k, v in names.items() if "bald" in v.lower()][0]
    hair_id = [k for k, v in names.items() if "hair" in v.lower()][0]

    img = cv2.resize(cv2.imread(image_path), (SIZE, SIZE))
    res = model.predict(img, iou=0.4, verbose=False)[0]

    bald = np.zeros((SIZE, SIZE), np.uint8)
    hair = np.zeros((SIZE, SIZE), np.uint8)
    if res.masks is not None:
        masks = res.masks.data.cpu().numpy()
        cls = res.boxes.cls.cpu().numpy()
        for i, c in enumerate(cls):
            m = (cv2.resize(masks[i], (SIZE, SIZE)) > 0.5).astype(np.uint8)
            if int(c) == bald_id:
                bald = np.maximum(bald, m)
            elif int(c) == hair_id:
                hair = np.maximum(hair, m)

    bald_px = int(bald.sum())
    hair_px = int(hair.sum())
    total = bald_px + hair_px
    ratio = (bald_px / total * 100) if total else 0.0

    # bounding box + centroid of bald region
    ys, xs = np.where(bald > 0)
    if len(xs) == 0:
        return ratio, "no bald region detected", None, {"bald_px": 0}
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    cx, cy = float(xs.mean()), float(ys.mean())
    bbox = {"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0}

    # translate centroid -> human zone words (512x512 frame, top-down scalp view)
    vert = "crown / vertex (top-center of the scalp)" if 170 <= cy <= 340 else \
           "frontal / hairline area (upper scalp)" if cy < 170 else \
           "occipital / back-of-crown area (lower scalp)"
    horiz = "centered" if 190 <= cx <= 322 else ("left-biased" if cx < 190 else "right-biased")
    coverage_word = ("a small" if ratio < 25 else "a moderate" if ratio < 50 else
                     "a large" if ratio < 75 else "an extensive")

    region_phrase = (
        f"The thinning/bald recipient zone is the {vert}, {horiz} in the frame, "
        f"covering {coverage_word} portion of the scalp (~{ratio:.0f}% of the visible "
        f"hair-bearing area). Add new hair ONLY inside this zone."
    )
    debug = {"bald_px": bald_px, "hair_px": hair_px, "ratio": round(ratio, 2),
             "centroid": [round(cx, 1), round(cy, 1)], "bbox": bbox}
    return ratio, region_phrase, bbox, debug


# ----------------------------- prompts -----------------------------

IDENTITY = (
    "STRICT IDENTITY PRESERVATION: face, eyes, eyebrows, ears, jawline, skin tone, "
    "expression, lighting, and head pose are IDENTICAL to the original photo. The natural "
    "forehead hairline stays exactly where it is; DO NOT add hair onto forehead skin, temples, "
    "or below the original hairline. Existing hair on the sides and back is unchanged. "
    "Photorealistic portrait, natural daylight, sharp detail, no over-smoothing, no stylization."
)

# (stage_name, coverage description) -- region_phrase is injected per call
STAGE_TEMPLATES = [
    ("15_days_post_fue",
     "show the SAME person 15 days after a successful FUE hair transplant. The recipient zone "
     "is fully healed (normal skin tone, no redness/scabs). Transplanted follicles appear as a "
     "faint sparse pattern of tiny dark pinprick dots, almost no length (0.1-0.3mm), shock-loss "
     "phase -- the zone looks mostly bare with barely-visible dots. ~5% visible coverage."),
    ("1_month_post_fue",
     "show the SAME person 1 month after FUE. Sparse very-short dark stubble (0.5-1mm), evenly "
     "distributed but thin, scalp clearly visible between strands. ~10-15% coverage."),
    ("3_months_post_fue",
     "show the SAME person 3 months after FUE. Hair is thicker and longer (1-2cm), darker, more "
     "structured, ~40-50% coverage -- improved but still patchy with thin spots."),
    ("4_months_post_fue",
     "show the SAME person 4 months after FUE. Hair 2-3cm long, noticeably denser (~55-65% "
     "coverage), thicker strands, fewer thin patches, integrating with surrounding hair."),
    ("6_months_post_fue",
     "show the SAME person 6 months after FUE. Full mature density, thick healthy natural hair "
     "fully covering the recipient zone, indistinguishable from native hair."),
]


def build_grounded_prompts(region_phrase, n):
    out = []
    for stage_name, coverage in STAGE_TEMPLATES[:n]:
        prompt = f"Edit this photograph to {coverage} {region_phrase} {IDENTITY}"
        out.append((stage_name, prompt))
    return out


# ----------------------------- generation -----------------------------

def pad_square(image, fill=(0, 0, 0)):
    w, h = image.size
    m = max(w, h)
    pad = ((m - w) // 2, (m - h) // 2, (m - w + 1) // 2, (m - h + 1) // 2)
    return ImageOps.expand(image, pad, fill=fill)


def run_generation(image_path, prompts, out_dir):
    import replicate  # imported late so --dry-run works without it installed
    token = os.getenv("REPLICATE_API_TOKEN")
    if not token:
        raise SystemExit("❌ REPLICATE_API_TOKEN not set in .env")
    os.environ["REPLICATE_API_TOKEN"] = token

    out_dir = Path(out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    base = pad_square(Image.open(image_path).convert("RGB")).resize((SIZE, SIZE))
    base.save(out_dir / "00_original.png")

    DELAY = 11  # respect Replicate 6/min low-credit cap
    last = 0.0
    for i, (stage, prompt) in enumerate(prompts, 1):
        if last and (time.time() - last) < DELAY:
            wait = DELAY - (time.time() - last)
            print(f"⏳ pacing {wait:.0f}s"); time.sleep(wait)
        print(f"\n=== {i}/{len(prompts)}: {stage} ===")
        buf = io.BytesIO(); base.save(buf, format="PNG"); buf.seek(0)
        output = replicate.run("google/nano-banana-2", input={
            "prompt": prompt, "image_input": [buf],
            "aspect_ratio": "match_input_image", "output_format": "png",
        })
        last = time.time()
        fobj = output[0] if isinstance(output, list) else output
        result = Image.open(io.BytesIO(fobj.read()))
        p = out_dir / f"{i:02d}_{stage}.png"
        result.save(p)
        print(f"✅ saved {p}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--stages", type=int, default=5)
    ap.add_argument("--out", default=str(ROOT / "outputs" / "_journey_grounded"))
    args = ap.parse_args()

    ratio, region_phrase, bbox, debug = analyze_bald_region(args.image)
    print("=== ANALYSIS / GROUNDING ===")
    print(json.dumps(debug, indent=2))
    print("\nRegion phrase:\n  " + region_phrase)

    prompts = build_grounded_prompts(region_phrase, args.stages)
    print(f"\n=== GROUNDED PROMPTS ({len(prompts)} stages) ===")
    for stage, p in prompts:
        print(f"\n--- {stage} ---\n{p}")

    if args.dry_run:
        print("\n(dry-run: no API calls made)")
        return
    run_generation(args.image, prompts, args.out)


if __name__ == "__main__":
    main()
