# Volute Data Website

A simple, clean website displaying a data table with CSV download functionality.

## Features
- Responsive table display
- Download table data as CSV
- Clean, modern design

## Deploy to Vercel

### Option 1: Using Vercel CLI
1. Install Vercel CLI (if not already installed):
   ```
   npm install -g vercel
   ```

2. Navigate to project directory:
   ```
   cd volute-data-website
   ```

3. Deploy:
   ```
   vercel
   ```

4. Follow the prompts and confirm deployment

### Option 2: Using Vercel Dashboard
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your Git repository (push this folder to GitHub first) OR drag and drop the folder
4. Click "Deploy"

## Local Development
Simply open `index.html` in your browser to view locally.

## Customization
- Edit the table data in `index.html`
- Modify colors and styling in `styles.css`
- Adjust CSV filename in `script.js` (line with `'table-data.csv'`)
