import requests
import json
import base64
import sys
from pathlib import Path

def generate_slide():
    # 1. Resolve paths relative to where THIS script is located
    script_dir = Path(__file__).parent.resolve()
    image_path = script_dir / "test_slide_gen.png"
    output_file = script_dir / "generated_slide.tsx"

    # Check if the image exists
    if not image_path.exists():
        print(f"❌ Error: Could not find {image_path}")
        print(f"Please ensure 'test_slide_gen.jpg' is in: {script_dir}")
        sys.exit(1)

    # 2. Convert image to Base64
    print(f"📸 Reading image: {image_path.name}...")
    with open(image_path, "rb") as img_file:
        # Encode bytes to base64 and then to string
        base64_data = base64.b64encode(img_file.read()).decode('utf-8')

    # 3. Prepare the API payload
    payload = {
        "prompt": "Create a professional financial slide based on this image. Include a chart and a table summarizing the key data points.",
        "slideNumber": 1,
        "images": [
            {
                "data": base64_data,
                "mediaType": "image/png"
            }
        ],
        "theme": {
            "headingFont": "Inter",
            "bodyFont": "Inter",
            "accentColors": ["#2563eb", "#10b981", "#f59e0b"],
            "headingFontSize": 32,
            "bodyFontSize": 14
        }
    }

    url = "https://www.getvolute.com/api/generate-slide"
    headers = {"Content-Type": "application/json"}

    try:
        print(f"🚀 Sending request to {url}...")
        # Note: API has a 300s maxDuration, so we set a long timeout
        response = requests.post(url, json=payload, headers=headers, timeout=310)
        
        # Check for HTTP errors
        response.raise_for_status()
        
        data = response.json()
        
        # 4. Extract the code and save to file
        if "code" in data:
            generated_code = data["code"]
            with open(output_file, "w", encoding="utf-8") as f:
                f.write(generated_code)
            
            print(f"✅ Success! Generated code saved to: {output_file}")
            print(f"📊 Usage: {data.get('usage', 'N/A')}")
        else:
            print("⚠️ API responded but no 'code' field was found.")
            print(json.dumps(data, indent=2))

    except requests.exceptions.RequestException as e:
        print(f"❌ API Request failed: {e}")
        if hasattr(e.response, 'text'):
            print(f"Details: {e.response.text}")

if __name__ == "__main__":
    generate_slide()