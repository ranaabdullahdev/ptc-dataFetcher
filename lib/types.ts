export interface FileMetadata {
  id: string
  filename: string
  original_name: string
  file_path: string
  file_size: number
  mime_type: string
  upload_date: string
  file_type: 'excel' | 'csv' | 'other'
  sheet_count?: number
  public_url?: string
}

export interface UploadedFile {
  id: string
  filename: string
  originalName: string
  filePath: string
  fileSize: number
  mimeType: string
  uploadDate: string
  fileType: 'excel' | 'csv' | 'other'
  sheetCount?: number
  publicUrl?: string
}

export interface FileUploadResponse {
  success: boolean
  file?: UploadedFile
  error?: string
}

export interface FileListResponse {
  success: boolean
  files?: UploadedFile[]
  error?: string
}

export interface ExcelData {
  fileName: string
  sheetName: string
  columns: string[]
  data: Record<string, any>[]
  totalRows: number
} 