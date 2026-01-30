import csv
import os

# Configuration
INPUT_FILENAME = 'tickers_sophie - tickers_sophie.csv'
OUTPUT_FILE_NAME = 'urls.txt'

# Get the directory where the script is located
base_dir = os.path.dirname(os.path.abspath(__file__))
input_path = os.path.join(base_dir, INPUT_FILENAME)

print(f"Processing CSV: {INPUT_FILENAME}...")

try:
    with open(input_path, mode='r', encoding='utf-8-sig') as f:
        # DictReader uses the first row as keys for the dictionary
        reader = csv.DictReader(f)
        
        for row in reader:
            ticker = row.get('ticker', '').strip()
            
            # Skip rows where ticker is empty
            if not ticker:
                continue
            
            # Create a set for this specific ticker to store unique URLs
            ticker_urls = set()

            # Iterate through all columns in the row
            for key, value in row.items():
                # Only look at columns starting with "Source"
                if key and key.startswith('Source') and value:
                    clean_value = value.strip()
                    
                    # Filter: Only keep actual links, ignore headlines/text
                    if clean_value.lower().startswith('http'):
                        ticker_urls.add(clean_value)

            # If we found URLs, create the directory and save the file
            if ticker_urls:
                # Create subdirectory for the ticker (e.g., ./BTSG/)
                ticker_dir = os.path.join(base_dir, ticker)
                os.makedirs(ticker_dir, exist_ok=True)
                
                # Path to the specific urls.txt (e.g., ./BTSG/urls.txt)
                output_path = os.path.join(ticker_dir, OUTPUT_FILE_NAME)
                
                with open(output_path, mode='w', encoding='utf-8') as f_out:
                    f_out.write('\n'.join(sorted(ticker_urls)))
                
                print(f"Generated: {ticker}/{OUTPUT_FILE_NAME} ({len(ticker_urls)} URLs)")

    print("-" * 40)
    print("Task Complete!")

except FileNotFoundError:
    print(f"Error: The file '{INPUT_FILENAME}' was not found.")
except Exception as e:
    print(f"An error occurred: {e}")