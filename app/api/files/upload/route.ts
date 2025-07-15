import { NextRequest, NextResponse } from 'next/server'
import { supabase, uploadFile, getPublicUrl } from '@/lib/supabase'
import { FileUploadResponse, FileMetadata } from '@/lib/types'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    console.log('File upload request received')
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    console.log('Form data parsed, file:', file ? `${file.name} (${file.size} bytes)` : 'null')

    if (!file) {
      console.log('No file provided in request')
      return NextResponse.json<FileUploadResponse>({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv'
    ]

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json<FileUploadResponse>({
        success: false,
        error: 'Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'
      }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFilename = `${timestamp}_${sanitizedName}`
    const filePath = `uploads/${uniqueFilename}`

    // Upload file to Supabase storage
    console.log('Uploading file to Supabase storage:', filePath)
    await uploadFile(file, filePath)
    console.log('File uploaded successfully to storage')

    // Get public URL
    const publicUrl = getPublicUrl(filePath)
    console.log('Generated public URL:', publicUrl)

    // Determine file type and get sheet count for Excel files
    let fileType: 'excel' | 'csv' | 'other' = 'other'
    let sheetCount: number | undefined

    if (file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      fileType = 'excel'
      
      // Count sheets in Excel file
      try {
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        sheetCount = workbook.SheetNames.length
      } catch (error) {
        console.warn('Could not read Excel file for sheet count:', error)
        sheetCount = 1
      }
    } else if (file.type.includes('csv') || file.name.endsWith('.csv')) {
      fileType = 'csv'
      sheetCount = 1
    }

    // Save file metadata to database
    const fileMetadata: Omit<FileMetadata, 'id'> = {
      filename: uniqueFilename,
      original_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      upload_date: new Date().toISOString(),
      file_type: fileType,
      sheet_count: sheetCount,
      public_url: publicUrl
    }

    console.log('Saving file metadata to database:', fileMetadata)
    
    const { data, error } = await supabase
      .from('uploaded_files')
      .insert([fileMetadata])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json<FileUploadResponse>({
        success: false,
        error: `Failed to save file metadata to database: ${error.message}`
      }, { status: 500 })
    }

    console.log('File metadata saved successfully:', data)

    // Transform database response to match frontend interface
    const uploadedFile = {
      id: data.id,
      filename: data.filename,
      originalName: data.original_name,
      filePath: data.file_path,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      uploadDate: data.upload_date,
      fileType: data.file_type,
      sheetCount: data.sheet_count,
      publicUrl: data.public_url
    }

    return NextResponse.json<FileUploadResponse>({
      success: true,
      file: uploadedFile
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json<FileUploadResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file'
    }, { status: 500 })
  }
} 