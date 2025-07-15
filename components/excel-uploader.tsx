"use client"

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Upload, FileSpreadsheet, X, Download, Search, Filter, RefreshCw, Link, Globe, Trash2, Eye, CloudUpload } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import * as XLSX from 'xlsx'
import { UploadedFile } from '@/lib/types'

interface ExcelData {
  fileName: string
  sheetName: string
  columns: string[]
  data: Record<string, any>[]
  totalRows: number
}

interface ExcelUploaderProps {
  onDataLoaded?: (data: ExcelData) => void
}

interface FilterState {
  globalSearch: string
  columnFilters: Record<string, string>
  sortColumn: string
  sortDirection: 'asc' | 'desc'
}

export default function ExcelUploader({ onDataLoaded }: ExcelUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [excelData, setExcelData] = useState<ExcelData | null>(null)
  const [selectedSheet, setSelectedSheet] = useState(0)
  const [allSheets, setAllSheets] = useState<ExcelData[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url' | 'supabase'>('file')
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [uploadingToSupabase, setUploadingToSupabase] = useState(false)
  
  const [filters, setFilters] = useState<FilterState>({
    globalSearch: '',
    columnFilters: {},
    sortColumn: '',
    sortDirection: 'asc'
  })

  // Load uploaded files from Supabase on component mount
  useEffect(() => {
    loadUploadedFiles()
  }, [])

  // Load uploaded files from Supabase
  const loadUploadedFiles = async () => {
    setLoadingFiles(true)
    try {
      const response = await fetch('/api/files/list')
      const result = await response.json()
      
      if (result.success) {
        setUploadedFiles(result.files || [])
      } else {
        console.error('Failed to load files:', result.error)
      }
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoadingFiles(false)
    }
  }

  // Upload file to Supabase
  const uploadToSupabase = async (file: File) => {
    setUploadingToSupabase(true)
    setError("")

    try {
      console.log('Starting file upload to Supabase:', file.name)
      
      const formData = new FormData()
      formData.append('file', file)

      console.log('Sending upload request...')
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      })

      console.log('Upload response status:', response.status)
      const result = await response.json()
      console.log('Upload response:', result)

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Upload failed with status ${response.status}`)
      }

      // After successful upload, delete all previous files except the new one
      try {
        const listRes = await fetch('/api/files/list')
        const listResult = await listRes.json()
        if (listResult.success && listResult.files) {
          const filesToDelete = listResult.files.filter((f: any) => f.id !== result.file.id)
          for (const fileObj of filesToDelete) {
            await fetch(`/api/files/${fileObj.id}`, { method: 'DELETE' })
          }
        }
      } catch (cleanupErr) {
        console.error('Error cleaning up old files:', cleanupErr)
      }

      console.log('File uploaded successfully, reloading files list...')
      // Reload the files list
      await loadUploadedFiles()
      
      return result.file
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file'
      setError(`Upload failed: ${errorMessage}`)
      throw error
    } finally {
      setUploadingToSupabase(false)
    }
  }

  // Load file from Supabase
  const loadFileFromSupabase = async (fileId: string) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/files/${fileId}?action=read`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load file')
      }

      if (result.allSheets && result.allSheets.length > 0) {
        // Excel file with multiple sheets
        setAllSheets(result.allSheets)
        setExcelData(result.allSheets[0])
        setSelectedSheet(0)
      } else if (result.data) {
        // Single sheet (CSV or Excel)
        setAllSheets([result.data])
        setExcelData(result.data)
        setSelectedSheet(0)
      }

      // Reset filters
      setFilters({
        globalSearch: '',
        columnFilters: {},
        sortColumn: '',
        sortDirection: 'asc'
      })

      if (onDataLoaded && result.data) {
        onDataLoaded(result.data)
      }

    } catch (error) {
      console.error('Error loading file:', error)
      setError(error instanceof Error ? error.message : 'Failed to load file')
    } finally {
      setLoading(false)
    }
  }

  // Delete file from Supabase
  const deleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete file')
      }

      // Reload the files list
      await loadUploadedFiles()
    } catch (error) {
      console.error('Delete error:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete file')
    }
  }

  // Convert data to CSV file and upload to Supabase
  const saveDataToSupabase = async (data: ExcelData) => {
    setUploadingToSupabase(true)
    setError("")

    try {
      // Convert data to CSV
      const csvContent = [
        data.columns.join(','),
        ...data.data.map(row => 
          data.columns.map(col => {
            const value = row[col] || ''
            return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
          }).join(',')
        )
      ].join('\n')

      // Create a file from the CSV content
      const csvFile = new File([csvContent], `${data.fileName.replace(/\.[^/.]+$/, '')}.csv`, {
        type: 'text/csv'
      })

      // Upload to Supabase
      const uploadedFile = await uploadToSupabase(csvFile)
      
      if (uploadedFile) {
        // Optionally load the uploaded file immediately
        await loadFileFromSupabase(uploadedFile.id)
      }

      return uploadedFile
    } catch (error) {
      console.error('Save to Supabase error:', error)
      setError(error instanceof Error ? error.message : 'Failed to save to Supabase')
      throw error
    } finally {
      setUploadingToSupabase(false)
    }
  }

  // Convert Google Sheets URL to CSV export URL
  const convertToCSVUrl = (url: string): string => {
    try {
      // Handle different Google Sheets URL formats
      if (url.includes('/edit')) {
        // Standard shareable link format
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
        if (match) {
          return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`
        }
      } else if (url.includes('/pub')) {
        // Already published format - modify to CSV
        return url.replace(/pub\?.*/, 'pub?output=csv')
      } else if (url.includes('export?format=csv')) {
        // Already in CSV export format
        return url
      }
      
      throw new Error('Invalid Google Sheets URL format')
    } catch (error) {
      throw new Error('Please provide a valid Google Sheets URL')
    }
  }

  // Fetch data from Google Sheets URL
  const handleGoogleSheetUrl = async () => {
    if (!googleSheetUrl.trim()) {
      setError('Please enter a Google Sheets URL')
      return
    }

    setLoading(true)
    setError("")

    try {
      const csvUrl = convertToCSVUrl(googleSheetUrl)
      
      // Fetch CSV data
      const response = await fetch(`/api/sheets/url?url=${encodeURIComponent(csvUrl)}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch Google Sheets data')
      }

      // Parse CSV data
      const csvText = result.data
      const lines = csvText.split('\n').filter((line: string) => line.trim())
      
      if (lines.length === 0) {
        throw new Error('No data found in the Google Sheet')
      }

      // Parse CSV manually
      const parseCSVLine = (line: string): string[] => {
        const result = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0])
      const dataRows = lines.slice(1).map((line: string) => parseCSVLine(line))
      
      // Convert to objects
      const formattedData = dataRows
        .filter((row: string[]) => row.some((cell: string) => cell && cell.trim() !== ''))
        .map((row: string[]) => {
          const obj: Record<string, any> = {}
          headers.forEach((header, index) => {
            const key = header || `Column_${index + 1}`
            obj[key] = row[index] || ''
          })
          return obj
        })

      const sheetData: ExcelData = {
        fileName: 'Google Sheet',
        sheetName: 'Sheet1',
        columns: headers.filter(header => header),
        data: formattedData,
        totalRows: formattedData.length
      }
      
      setAllSheets([sheetData])
      setExcelData(sheetData)
      setSelectedSheet(0)
      
      // Reset filters when new data is loaded
      setFilters({
        globalSearch: '',
        columnFilters: {},
        sortColumn: '',
        sortDirection: 'asc'
      })
      
      if (onDataLoaded) {
        onDataLoaded(sheetData)
      }
      
    } catch (err) {
      console.error('Error processing Google Sheet:', err)
      setError(err instanceof Error ? err.message : 'Failed to process the Google Sheet')
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!excelData) return []

    let filtered = excelData.data.filter(row => {
      // Global search
      if (filters.globalSearch) {
        const globalMatch = Object.values(row).some(value => 
          String(value || '').toLowerCase().includes(filters.globalSearch.toLowerCase())
        )
        if (!globalMatch) return false
      }

      // Column-specific filters
      for (const [column, filterValue] of Object.entries(filters.columnFilters)) {
        if (filterValue && row[column]) {
          const cellValue = String(row[column] || '').toLowerCase()
          const searchValue = filterValue.toLowerCase()
          if (!cellValue.includes(searchValue)) {
            return false
          }
        }
      }

      return true
    })

    // Sort data
    if (filters.sortColumn && excelData.columns.includes(filters.sortColumn)) {
      filtered.sort((a, b) => {
        const aVal = String(a[filters.sortColumn] || '')
        const bVal = String(b[filters.sortColumn] || '')
        
        // Try to parse as numbers for numeric sorting
        const aNum = parseFloat(aVal)
        const bNum = parseFloat(bVal)
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return filters.sortDirection === 'asc' ? aNum - bNum : bNum - aNum
        }
        
        // String sorting
        const result = aVal.localeCompare(bVal)
        return filters.sortDirection === 'asc' ? result : -result
      })
    }

    return filtered
  }, [excelData, filters])

  const handleFiles = useCallback(async (files: FileList | null, uploadToCloud: boolean = false) => {
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please upload a valid Excel file (.xlsx, .xls) or CSV file')
      return
    }

    // If uploading to Supabase cloud storage
    if (uploadToCloud) {
      try {
        const uploadedFile = await uploadToSupabase(file)
        // Load the uploaded file immediately
        if (uploadedFile) {
          await loadFileFromSupabase(uploadedFile.id)
        }
      } catch (error) {
        // Error is already handled in uploadToSupabase
      }
      return
    }

    setLoading(true)
    setError("")

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      const sheetsData: ExcelData[] = []
      
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        if (jsonData.length === 0) return
        
        // Get headers from first row
        const headers = jsonData[0] as string[]
        const dataRows = jsonData.slice(1) as any[][]
        
        // Convert to objects with proper column names
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

        const sheetData: ExcelData = {
          fileName: file.name,
          sheetName,
          columns: headers.filter(header => header),
          data: formattedData,
          totalRows: formattedData.length
        }
        
        sheetsData.push(sheetData)
      })

      if (sheetsData.length === 0) {
        throw new Error('No valid data found in the Excel file')
      }

      setAllSheets(sheetsData)
      setExcelData(sheetsData[0])
      setSelectedSheet(0)
      
      // Reset filters when new data is loaded
      setFilters({
        globalSearch: '',
        columnFilters: {},
        sortColumn: '',
        sortDirection: 'asc'
      })
      
      if (onDataLoaded) {
        onDataLoaded(sheetsData[0])
      }
      
    } catch (err) {
      console.error('Error processing file:', err)
      setError(err instanceof Error ? err.message : 'Failed to process the Excel file')
    } finally {
      setLoading(false)
    }
  }, [onDataLoaded])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files, false) // Local processing by default
    }
  }, [handleFiles])

  const handleDropCloud = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files, true) // Upload to cloud
    }
  }, [handleFiles])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files, false) // Local processing by default
  }

  const handleFileInputCloud = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files, true) // Upload to cloud
  }

  const clearData = () => {
    setExcelData(null)
    setAllSheets([])
    setSelectedSheet(0)
    setError("")
    setGoogleSheetUrl('')
    setFilters({
      globalSearch: '',
      columnFilters: {},
      sortColumn: '',
      sortDirection: 'asc'
    })
  }

  const switchSheet = (index: number) => {
    setSelectedSheet(index)
    setExcelData(allSheets[index])
    // Reset filters when switching sheets
    setFilters({
      globalSearch: '',
      columnFilters: {},
      sortColumn: '',
      sortDirection: 'asc'
    })
    if (onDataLoaded) {
      onDataLoaded(allSheets[index])
    }
  }

  const exportToCSV = () => {
    if (!excelData) return
    
    // Export filtered data
    const dataToExport = filteredData.length > 0 ? filteredData : excelData.data
    
    const csv = [
      excelData.columns.join(','),
      ...dataToExport.map(row => 
        excelData.columns.map(col => {
          const value = row[col] || ''
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        }).join(',')
      )
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${excelData.fileName.replace(/\.[^/.]+$/, '')}_${excelData.sheetName}_filtered.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const updateGlobalSearch = (value: string) => {
    setFilters(prev => ({ ...prev, globalSearch: value }))
  }

  const updateColumnFilter = (column: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      columnFilters: { ...prev.columnFilters, [column]: value }
    }))
  }

  const updateSort = (column: string) => {
    setFilters(prev => ({
      ...prev,
      sortColumn: column,
      sortDirection: prev.sortColumn === column && prev.sortDirection === 'asc' ? 'desc' : 'asc'
    }))
  }

  const clearFilters = () => {
    setFilters({
      globalSearch: '',
      columnFilters: {},
      sortColumn: '',
      sortDirection: 'asc'
    })
  }

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.globalSearch) count++
    count += Object.values(filters.columnFilters).filter(v => v).length
    return count
  }, [filters])

  return (
    <div className="space-y-6">
      {/* Upload/Import Selection */}
      {!excelData && (
        <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              Data Import
            </CardTitle>
            <CardDescription>
              Upload an Excel file or import data from a Google Sheets URL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as 'file' | 'url' | 'supabase')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Google Sheets URL
                </TabsTrigger>
                <TabsTrigger value="supabase" className="flex items-center gap-2">
                  <CloudUpload className="h-4 w-4" />
                  Cloud Storage
                </TabsTrigger>
              </TabsList>

              {/* File Upload Tab */}
              <TabsContent value="file" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Local Processing */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Process Locally</h3>
                      <p className="text-sm text-gray-600">Upload and process file in your browser</p>
                    </div>
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                        onChange={handleFileInput}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={loading || uploadingToSupabase}
                      />
                      
                      <div className="space-y-3">
                        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Upload className="h-6 w-6 text-blue-600" />
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {loading ? 'Processing file...' : 'Drop file here'}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            or click to browse
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap justify-center gap-1">
                          <Badge variant="secondary" className="text-xs">.xlsx</Badge>
                          <Badge variant="secondary" className="text-xs">.xls</Badge>
                          <Badge variant="secondary" className="text-xs">.csv</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cloud Upload */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Save to Cloud</h3>
                      <p className="text-sm text-gray-600">Upload to Supabase for persistent storage</p>
                    </div>
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDropCloud}
                    >
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                        onChange={handleFileInputCloud}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={loading || uploadingToSupabase}
                      />
                      
                      <div className="space-y-3">
                        <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <CloudUpload className="h-6 w-6 text-purple-600" />
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {uploadingToSupabase ? 'Uploading...' : 'Drop file here'}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            or click to browse
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap justify-center gap-1">
                          <Badge variant="secondary" className="text-xs">.xlsx</Badge>
                          <Badge variant="secondary" className="text-xs">.xls</Badge>
                          <Badge variant="secondary" className="text-xs">.csv</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Google Sheets URL Tab */}
              <TabsContent value="url" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Link className="h-8 w-8 text-green-600" />
                  </div>
                  
                  <div>
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Import from Google Sheets
                    </p>
                    <p className="text-gray-600 text-sm mb-4">
                      Paste a shareable Google Sheets URL below
                    </p>
                  </div>

                  <div className="max-w-2xl mx-auto space-y-4">
                    <Input
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={googleSheetUrl}
                      onChange={(e) => setGoogleSheetUrl(e.target.value)}
                      className="h-12 text-sm"
                      disabled={loading}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={handleGoogleSheetUrl}
                        disabled={loading || !googleSheetUrl.trim()}
                        className="h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Import & Process
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={async () => {
                          if (!googleSheetUrl.trim()) {
                            setError('Please enter a Google Sheets URL')
                            return
                          }
                          
                          setLoading(true)
                          setError("")

                          try {
                            // Import the data first
                            const csvUrl = convertToCSVUrl(googleSheetUrl)
                            
                            // Fetch CSV data
                            const response = await fetch(`/api/sheets/url?url=${encodeURIComponent(csvUrl)}`)
                            const result = await response.json()

                            if (!response.ok) {
                              throw new Error(result.error || 'Failed to fetch Google Sheets data')
                            }

                            // Parse CSV data (same logic as handleGoogleSheetUrl)
                            const csvText = result.data
                            const lines = csvText.split('\n').filter((line: string) => line.trim())
                            
                            if (lines.length === 0) {
                              throw new Error('No data found in the Google Sheet')
                            }

                            const parseCSVLine = (line: string): string[] => {
                              const result = []
                              let current = ''
                              let inQuotes = false
                              
                              for (let i = 0; i < line.length; i++) {
                                const char = line[i]
                                
                                if (char === '"') {
                                  inQuotes = !inQuotes
                                } else if (char === ',' && !inQuotes) {
                                  result.push(current.trim())
                                  current = ''
                                } else {
                                  current += char
                                }
                              }
                              
                              result.push(current.trim())
                              return result
                            }

                            const headers = parseCSVLine(lines[0])
                            const dataRows = lines.slice(1).map((line: string) => parseCSVLine(line))
                            
                            // Convert to objects
                            const formattedData = dataRows
                              .filter((row: string[]) => row.some((cell: string) => cell && cell.trim() !== ''))
                              .map((row: string[]) => {
                                const obj: Record<string, any> = {}
                                headers.forEach((header, index) => {
                                  const key = header || `Column_${index + 1}`
                                  obj[key] = row[index] || ''
                                })
                                return obj
                              })

                            const sheetData: ExcelData = {
                              fileName: 'Google Sheet',
                              sheetName: 'Sheet1',
                              columns: headers.filter(header => header),
                              data: formattedData,
                              totalRows: formattedData.length
                            }
                            
                            // Save to Supabase
                            await saveDataToSupabase(sheetData)
                            
                          } catch (err) {
                            console.error('Error processing Google Sheet:', err)
                            setError(err instanceof Error ? err.message : 'Failed to process the Google Sheet')
                          } finally {
                            setLoading(false)
                          }
                        }}
                        disabled={loading || uploadingToSupabase || !googleSheetUrl.trim()}
                        variant="outline"
                        className="h-12 border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        {uploadingToSupabase ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Saving to Cloud...
                          </>
                        ) : (
                          <>
                            <CloudUpload className="mr-2 h-4 w-4" />
                            Import & Save to Cloud
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mt-4">
                    <p className="mb-2">Supported URL formats:</p>
                    <div className="space-y-1 text-left max-w-2xl mx-auto">
                      <p>• Shareable link: /spreadsheets/d/[ID]/edit...</p>
                      <p>• Published link: /spreadsheets/d/e/[ID]/pub...</p>
                      <p>• Export link: /spreadsheets/d/[ID]/export?format=csv</p>
                    </div>
                    <p className="mt-2 text-orange-600">
                      Note: The Google Sheet must be publicly accessible or shared with view permissions
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Cloud Storage Tab */}
              <TabsContent value="supabase" className="space-y-6">
                {/* Upload to Cloud Section */}
                <div className="space-y-4">
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDropCloud}
                  >
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                      onChange={handleFileInputCloud}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={loading || uploadingToSupabase}
                    />
                    
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                        <CloudUpload className="h-8 w-8 text-purple-600" />
                      </div>
                      
                      <div>
                        <p className="text-lg font-medium text-gray-900">
                          {uploadingToSupabase ? 'Uploading to cloud...' : 'Upload file to cloud storage'}
                        </p>
                        <p className="text-gray-600 mt-1">
                          Files will be saved to Supabase and accessible anytime
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap justify-center gap-2">
                        <Badge variant="secondary">.xlsx</Badge>
                        <Badge variant="secondary">.xls</Badge>
                        <Badge variant="secondary">.csv</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Uploaded Files List */}
                <div className="border-2 border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Your Uploaded Files</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadUploadedFiles}
                      disabled={loadingFiles}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingFiles ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>

                  {loadingFiles ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-gray-600">Loading files...</span>
                    </div>
                  ) : uploadedFiles.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No files uploaded yet</p>
                      <p className="text-sm">Upload a file above to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-gray-900">{file.originalName}</span>
                              <Badge variant="outline" className="text-xs">
                                {file.fileType}
                              </Badge>
                              {file.sheetCount && file.sheetCount > 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  {file.sheetCount} sheets
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {(file.fileSize / 1024).toFixed(1)} KB • {new Date(file.uploadDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadFileFromSupabase(file.id)}
                              disabled={loading}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Load
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/api/files/${file.id}?action=download`, '_blank')}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteFile(file.id)}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Display */}
      {excelData && (
        <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  {excelData.fileName}
                </CardTitle>
                <CardDescription>
                  {filteredData.length} of {excelData.totalRows} rows • {excelData.columns.length} columns
                  {activeFiltersCount > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
                    </Badge>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                
            
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveDataToSupabase(excelData)}
                  disabled={uploadingToSupabase}
                  className="flex items-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  {uploadingToSupabase ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CloudUpload className="h-4 w-4" />
                  )}
                  Save to Cloud
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearData}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
            
            {/* Sheet Tabs */}
            {allSheets.length > 1 && (
              <div className="flex gap-2 mt-4">
                {allSheets.map((sheet, index) => (
                  <Button
                    key={index}
                    variant={selectedSheet === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => switchSheet(index)}
                  >
                    {sheet.sheetName}
                  </Button>
                ))}
              </div>
            )}

            {/* Filters Section */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Filters & Search</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Clear All
                  </Button>
                </div>
                
                {/* Global Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Global Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search across all columns..."
                      value={filters.globalSearch}
                      onChange={(e) => updateGlobalSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Column Filters */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Column Filters</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {excelData.columns.map((column) => (
                      <div key={column} className="space-y-1">
                        <label className="text-xs text-gray-600">{column}</label>
                        <Input
                          placeholder={`Filter ${column}...`}
                          value={filters.columnFilters[column] || ''}
                          onChange={(e) => updateColumnFilter(column, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sort Controls */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <Select 
                    value={filters.sortColumn} 
                    onValueChange={(value) => updateSort(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column to sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {excelData.columns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column} {filters.sortColumn === column && (filters.sortDirection === 'asc' ? '↑' : '↓')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-[600px] w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {excelData.columns.map((column, index) => (
                      <TableHead 
                        key={index} 
                        className="font-semibold bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => updateSort(column)}
                      >
                        <div className="flex items-center gap-1">
                          {column}
                          {filters.sortColumn === column && (
                            <span className="text-xs">
                              {filters.sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell 
                        colSpan={excelData.columns.length} 
                        className="text-center py-8 text-gray-500"
                      >
                        No data matches your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {excelData.columns.map((column, colIndex) => (
                          <TableCell key={colIndex} className="font-mono text-sm">
                            {row[column] !== undefined && row[column] !== null 
                              ? String(row[column]) 
                              : ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 