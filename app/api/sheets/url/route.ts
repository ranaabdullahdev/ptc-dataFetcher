import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
    }

    // Validate that it's a Google Sheets URL
    if (!url.includes('docs.google.com/spreadsheets')) {
      return NextResponse.json({ error: "Invalid Google Sheets URL" }, { status: 400 })
    }

    try {
      // Fetch the CSV data from Google Sheets
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DataFetcher/1.0)',
        },
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Please ensure the Google Sheet is publicly accessible or shared with view permissions.')
        } else if (response.status === 404) {
          throw new Error('Google Sheet not found. Please check the URL.')
        } else {
          throw new Error(`Failed to fetch data from Google Sheets (Status: ${response.status})`)
        }
      }

      const csvText = await response.text()
      
      if (!csvText || csvText.trim().length === 0) {
        throw new Error('No data found in the Google Sheet')
      }

      return NextResponse.json({
        success: true,
        data: csvText,
      })
    } catch (fetchError) {
      console.error("Fetch Error:", fetchError)
      return NextResponse.json({ 
        error: fetchError instanceof Error ? fetchError.message : "Failed to fetch data from Google Sheets" 
      }, { status: 400 })
    }
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 