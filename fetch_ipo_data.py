import urllib.request
import json

def search_edgar(company_name, form_type="424B4"):
    url = f'https://efts.sec.gov/LATEST/search-index?q=%22{urllib.parse.quote(company_name)}%22&forms={form_type}'
    import urllib.parse
    url = f'https://efts.sec.gov/LATEST/search-index?q=%22{urllib.parse.quote(company_name)}%22&forms={form_type}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Research Bot research@example.com'})
    data = json.loads(urllib.request.urlopen(req).read())
    hits = data.get('hits', {}).get('hits', [])
    results = []
    for h in hits[:5]:
        src = h.get('_source', {})
        results.append({
            'file_date': src.get('file_date', ''),
            'entity_name': src.get('entity_name', ''),
            'id': h.get('_id', ''),
            'form_type': src.get('form_type', ''),
            'accession_no': src.get('accession_no', '')
        })
    return results

import urllib.parse

companies = ['Rubrik', 'Astera Labs', 'Reddit']
for company in companies:
    print(f"\n=== {company} 424B4 Filings ===")
    results = search_edgar(company)
    for r in results:
        print(json.dumps(r, indent=2))
