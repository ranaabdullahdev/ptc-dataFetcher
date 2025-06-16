# Google Sheets Landing Page

A modern, responsive landing page that fetches data from Google Sheets based on user search queries.

## Features

- 🔍 **Real-time Search**: Search by ID to fetch data from Google Sheets
- 📱 **Mobile Responsive**: Optimized for all device sizes
- 🔗 **QR Code Generation**: Generate QR codes for easy mobile access
- ⚡ **Fast Loading**: Optimized performance with loading states
- 🎨 **Modern UI**: Beautiful gradient design with glassmorphism effects

## Setup Instructions

### 1. Google Sheets API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Sheets API
4. Create a Service Account:
   - Go to "Credentials" → "Create Credentials" → "Service Account"
   - Download the JSON key file
5. Share your Google Sheet with the service account email
6. Copy the Sheet ID from the URL

### 2. Environment Variables

Create a `.env.local` file with:

\`\`\`env
GOOGLE_CLIENT_EMAIL=your-service-account-email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your-google-sheet-id
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### 3. Google Sheet Format

Your Google Sheet should have headers in the first row, with the first column being the ID field:

| id      | name     | email              | department | status |
|---------|----------|--------------------|------------|--------|
| USER001 | John Doe | john@example.com   | Engineering| Active |
| USER002 | Jane Doe | jane@example.com   | Marketing  | Active |

### 4. Install Dependencies

The app uses these key dependencies:
- `googleapis` - For Google Sheets API integration
- `lucide-react` - For icons
- `@/components/ui/*` - shadcn/ui components

### 5. Deploy

Deploy to Vercel with environment variables configured.

## Usage

1. **Search**: Enter an ID in the search box
2. **QR Code**: Click "QR Code" to generate a scannable code
3. **Mobile**: Scan QR code on mobile devices for easy access
4. **Results**: View formatted data from your Google Sheet

## API Endpoints

- `GET /api/sheets?id={ID}` - Fetch data for specific ID

## Customization

- Modify `mockSheetData` in `/api/sheets/route.ts` for testing
- Update the Google Sheets integration code (commented in the API route)
- Customize the UI colors and styling in the components
- Add more fields by updating the data structure
# ptc-dataFetcher
