import requests
import json
import sys
from pathlib import Path

def parse_slide():
    script_dir = Path(__file__).parent.resolve()
    source_file = script_dir / "TitleSlideTemplate3.tsx"
    output_file = script_dir / "parsed_slide_output_new.json"

    if not source_file.exists():
        print(f"Error: Could not find {source_file}")
        sys.exit(1)

    print(f"Reading {source_file.name}...")
    with open(source_file, "r", encoding="utf-8") as f:
        tsx_content = f.read()

    payload = {
        "slides": {
            "code": tsx_content,
            "slideNumber": 1
        },
        "theme": {
            "headingFont": "Inter",
            "bodyFont": "Inter",
            "headingFontSize": 32,
            "bodyFontSize": 14
        }
    }

    url = "https://www.getvolute.com/api/parse-slide-chromium-v2"
    headers = {"Content-Type": "application/json"}

    try:
        print(f"Sending request to {url}...")
        response = requests.post(url, json=payload, headers=headers, timeout=150)
        response.raise_for_status()
        
        # 1. Get the raw response data
        raw_data = response.json()

        # 2. Extract ONLY the slide content to match C# SlideSchema
        # Your parser returns { "slideNumber": 1, "slideJson": { "slide": ... } }
        if "slideJson" in raw_data:
            formatted_data = raw_data["slideJson"]
        else:
            formatted_data = raw_data

        # 3. Fix the "RGBA(0" background color error
        # PresentationExporter.cs expects a 6-digit hex string.
        try:
            bg = formatted_data.get("slide", {}).get("background", {}).get("fill", {})
            if bg.get("color") == "RGBA(0":
                bg["color"] = "FFFFFF"  # Default to white hex
        except KeyError:
            pass
            
        # 4. Save the cleaned, unwrapped JSON
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(formatted_data, f, indent=2)
            
        print(f"✅ Success! Cleaned output saved to: {output_file}")

    except requests.exceptions.RequestException as e:
        print(f"❌ API Request failed: {e}")

if __name__ == "__main__":
    parse_slide()