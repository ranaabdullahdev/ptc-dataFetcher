import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { FileListResponse, UploadedFile } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const fileType = searchParams.get('type') // Optional filter by file type
    
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('uploaded_files')
      .select('*')
      .order('upload_date', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply file type filter if provided
    if (fileType && ['excel', 'csv', 'other'].includes(fileType)) {
      query = query.eq('file_type', fileType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json<FileListResponse>({
        success: false,
        error: 'Failed to fetch files from database'
      }, { status: 500 })
    }

    // Transform database response to match frontend interface
    const files: UploadedFile[] = data.map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.original_name,
      filePath: file.file_path,
      fileSize: file.file_size,
      mimeType: file.mime_type,
      uploadDate: file.upload_date,
      fileType: file.file_type,
      sheetCount: file.sheet_count,
      publicUrl: file.public_url
    }))

    return NextResponse.json<FileListResponse>({
      success: true,
      files
    })

  } catch (error) {
    console.error('List files error:', error)
    return NextResponse.json<FileListResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list files'
    }, { status: 500 })
  }
} 