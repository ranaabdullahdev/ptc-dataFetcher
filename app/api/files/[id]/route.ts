import { NextRequest, NextResponse } from 'next/server'
import { supabase, downloadFile } from '@/lib/supabase'
import * as XLSX from 'xlsx'

// GET file metadata
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') // 'metadata', 'download', 'read'
    const searchId = searchParams.get('search')
    const queryId = searchParams.get('id')
    const uppercaseId = searchParams.get('Id') // Handle uppercase Id parameter

    // Get file metadata from database
    const { data: fileData, error: dbError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', id)
      .single()

    if (dbError || !fileData) {
      return NextResponse.json({
        success: false,
        error: 'File not found'
      }, { status: 404 })
    }

    // Search by ID in file (CSV or Excel) - this must come BEFORE metadata return
    if (searchId !== null || queryId !== null || uppercaseId !== null) {
      const searchValue = searchId || queryId || uppercaseId
      // Download file from storage
      const blob = await downloadFile(fileData.file_path)
      let allResults: any[] = []
      
      if (fileData.file_type === 'csv') {
        const text = await blob.text()
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length === 0) {
          return NextResponse.json({ success: false, error: 'No data found in CSV file' }, { status: 404 })
        }
        const columns = lines[0].split(',').map(header => header.trim().replace(/"/g, ''))
        const rows = lines.slice(1).map(line => {
          const values = line.split(',').map(value => value.trim().replace(/"/g, ''))
          const obj: Record<string, any> = {}
          columns.forEach((header, index) => {
            obj[header] = values[index] || ''
          })
          return obj
        })
        
        // Find the ID column - look for common ID column names or use first column as fallback
        const possibleIdColumns = ['id', 'ID', 'Id', 'iD']
        let idColumn = columns.find(col => possibleIdColumns.includes(col)) || columns[0]
        
        // Find row where ID column matches searchValue (case-insensitive)
        const found = rows.find(row => String(row[idColumn]).toLowerCase() === String(searchValue).toLowerCase())
        if (found) {
          allResults.push({
            sheetName: 'Sheet1',
            data: found,
            searchedColumn: idColumn
          })
        }
      } else if (fileData.file_type === 'excel') {
        const arrayBuffer = await blob.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        
        // Search across all sheets
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          if (jsonData.length === 0) continue
          
          const columns = jsonData[0] as string[]
          const dataRows = jsonData.slice(1) as any[][]
          const rows = dataRows.map(row => {
            const obj: Record<string, any> = {}
            columns.forEach((header, index) => {
              obj[header] = row[index] !== undefined ? row[index] : ''
            })
            return obj
          })
          
          // Find the ID column - look for common ID column names or use first column as fallback
          const possibleIdColumns = ['id', 'ID', 'Id', 'iD']
          let idColumn = columns.find(col => possibleIdColumns.includes(col)) || columns[0]
          
          // Find row where ID column matches searchValue (case-insensitive)
          const found = rows.find(row => String(row[idColumn]).toLowerCase() === String(searchValue).toLowerCase())
          if (found) {
            allResults.push({
              sheetName,
              data: found,
              searchedColumn: idColumn
            })
          }
        }
      } else {
        return NextResponse.json({ success: false, error: 'Unsupported file type for search' }, { status: 400 })
      }
      
      if (allResults.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: `No data found for ID: ${searchValue}`,
          searchedValue: searchValue
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        success: true, 
        data: allResults.length === 1 ? allResults[0].data : allResults,
        multipleSheets: allResults.length > 1,
        multipleTabs: allResults.length > 1,
        sheets: allResults,
        tabs: allResults,
        searchedValue: searchValue
      })
    }

    // Only return file metadata if not searching by ID
    if (action === 'metadata' || !action) {
      const file = {
        id: fileData.id,
        filename: fileData.filename,
        originalName: fileData.original_name,
        filePath: fileData.file_path,
        fileSize: fileData.file_size,
        mimeType: fileData.mime_type,
        uploadDate: fileData.upload_date,
        fileType: fileData.file_type,
        sheetCount: fileData.sheet_count,
        publicUrl: fileData.public_url
      }

      return NextResponse.json({
        success: true,
        file
      })
    }

    // Download file from storage
    const blob = await downloadFile(fileData.file_path)

    // If download action is requested, return the file blob
    if (action === 'download') {
      return new NextResponse(blob, {
        headers: {
          'Content-Type': fileData.mime_type,
          'Content-Disposition': `attachment; filename="${fileData.original_name}"`,
          'Content-Length': blob.size.toString()
        }
      })
    }

    // If read action is requested, parse and return file content
    if (action === 'read') {
      try {
        if (fileData.file_type === 'csv') {
          const text = await blob.text()
          const lines = text.split('\n').filter(line => line.trim())
          
          if (lines.length === 0) {
            throw new Error('No data found in CSV file')
          }

          const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''))
          const dataRows = lines.slice(1).map(line => {
            const values = line.split(',').map(value => value.trim().replace(/"/g, ''))
            const obj: Record<string, any> = {}
            headers.forEach((header, index) => {
              obj[header] = values[index] || ''
            })
            return obj
          })

          return NextResponse.json({
            success: true,
            data: {
              fileName: fileData.original_name,
              sheetName: 'Sheet1',
              columns: headers,
              data: dataRows,
              totalRows: dataRows.length
            }
          })

        } else if (fileData.file_type === 'excel') {
          const arrayBuffer = await blob.arrayBuffer()
          const workbook = XLSX.read(arrayBuffer, { type: 'array' })
          
          const sheetsData = workbook.SheetNames.map(sheetName => {
            const worksheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
            
            if (jsonData.length === 0) return null
            
            const headers = jsonData[0] as string[]
            const dataRows = jsonData.slice(1) as any[][]
            
            const formattedData = dataRows
              .filter(row => row.some(cell => cell !== undefined && cell !== null && cell !== ''))
              .map(row => {
                const obj: Record<string, any> = {}
                headers.forEach((header, index) => {
                  const key = header || `Column_${index + 1}`
                  obj[key] = row[index] !== undefined ? row[index] : ''
                })
                return obj
              })

            return {
              fileName: fileData.original_name,
              sheetName,
              columns: headers.filter(header => header),
              data: formattedData,
              totalRows: formattedData.length
            }
          }).filter(sheet => sheet !== null)

          return NextResponse.json({
            success: true,
            data: sheetsData.length > 0 ? sheetsData[0] : null,
            allSheets: sheetsData
          })

        } else {
          return NextResponse.json({
            success: false,
            error: 'Unsupported file type for reading'
          }, { status: 400 })
        }

      } catch (parseError) {
        console.error('File parse error:', parseError)
        return NextResponse.json({
          success: false,
          error: parseError instanceof Error ? parseError.message : 'Failed to parse file'
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action parameter'
    }, { status: 400 })

  } catch (error) {
    console.error('File retrieval error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve file'
    }, { status: 500 })
  }
}

// DELETE file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get file metadata from database
    const { data: fileData, error: dbError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('id', id)
      .single()

    if (dbError || !fileData) {
      return NextResponse.json({
        success: false,
        error: 'File not found'
      }, { status: 404 })
    }

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from('uploaded-files')
      .remove([fileData.file_path])

    if (storageError) {
      console.error('Storage deletion error:', storageError)
    }

    // Delete file metadata from database
    const { error: deleteError } = await supabase
      .from('uploaded_files')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Database deletion error:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete file metadata'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('File deletion error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file'
    }, { status: 500 })
  }
} 