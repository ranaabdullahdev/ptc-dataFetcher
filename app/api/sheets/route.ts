import { type NextRequest, NextResponse } from "next/server"

// Function to fetch CSV data from published Google Sheet
async function fetchSheetData() {
  try {
    // Convert the published URL to CSV format
    const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTUF5WuNm6OdNgITZBIiG2h4Eg6CATuolkLdaIv8xF45rnu6kofvS_UluBUAktSr7WJWBvgbuWzEdok/pub?output=csv"
    
    const response = await fetch(csvUrl)
    if (!response.ok) {
      throw new Error('Failed to fetch sheet data')
    }
    
    const csvText = await response.text()
    return csvText
  } catch (error) {
    console.error('Error fetching sheet data:', error)
    throw error
  }
}

// Function to parse CSV data
function parseCSV(csvText: string) {
  const lines = csvText.split('\n')
  const headers = lines[0].split(',').map(header => header.trim())
  
  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.trim())
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index] || ''
      return obj
    }, {} as Record<string, string>)
  })
  
  return data
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID parameter is required" }, { status: 400 })
    }

    // Fetch and parse the sheet data
    const csvText = await fetchSheetData()
    const sheetData = parseCSV(csvText)

    // Find data by ID (case-insensitive)
    const foundData = sheetData.find((item) => 
      Object.values(item)[0]?.toLowerCase() === id.toLowerCase()
    )

    if (!foundData) {
      return NextResponse.json({ error: `No data found for ID: ${id}` }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: foundData,
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}