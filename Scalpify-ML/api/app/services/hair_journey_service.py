import os
import uuid
import time
import shutil
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path
import io

from PIL import Image, ImageOps
import replicate

from app.core.config import get_settings
from app.core.supabase_client import get_supabase_client
from app.models.schemas import (
    HairJourneyOptions, HairJourneyResponse, HairJourneyStatus,
    HairJourneyResult, IterationResult
)

settings = get_settings()

# Outputs directory for local storage
OUTPUTS_DIR = Path(__file__).parent.parent.parent.parent / "outputs"

# Project root (…/Scalpify-ML) so we can reach the grounding helper in scripts/
_PROJECT_ROOT = Path(__file__).parent.parent.parent.parent

# Generic fallback used when the YOLO segmentation can't run (keeps generation working
# even without the model present).
_GENERIC_REGION = (
    "The recipient zone is the balding/thinning area on the top of the scalp. "
    "Add or change hair ONLY inside this zone."
)


def ground_bald_region(image_path: str) -> str:
    """Best-effort: derive a spatial description of the bald region from the YOLO
    segmentation so prompts target the actual recipient area. Falls back to a generic
    phrase if the model/deps are unavailable, so journey generation never hard-fails
    on grounding."""
    try:
        import sys
        scripts_dir = str(_PROJECT_ROOT / "scripts")
        if scripts_dir not in sys.path:
            sys.path.insert(0, scripts_dir)
        from grounded_hair_journey import analyze_bald_region
        _, region_phrase, _, _ = analyze_bald_region(image_path)
        return region_phrase
    except Exception as e:
        print(f"⚠️  Region grounding unavailable ({e}); using generic region phrase")
        return _GENERIC_REGION


class NanoBananaEditor:
    """Google nano-banana-pro image editor for hair journey progression.

    Upgraded from nano-banana-2: better identity/character consistency, and the
    safety_filter_level + allow_fallback_model options avoid the intermittent
    "Failed to generate image" refusals that the older model hit on later stages.
    """

    def __init__(self):
        self.model = "google/nano-banana-pro"
        self.enabled = False

        if not settings.REPLICATE_API_TOKEN:
            print("⚠️  REPLICATE_API_TOKEN not configured - hair journey features disabled")
            return

        os.environ["REPLICATE_API_TOKEN"] = settings.REPLICATE_API_TOKEN
        self.enabled = True

    def edit_image(self, images, prompt: str, max_retries: int = 4):
        """Edit image(s) using google/nano-banana-pro (image-to-image).

        `images` is a single PIL Image or a list of PIL Images. When a list is
        passed, the LAST image is treated as the original anchor reference (used to
        lock framing/identity) while the first is the base to edit.

        Retries on Replicate 429 throttle (low-credit accounts cap at 6/min, burst 1)
        with exponential backoff so a multi-stage journey can finish within the rate limit.
        """
        if not self.enabled:
            raise RuntimeError("Replicate API not configured - REPLICATE_API_TOKEN required")

        if not isinstance(images, (list, tuple)):
            images = [images]

        attempt = 0
        while True:
            try:
                image_input = []
                for img in images:
                    b = io.BytesIO()
                    img.save(b, format="PNG")
                    b.seek(0)
                    image_input.append(b)

                input_data = {
                    "prompt": prompt,
                    "image_input": image_input,
                    "aspect_ratio": "match_input_image",
                    "output_format": "png",
                    "safety_filter_level": "block_only_high",
                    "allow_fallback_model": True,
                }

                output = replicate.run(self.model, input=input_data)

                file_obj = output[0] if isinstance(output, list) else output
                image_bytes = file_obj.read()
                result_image = Image.open(io.BytesIO(image_bytes))

                class EditResult:
                    def __init__(self, image):
                        self.images = [image]

                return EditResult(result_image)

            except Exception as e:
                msg = str(e)
                is_throttle = "429" in msg or "throttled" in msg.lower() or "rate limit" in msg.lower()
                if is_throttle and attempt < max_retries:
                    backoff = min(60, 12 * (2 ** attempt))
                    print(f"⏳ Replicate throttle hit (attempt {attempt + 1}/{max_retries + 1}); sleeping {backoff}s")
                    time.sleep(backoff)
                    attempt += 1
                    continue
                print(f"Error with nano-banana-2: {e}")
                raise

class HairJourneyService:
    """Service for generating hair journey visualizations using google/nano-banana-2"""

    def __init__(self):
        self.editor = NanoBananaEditor()
        self.enabled = self.editor.enabled
        self.supabase = get_supabase_client()

        # Hair transplant journey stages — calibrated 8-month timeline
        # 15 days, 1 month, 3 months, 4 months, 6 months, 8 months
        # Concrete, no-digits / no-colon prompts (so the image model renders pixels,
        # not caption text). Each tuple: (stage_name, chain_from_previous, edit instruction).
        # chain_from_previous=False -> edit the ORIGINAL photo (15-day shock-loss is barer
        # than the patient's current state); True -> build on the previous stage so density
        # accumulates smoothly and 3/4/6/8-month frames stay visibly differentiated.
        self.identity_block = (
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

        self.stages = [
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

    def pad_to_square(self, image: Image.Image, fill_color=(0, 0, 0)) -> Image.Image:
        """Pad image to square dimensions"""
        width, height = image.size
        max_side = max(width, height)
        padding = (
            (max_side - width) // 2,
            (max_side - height) // 2,
            (max_side - width + 1) // 2,
            (max_side - height + 1) // 2
        )
        return ImageOps.expand(image, padding, fill=fill_color)

    def cleanup_outputs_folder(self):
        """Delete all files in the outputs folder"""
        try:
            if OUTPUTS_DIR.exists():
                # Remove all files in the directory
                for file_path in OUTPUTS_DIR.glob("*"):
                    if file_path.is_file():
                        file_path.unlink()
                        print(f"🗑️  Deleted old file: {file_path.name}")
            else:
                # Create outputs directory if it doesn't exist
                OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
                print(f"📁 Created outputs directory: {OUTPUTS_DIR}")
        except Exception as e:
            print(f"⚠️  Error cleaning outputs folder: {e}")

    def save_image_locally(self, image: Image.Image, filename: str) -> str:
        """Save image to local outputs folder"""
        try:
            # Ensure outputs directory exists
            OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

            # Save image
            file_path = OUTPUTS_DIR / filename
            image.save(file_path, format="PNG")
            print(f"💾 Saved locally: {filename}")

            return str(file_path)
        except Exception as e:
            print(f"❌ Error saving image locally: {e}")
            return None

    async def upload_to_supabase(self, image: Image.Image, filename: str, bucket: str = "hair-journey") -> str:
        """Upload image to Supabase storage and return URL"""
        try:
            # Convert image to bytes
            img_buffer = io.BytesIO()
            image.save(img_buffer, format="PNG")
            img_buffer.seek(0)
            
            # Upload using the client's upload method
            url = await self.supabase.upload_file(
                file_bytes=img_buffer.getvalue(),
                file_path=filename,
                bucket=bucket,
                content_type="image/png"
            )
            return url
            
        except Exception as e:
            print(f"Error uploading to Supabase: {e}")
            raise
    
    async def save_journey_to_db(self, session_id: uuid.UUID, result: HairJourneyResult):
        """Save hair journey result to database"""
        try:
            if not self.supabase.enabled:
                print("Database not enabled, skipping save")
                return
                
            journey_data = {
                "id": str(session_id),
                "created_at": datetime.utcnow().isoformat(),
                "original_image_url": result.original_image_url,
                "final_result_url": result.final_result_url,
                "iterations_count": len(result.iterations),
                "view_type": result.view_type,
                "processing_time_ms": result.total_processing_time_ms,
                "iterations_data": [
                    {
                        "iteration_number": iter_result.iteration_number,
                        "image_url": iter_result.image_url,
                        "mask_url": iter_result.mask_url,
                        "processing_time_ms": iter_result.processing_time_ms,
                        "timestamp": iter_result.timestamp.isoformat()
                    }
                    for iter_result in result.iterations
                ]
            }
            
            # Use the client's direct access for now
            response = self.supabase.client.table("hair_journey_sessions").insert(journey_data).execute()
            
            # Check if response has data (successful insert)
            if not response.data:
                print("Database save error: No data returned from insert")
                
        except Exception as e:
            print(f"Error saving to database: {e}")
    
    async def generate_hair_journey(self, image_path: str, options: HairJourneyOptions, session_id: uuid.UUID) -> HairJourneyResult:
        """Generate hair journey visualization using Qwen Image Edit Plus with progressive editing"""
        start_time = time.time()
        iterations_results = []

        try:
            # Clean up outputs folder before starting new generation
            print("\n🧹 Cleaning outputs folder...")
            self.cleanup_outputs_folder()

            # Preprocess input image
            input_image = Image.open(image_path).convert("RGB")
            input_image = self.pad_to_square(input_image).resize((512, 512))

            # Save original image locally
            self.save_image_locally(input_image, "00_original.png")

            # Upload original image
            original_filename = f"{session_id}/original.png"
            original_url = await self.upload_to_supabase(input_image, original_filename)

            # Region grounding: derive WHERE the bald zone is from the YOLO segmentation so
            # each prompt targets the actual recipient area (best-effort; falls back to a
            # generic phrase if the segmentation model is unavailable).
            region_phrase = ground_bald_region(image_path)

            # Chained generation: 15-day edits the original; later stages build on the
            # previous output so density accumulates. The original is also passed as a
            # second anchor reference on chained calls to lock framing/identity.
            prev_image = input_image.copy()

            # Process each stage
            num_stages = min(len(self.stages), options.iterations if options.iterations <= len(self.stages) else len(self.stages))

            # Replicate caps at 6 req/min on low-credit accounts. Spacing
            # calls ~11s apart keeps us under that ceiling without retries.
            INTER_STAGE_DELAY_S = 11
            last_call_at = 0.0

            for i in range(num_stages):
                # Throttle: ensure at least INTER_STAGE_DELAY_S has elapsed since
                # the previous Replicate call before kicking off the next one.
                elapsed = time.time() - last_call_at
                if last_call_at and elapsed < INTER_STAGE_DELAY_S:
                    wait = INTER_STAGE_DELAY_S - elapsed
                    print(f"⏳ Pacing: sleeping {wait:.1f}s before next stage to respect Replicate rate limit")
                    time.sleep(wait)

                iter_start = time.time()
                stage_name, chain_from_prev, desc = self.stages[i]

                print(f"\n{'='*60}")
                print(f"Processing stage {i+1}/{num_stages}: {stage_name}")

                # Build the grounded, identity-locked prompt for this stage
                prompt = f"{desc} {region_phrase} {self.identity_block}"

                # Base = previous stage for chained stages, else the original.
                # Chained stages also pass the original as a 2nd anchor reference.
                if chain_from_prev:
                    base_image = prev_image
                    images = [base_image, input_image]
                else:
                    base_image = input_image
                    images = [base_image]

                output = self.editor.edit_image(images, prompt).images[0]
                prev_image = output
                last_call_at = time.time()

                iter_end = time.time()
                iter_time = (iter_end - iter_start) * 1000

                # Save image locally with numbered prefix
                local_filename = f"{i+1:02d}_{stage_name}.png"
                self.save_image_locally(output, local_filename)

                # Upload iteration results if requested
                if options.save_intermediate:
                    iter_filename = f"{session_id}/{stage_name}.png"
                    iter_url = await self.upload_to_supabase(output, iter_filename)

                    iterations_results.append(IterationResult(
                        iteration_number=i+1,
                        image_url=iter_url,
                        mask_url=None,
                        processing_time_ms=iter_time,
                        timestamp=datetime.utcnow()
                    ))

                print(f"  ✅ Completed in {iter_time/1000:.2f}s")
                print(f"{'='*60}")

            # Use last stage as final result
            final_filename = f"{session_id}/final_result.png"
            if iterations_results:
                final_url = iterations_results[-1].image_url
            else:
                # If no intermediate saves, upload the final generated stage image
                final_url = await self.upload_to_supabase(prev_image, final_filename)

            total_time = (time.time() - start_time) * 1000

            # Print summary
            print(f"\n{'='*60}")
            print(f"✅ HAIR JOURNEY GENERATION COMPLETE!")
            print(f"{'='*60}")
            print(f"📊 Total processing time: {total_time/1000:.2f}s")
            print(f"📁 Local files saved to: {OUTPUTS_DIR}")
            print(f"📄 Files generated:")
            for file_path in sorted(OUTPUTS_DIR.glob("*.png")):
                print(f"   - {file_path.name}")
            print(f"{'='*60}\n")

            result = HairJourneyResult(
                session_id=session_id,
                original_image_url=original_url,
                final_result_url=final_url,
                iterations=iterations_results,
                total_processing_time_ms=total_time,
                view_type="front"
            )

            # Save to database
            await self.save_journey_to_db(session_id, result)

            return result

        except Exception as e:
            print(f"Error in hair journey generation: {e}")
            raise
    
    async def get_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get hair journey history for a user"""
        try:
            if not self.supabase.enabled:
                return []
                
            response = self.supabase.client.table("hair_journey_sessions")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
                
            return response.data if response.data else []
            
        except Exception as e:
            print(f"Error fetching history: {e}")
            return []

# Service instance
hair_journey_service = HairJourneyService()