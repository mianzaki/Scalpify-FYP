#!/usr/bin/env python3
"""Chained, region-grounded hair-journey using google/nano-banana-pro (NON-inpaint).

No mask: nano-banana-pro regenerates the whole frame from an edit instruction, so
identity preservation is enforced in the PROMPT (not guaranteed like inpaint).
We keep the two model-independent wins:
  * REGION GROUNDING — the bald zone (crown/frontal, coverage) is derived from the
    YOLO segmentation and injected, so the model knows WHERE to add hair.
  * CONCRETE no-text prompts — distinct scalp-visibility targets per stage, no
    digits / "show:" phrasing (which makes image models render caption text).

Chaining: 15-day is generated from the ORIGINAL (shock-loss is barer than current);
1mo -> 6mo each build on the previous stage so density visibly accumulates.

Failsafes for the old 6-month failure: safety_filter_level=block_only_high (loosest)
and allow_fallback_model=True (falls back to seedream-5 instead of erroring).

Usage:
    python scripts/nano_pro_journey.py <image_path> [--dry-run] [--out DIR]
"""
import sys, os, io, time, argparse, json
from pathlib import Path

from PIL import Image
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT / "scripts"))
load_dotenv(ROOT / ".env")

from grounded_hair_journey import analyze_bald_region, pad_square, SIZE

MODEL = "google/nano-banana-pro"

# No mask to freeze identity -> spell it out hard, every stage.
IDENTITY = (
    "CRITICAL: keep the SAME person — do not change the face, ears, head shape, skin tone, "
    "head pose, camera angle, lighting, background, or the existing hair on the sides and "
    "back of the head. Match the framing, zoom, head position and identity of the ORIGINAL "
    "reference photo EXACTLY (the last reference image provided is the original — use it to "
    "lock framing and identity). Only modify the hair within the described scalp zone. The "
    "natural forehead hairline stays exactly where it is; do not add hair onto forehead skin "
    "or temples. Photorealistic top-down scalp photograph, sharp realistic hair detail. The "
    "image is a clean photograph with absolutely no text, letters, numbers, labels, arrows, "
    "captions or watermarks anywhere."
)

# (stage_name, chain_from_previous, concrete edit instruction — no digits, no colons)
STAGES = [
    ("15_days_post_fue", False,
     "Edit this photo so the described scalp zone looks like fifteen days after an FUE hair "
     "transplant in the shock-loss phase — almost entirely bare smooth healed skin with no "
     "hair length, only tiny faint dark follicle dots, the scalp clearly visible."),

    ("1_month_post_fue", True,
     "Edit this photo so the described scalp zone now has very sparse ultra-short dark stubble "
     "scattered thinly, with large areas of bare scalp still clearly visible between the short "
     "hairs — a faint shadow of hair just beginning to appear."),

    ("3_months_post_fue", True,
     "Edit this photo so the described scalp zone now has patchy short hair, see-through and "
     "uneven, with the bare scalp still clearly visible in the gaps between clumps of hair, "
     "about half covered and distinctly incomplete."),

    ("4_months_post_fue", True,
     "Edit this photo so the described scalp zone now has moderate, fuller, more even hair that "
     "is noticeably denser than before, with the skin mostly covered and the scalp only showing "
     "faintly at the parting and a few small thin spots."),

    ("6_months_post_fue", True,
     "Edit this photo so the described scalp zone is just slightly fuller and thicker than the "
     "previous stage — a small gradual improvement, not a big change. Coverage is good across "
     "most of the area but a few thin spots and faintly see-through patches near the crown are "
     "still visible. Clearly a little denser than before but NOT yet full thick coverage."),

    ("8_months_post_fue", True,
     "Edit this photo so the described scalp zone now has fully matured, settled hair that is "
     "only slightly fuller and more uniform than before, with complete even coverage and no "
     "visible scalp — the final stabilized result, essentially indistinguishable from the "
     "previous stage but a touch denser and more refined."),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--stages", type=int, default=5, help="number of stages to run (e.g. 4 = up to 4 months)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out", default=str(ROOT / "outputs" / "_journey_nano_pro"))
    args = ap.parse_args()

    stages = STAGES[:args.stages]
    out_dir = Path(args.out); out_dir.mkdir(parents=True, exist_ok=True)

    ratio, region_phrase, bbox, dbg = analyze_bald_region(args.image)
    original = pad_square(Image.open(args.image).convert("RGB")).resize((SIZE, SIZE))
    original.save(out_dir / "00_original.png")

    print("=== GROUNDING ==="); print(json.dumps(dbg, indent=2))
    print("region:", region_phrase)
    print("\n=== STAGE PLAN (chained, non-inpaint) ===")
    for name, chain, _ in stages:
        print(f"  {name:22s} base={'PREVIOUS stage' if chain else 'ORIGINAL photo'}")

    if args.dry_run:
        print("\n(dry-run: no API calls)")
        for name, chain, desc in stages:
            print(f"\n--- {name} ---\n{desc} {region_phrase} {IDENTITY}")
        return

    import replicate
    os.environ["REPLICATE_API_TOKEN"] = os.getenv("REPLICATE_API_TOKEN")

    def buf(pil):
        b = io.BytesIO(); pil.save(b, format="PNG"); b.seek(0); return b

    DELAY = 11
    last = 0.0
    prev = original
    for i, (stage, chain, desc) in enumerate(stages, 1):
        base = prev if chain else original
        prompt = f"{desc} {region_phrase} {IDENTITY}"

        if last and (time.time() - last) < DELAY:
            w = DELAY - (time.time() - last); print(f"⏳ pacing {w:.0f}s"); time.sleep(w)
        print(f"\n=== {i}/{len(stages)}: {stage}  (base={'prev' if chain else 'original'}) ===")

        for attempt in range(3):
            try:
                # Drift-control anchor: chained stages also pass the ORIGINAL as a 2nd
                # reference so framing/identity stays locked. 15-day's base IS the original,
                # so pass once. Rebuilt each attempt because buffers are consumed on read.
                image_input = [buf(base)] if not chain else [buf(base), buf(original)]
                out = replicate.run(MODEL, input={
                    "prompt": prompt,
                    "image_input": image_input,
                    "aspect_ratio": "match_input_image",
                    "output_format": "png",
                    "safety_filter_level": "block_only_high",
                    "allow_fallback_model": True,
                })
                last = time.time()
                fobj = out[0] if isinstance(out, list) else out
                result = Image.open(io.BytesIO(fobj.read())).convert("RGB").resize((SIZE, SIZE))
                result.save(out_dir / f"{i:02d}_{stage}.png")
                prev = result
                print(f"✅ saved {i:02d}_{stage}.png")
                break
            except Exception as e:
                print(f"  attempt {attempt+1} failed: {e}"); time.sleep(6)
        else:
            print(f"  ⚠️  giving up on {stage}; chain continues from last good base")


if __name__ == "__main__":
    main()
