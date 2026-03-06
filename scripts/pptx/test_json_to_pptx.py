import requests
import json
import os
import sys

# Get the directory where the script itself is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Build the absolute path to the JSON file
json_file_path = os.path.join(SCRIPT_DIR, "parsed_slide_output.json")
output_pptx = os.path.join(SCRIPT_DIR, "GeneratedPresentation.pptx")

def test_pptx_export():
    # Configuration
    dev_url = "http://localhost:5245/api/Presentation/export" 
    prod_url = "https://doclayer.onrender.com/api/Presentation/export"

    # 1. Load the slide data from your file
    if not os.path.exists(json_file_path):
        print(f"Error: {json_file_path} not found in current directory.")
        return

    with open(json_file_path, 'r') as f:
        slide_data = json.load(f)

    # 2. Prepare the payload based on your ExportRequest model
    # Note: slide_data is one object, but the controller expects an array
    payload = {
        "PresentationName": "Financial_Report_Alpha",
        "SlideJsonArray": [slide_data] 
    }

    print(f"Sending request to {prod_url}...")

    try:
        # 3. POST the request
        response = requests.post(
            prod_url, 
            json=payload,
            headers={"Content-Type": "application/json"}
        )

        # 4. Handle the response
        if response.status_code == 200:
            with open(output_pptx, 'wb') as f:
                f.write(response.content)
            print(f"✅ Success! File saved as: {output_pptx}")
        else:
            print(f"❌ Failed with status code: {response.status_code}")
            print(f"Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the server. Is the Docker container running on port 5245?")
    except Exception as e:
        print(f"❌ An unexpected error occurred: {e}")

if __name__ == "__main__":
    test_pptx_export()