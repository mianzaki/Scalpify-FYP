"""
Hair Transplant Journey Generator using Qwen Image Edit Plus
=============================================================

Generates progressive hair regrowth stages after FUE hair transplant procedure.

Stages:
- 15 Days: Initial healing with minimal stubble
- 1 Month: Short stubble, sparse coverage
- 2 Months: Visible growth, patchy appearance
- 3 Months: Improved density, transitional stage
- 4 Months: Well-established growth
- 5 Months: Advanced mature hair
- 6 Months: Final result, full density

Updated with medically accurate prompts based on real FUE transplant progression.
"""

import os
import replicate
from dotenv import load_dotenv
import requests
import glob
import time
from PIL import Image
import matplotlib.pyplot as plt

# Load .env API token
load_dotenv()
api_token = os.getenv("REPLICATE_API_TOKEN")

if not api_token:
    raise ValueError("❌ REPLICATE_API_TOKEN not found in .env file")

os.environ["REPLICATE_API_TOKEN"] = api_token
print("✅ Replicate API token loaded successfully")

# Input local image
files = glob.glob(r"test\test_image.jpg")
if not files:
    raise FileNotFoundError("⚠️ No .jpg files found in ./test_images/")

# Select base image (safely handle index out of range)
image_index = 16
if len(files) > image_index:
    base_image_path = files[image_index]
    print(f"✅ Using image at index {image_index}: {base_image_path}")
else:
    base_image_path = files[0]
    print(f"⚠️ Index {image_index} out of range, using first image: {base_image_path}")

print(f"📸 Base input: {base_image_path}")
print(f"📁 Total images available: {len(files)}")

# Enhanced negative prompt for better control
enhanced_negative_prompt = """
DO NOT add hair to the forehead area below the natural hairline. DO NOT generate
hair growth on temples beyond natural hairline. NO hair on forehead skin. NO
unnatural hair patterns. NO uniform/artificial-looking hair distribution. NO
excessive density that looks fake. NO wrong hair color. NO hair texture changes
on existing hair. NO modifications to facial features. NO changes to ears,
eyebrows, or facial hair. NO unrealistic shine or artificial appearance. NO
visible graft lines or scarring. NO patchy areas after month 5. NO sudden density
jumps between stages. NO hair that's too perfect or too uniform. NO changes to
side or back hair. NO alterations to face shape or skin tone. Avoid: unrealistic,
blurry, deformed, disfigured, distorted, mutated, ugly, tiling, poorly drawn,
extra limbs, cloned face, bad proportions, malformed, missing features, fused
elements, out of frame, low quality, artifacts, over-processed, cartoon-like,
computer-generated appearance.
"""

# Hair transplant journey stages (medically accurate based on real FUE progression)
stages = [
    ("15_days_post_fue",
    "Edit the image to show a 15-day post-FUE hair transplant result. The transplanted area should have mostly healed with all redness gone. Tiny ultra-short hair stubble (0.1-0.3mm) should be barely visible as dark pinpoints across the previously bald scalp - like a fresh buzz cut that's just starting. Most transplanted hairs will have shed (shock loss), so the area looks sparse with scattered short stubble. The scalp should appear clean, healed, and slightly pinkish with no scabs. Small dark dots (follicles) should be faintly visible. The forehead hairline and temples remain completely unchanged. Hair on sides and back of head remain identical to original. Natural skin texture maintained.",
    {"num_inference_steps": 35, "guidance_scale": 10.0, "strength": 0.35}),

    ("1_month_post_fue",
    "Edit the image to show a 1-month post-FUE hair transplant result. The transplanted area displays very short, fine stubble (0.4-0.8mm) uniformly distributed across the previously bald scalp. The hair appears as ultra-short dark stubble - similar to a 1-day beard shadow but on the scalp. Coverage is sparse and patchy, as this is the early regrowth phase before the growth cycle fully activates. The scalp looks completely healed with normal skin tone, no redness or scarring visible. Individual short hairs should be visible upon close inspection but overall density still appears thin. The forehead, temples, and existing hair on sides/back remain completely unchanged. Natural scalp texture and skin pores visible.",
    {"num_inference_steps": 35, "guidance_scale": 9.5, "strength": 0.38}),

    ("2_months_post_fue",
    "Edit the image to show a 2-month post-FUE hair transplant result. Short, fine hair (0.8-1.2cm) growing across the transplanted area with improved but still incomplete coverage. The hair should appear soft, slightly wispy, and naturally spaced out - not thick or dense yet. Hair strands are visible and clearly growing but the scalp is still partially visible between hairs, creating a patchy appearance. Hair texture should match the original hair color and direction but with finer, baby-hair quality. Some areas show better density than others (uneven growth is normal). The scalp underneath is still slightly visible through the hair. Forehead and existing hair remain completely unchanged. Natural lighting and realistic hair distribution.",
    {"num_inference_steps": 35, "guidance_scale": 9.5, "strength": 0.40}),

    ("3_months_post_fue",
    "Edit the image to show a 3-month post-FUE hair transplant result. Moderate-length hair (1.2-2.0cm) with noticeably improved density and coverage. The hair should appear healthier, stronger, and more evenly distributed compared to month 2. Most of the transplanted area now shows visible hair growth, though some thin patches may still be present. Hair strands are thicker, more structured, and beginning to look like mature hair. The overall appearance transitions from 'growing hair' to 'young adult hair' - still not fully mature but clearly established. Hair should match the original color, texture, and natural growth direction. Scalp is mostly covered but may still be slightly visible in certain lighting. Forehead and existing side/back hair remain unchanged. Natural, realistic hair density for 3-month growth stage.",
    {"num_inference_steps": 35, "guidance_scale": 9.0, "strength": 0.42}),

    ("4_months_post_fue",
    "Edit the image to show a 4-month post-FUE hair transplant result. Well-established hair growth (2.0-3.0cm) with significantly improved coverage and natural appearance. The transplanted area should display thick, healthy hair that closely matches the density and quality of the existing hair on sides and back. Most bald areas are now covered with strong, well-rooted hair strands. Hair should appear fuller, with good volume and natural texture matching the original hair color exactly. Some minor thin spots may still exist but overall coverage is substantial and convincing. The hair should have natural shine, proper directionality, and realistic layering. Scalp is mostly hidden beneath the hair with only minimal visibility. Hair follicles appear well-established and mature. Forehead hairline remains natural and unchanged. Side and back hair completely unchanged. Lighting should show natural hair depth and dimension.",
    {"num_inference_steps": 40, "guidance_scale": 9.0, "strength": 0.45}),

    ("5_months_post_fue",
    "Edit the image to show a 5-month post-FUE hair transplant result. Advanced, mature hair growth (3.0-4.5cm) with excellent density and completely natural appearance. The previously bald area should now be fully covered with thick, healthy, well-distributed hair that seamlessly blends with existing hair. Hair strands are strong, mature, and indistinguishable from non-transplanted hair in terms of texture, color, and thickness. The scalp should be completely covered with no visible thin spots or patches. Hair displays natural volume, proper flow direction, and realistic styling potential. Individual hair strands should vary slightly in thickness (natural variation). Hair has natural shine and healthy appearance with excellent coverage density. The result should look completely natural as if no transplant occurred - just a full head of hair. Forehead remains unchanged. All existing hair on sides and back unchanged. Perfect integration between transplanted and original hair zones.",
    {"num_inference_steps": 40, "guidance_scale": 8.5, "strength": 0.48}),

    ("6_months_post_fue",
    "Edit the image to show a 6-month post-FUE hair transplant final result. Complete, mature hair growth (4.5-6.0cm+) with full density matching natural hair. The entire previously bald area should be covered with thick, healthy, completely natural-looking hair that is indistinguishable from the person's original hair. Hair should display excellent volume, natural texture, proper growth direction, and seamless integration with existing hair. The scalp is completely hidden beneath dense, mature hair coverage. Hair strands appear strong, healthy, well-rooted, and fully matured with natural variation in strand thickness. The overall appearance should be that of a naturally full head of hair with zero indication of a transplant procedure. Hair color matches exactly with original hair, with natural highlights and depth. Hair should have natural shine, body, and styling capability. Perfect density distribution across the entire transplanted zone. The forehead hairline looks natural and unchanged from original. Side and back hair remain identical to original. The result represents a successful, undetectable hair restoration with complete natural appearance.",
    {"num_inference_steps": 45, "guidance_scale": 8.5, "strength": 0.50})
]


# Output folder
os.makedirs("outputs", exist_ok=True)
generated_images = []

# Run Qwen Image Edit Plus with base image for each stage
for i, (stage_name, prompt, params) in enumerate(stages, start=1):
    print(f"\n{'='*80}")
    print(f"Iteration {i}/{len(stages)}: {stage_name}")
    print(f"{'='*80}")
    print(f"Prompt: {prompt[:150]}...")
    print(f"Parameters: steps={params['num_inference_steps']}, guidance={params['guidance_scale']}, strength={params['strength']}")

    try:
        with open(base_image_path, "rb") as img_file:
            start_time = time.time()

            output = replicate.run(
                "qwen/qwen-image-edit-plus",
                input={
                    "prompt": prompt,
                    "negative_prompt": enhanced_negative_prompt,
                    "image": [img_file],  # Must be array
                    "num_inference_steps": params["num_inference_steps"],
                    "guidance_scale": params["guidance_scale"],
                    "strength": params["strength"],
                    "seed": 123456
                }
            )

            end_time = time.time()
            inference_time = end_time - start_time

        # Save output
        image_url = output[0] if isinstance(output, list) else output

        # Download image with retry
        max_retries = 3
        for attempt in range(max_retries):
            try:
                img_data = requests.get(image_url, timeout=30).content
                break
            except requests.RequestException as e:
                if attempt == max_retries - 1:
                    raise
                print(f"⚠️  Download attempt {attempt + 1} failed, retrying...")
                time.sleep(2)

        out_path = f"outputs/{i:02d}_{stage_name}.png"
        with open(out_path, "wb") as f:
            f.write(img_data)

        print(f"✅ Saved: {out_path}")
        print(f"⏱  Inference time: {inference_time:.2f} seconds")
        print(f"🔗 URL: {image_url}")

        generated_images.append((stage_name, out_path))

    except Exception as e:
        print(f"❌ Error processing {stage_name}: {str(e)}")
        print(f"   Skipping to next stage...")
        continue

# Print summary
print(f"\n{'='*80}")
if len(generated_images) == len(stages):
    print("✅ ALL STAGES COMPLETED SUCCESSFULLY!")
else:
    print(f"⚠️  COMPLETED WITH SOME ERRORS")
    print(f"   Generated: {len(generated_images)}/{len(stages)} stages")
print(f"{'='*80}")
print(f"📊 Total stages generated: {len(generated_images)}")
print(f"📁 Output directory: outputs/")
print(f"🖼️  Files generated:")
for i, (stage_name, path) in enumerate(generated_images, 1):
    print(f"   {i}. {path}")
print(f"{'='*80}\n")

# Display all results side by side (only if we have images)
if not generated_images:
    print("❌ No images were generated successfully. Please check the errors above.")
    exit(1)

num_images = len(generated_images)
fig_width = min(24, num_images * 3.5)  # Adaptive width
fig, axes = plt.subplots(1, num_images, figsize=(fig_width, 5))

# Handle single image case
if num_images == 1:
    axes = [axes]

for ax, (label, path) in zip(axes, generated_images):
    img = Image.open(path)
    ax.imshow(img)
    # Format stage name for display
    display_label = label.replace("_post_fue", "").replace("_", " ").title()
    ax.set_title(display_label, fontsize=9, fontweight='bold')
    ax.axis("off")

plt.suptitle("Hair Transplant Journey Progression (FUE)", fontsize=14, fontweight='bold', y=0.98)
plt.tight_layout()

# Save combined visualization
combined_output = "outputs/hair_transplant_journey_complete.png"
plt.savefig(combined_output, dpi=150, bbox_inches='tight')
print(f"💾 Saved combined visualization: {combined_output}")

plt.show()

print("\n🎉 Process complete! Check the 'outputs' folder for all results.")
