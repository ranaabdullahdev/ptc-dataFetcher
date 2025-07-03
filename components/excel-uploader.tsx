"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { Upload, FileSpreadsheet, X, Download, Search, Filter, RefreshCw, Link, Globe } from 'lucide-react'
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
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file')
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  
  const [filters, setFilters] = useState<FilterState>({
    globalSearch: '',
    columnFilters: {},
    sortColumn: '',
    sortDirection: 'asc'
  })

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

  const handleFiles = useCallback(async (files: FileList | null) => {
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
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
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
            <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as 'file' | 'url')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Google Sheets URL
                </TabsTrigger>
              </TabsList>

              {/* File Upload Tab */}
              <TabsContent value="file" className="space-y-4">
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                    disabled={loading}
                  />
                  
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <Upload className="h-8 w-8 text-blue-600" />
                    </div>
                    
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {loading ? 'Processing file...' : 'Drop your Excel file here'}
                      </p>
                      <p className="text-gray-600 mt-1">
                        or click to browse and select a file
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-2">
                      <Badge variant="secondary">.xlsx</Badge>
                      <Badge variant="secondary">.xls</Badge>
                      <Badge variant="secondary">.csv</Badge>
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
                    
                    <Button
                      onClick={handleGoogleSheetUrl}
                      disabled={loading || !googleSheetUrl.trim()}
                      className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Import Data
                        </>
                      )}
                    </Button>
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
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
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