# PTC Data Fetcher

A modern, responsive data management application with multiple data sources and cloud storage capabilities.

## Features

- 🔍 **Real-time Search**: Search by ID to fetch data from Google Sheets
- 📁 **File Upload**: Upload and process Excel (.xlsx, .xls) and CSV files
- ☁️ **Cloud Storage**: Store files in Supabase object storage with metadata tracking
- 🔗 **Google Sheets Import**: Import data directly from Google Sheets URLs
- 📱 **Mobile Responsive**: Optimized for all device sizes
- 🔗 **QR Code Generation**: Generate QR codes for easy mobile access
- ⚡ **Fast Loading**: Optimized performance with loading states
- 🎨 **Modern UI**: Beautiful gradient design with glassmorphism effects
- 🗃️ **File Management**: View, download, and delete uploaded files
- 📊 **Data Analysis**: Filter, sort, and export processed data

## Setup Instructions

### 1. Supabase Setup

1. Go to [Supabase](https://supabase.com/) and create a new project
2. Go to **Settings** → **API** to get your project URL and anon key
3. Go to **Storage** → **Create a new bucket** and create a bucket named `uploaded-files`
4. Make sure the bucket is **public** (for file downloads)
5. Go to **SQL Editor** and run the migration from `supabase/migrations/001_create_uploaded_files_table.sql`

### 2. Google Sheets API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API
4. Create a Service Account:
   - Go to "Credentials" → "Create Credentials" → "Service Account"
   - Download the JSON key file
5. Share your Google Sheet with the service account email
6. Copy the Sheet ID from the URL

### 3. Environment Variables

Create a `.env.local` file with:

\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Sheets API
GOOGLE_CLIENT_EMAIL=your-service-account-email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-google-sheet-id
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### 4. Google Sheet Format

Your Google Sheet should have headers in the first row, with the first column being the ID field:

| id      | name     | email              | department | status |
|---------|----------|--------------------|------------|--------|
| USER001 | John Doe | john@example.com   | Engineering| Active |
| USER002 | Jane Doe | jane@example.com   | Marketing  | Active |

### 5. Install Dependencies

The app uses these key dependencies:
- `@supabase/supabase-js` - For Supabase database and storage
- `googleapis` - For Google Sheets API integration
- `xlsx` - For Excel file processing
- `lucide-react` - For icons
- `@/components/ui/*` - shadcn/ui components

```bash
npm install
```

### 6. Deploy

Deploy to Vercel with environment variables configured.

## Usage

### Google Sheets Search
1. **Search**: Enter an ID in the search box
2. **QR Code**: Click "QR Code" to generate a scannable code
3. **Mobile**: Scan QR code on mobile devices for easy access
4. **Results**: View formatted data from your Google Sheet

### File & URL Import
1. **Local Upload**: Upload Excel/CSV files for immediate processing
2. **Google Sheets URL**: Import data directly from Google Sheets URLs
3. **Cloud Storage**: Upload files to Supabase for persistent storage
4. **File Management**: View, download, and delete uploaded files

### Data Analysis
1. **Filter & Search**: Use global search and column-specific filters
2. **Sort**: Click column headers to sort data
3. **Export**: Export filtered data as CSV
4. **Multi-sheet Support**: Navigate between Excel sheets

## API Endpoints

### Google Sheets API
- `GET /api/sheets?id={ID}` - Fetch data for specific ID
- `GET /api/sheets/url?url={URL}` - Fetch data from Google Sheets URL

### File Management API
- `POST /api/files/upload` - Upload file to Supabase storage
- `GET /api/files/list` - List all uploaded files
- `GET /api/files/{id}?action=metadata` - Get file metadata
- `GET /api/files/{id}?action=download` - Download file
- `GET /api/files/{id}?action=read` - Read and parse file content
- `DELETE /api/files/{id}` - Delete file and metadata

## Customization

- Modify `mockSheetData` in `/api/sheets/route.ts` for testing
- Update the Google Sheets integration code (commented in the API route)
- Customize the UI colors and styling in the components
- Add more fields by updating the data structure
# ptc-dataFetcher
