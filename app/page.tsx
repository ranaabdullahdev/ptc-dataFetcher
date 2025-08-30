"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
 Card,
 CardContent,
 CardDescription,
 CardHeader,
 CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Cloud, Search as SearchIcon, FileSpreadsheet, ShieldCheck, Columns3, UploadCloud, Menu } from "lucide-react"
import ExcelUploader from "@/components/excel-uploader"
import { X } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function LandingPage() {
  const [searchId, setSearchId] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any | null>(null)
  const [multiTabData, setMultiTabData] = useState<any[] | null>(null)
  const [error, setError] = useState("")
  const [fileId, setFileId] = useState<string | null>(null)
  const [showUploader, setShowUploader] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Fetch the latest uploaded file's ID from Supabase
  useEffect(() => {
    async function fetchLatestFile() {
      try {
        const res = await fetch("/api/files/list?limit=1")
        const result = await res.json()
        if (result.success && result.files && result.files.length > 0) {
          setFileId(result.files[0].id)
        } else {
          setFileId(null)
        }
      } catch (err) {
        setFileId(null)
      }
    }
    fetchLatestFile()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setData(null)
    setMultiTabData(null)
    if (!searchId.trim()) return
    setLoading(true)
    try {
      // Always fetch the latest file before searching
      const res = await fetch("/api/files/list?limit=1")
      const result = await res.json()
      if (!result.success || !result.files || result.files.length === 0) {
        setError("No uploaded file found. Please upload a file first.")
        setLoading(false)
        return
      }
      const latestFileId = result.files[0].id
      setFileId(latestFileId)
      const response = await fetch(`/api/files/${latestFileId}?Id=${encodeURIComponent(searchId)}`)
      const searchResult = await response.json()
      if (!response.ok || !searchResult.success) {
        throw new Error(searchResult.error || "No data found for this ID.")
      }
      
      // Handle table format data (new format for brand-based display)
      if (searchResult.tableFormat) {
        setData(searchResult.data)
        setMultiTabData(null)
      }
      // Handle combined data from multiple tabs (unified format)
      else if (searchResult.combinedData) {
        setData(searchResult.data)
        setMultiTabData(null)
      }
      // Handle multi-tab results (legacy format)
      else if ((searchResult.multipleTabs || searchResult.multipleSheets) && (searchResult.tabs || searchResult.sheets)) {
        setMultiTabData(searchResult.tabs || searchResult.sheets)
        setData(null)
      } else {
        setData(searchResult.data)
        setMultiTabData(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const isLoggedIn = typeof window !== "undefined" && 
                      typeof window.localStorage !== "undefined" && 
                      window.localStorage.getItem("isLoggedIn") === "true"
  
  return (
    <div className="min-h-screen flex px-5 flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Data Fetcher</h1>
            </div>
            
            {isLoggedIn && (
              <>
                {/* Mobile menu button */}
                <div className="sm:hidden">
                  <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    <Menu className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Desktop buttons */}
                <div className="hidden sm:flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      localStorage.clear()
                      window.location.reload()
                    }}
                    className="flex items-center gap-2"
                  >
                    Logout
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploader(true)}
                    className="flex items-center gap-2"
                  >
                    Upload File
                  </Button>
                </div>
              </>
            )}
          </div>
          
          {/* Mobile menu */}
          {mobileMenuOpen && isLoggedIn && (
            <div className="sm:hidden pt-3 pb-2 border-t mt-3 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowUploader(true)
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <UploadCloud className="h-4 w-4" />
                Upload File
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  localStorage.clear()
                  window.location.reload()
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </header>
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 flex-1 w-full">
        {showUploader ? (
          <div className="mb-8">
            <div className="flex justify-end mb-2">
              <Button variant="ghost" size="icon" onClick={() => setShowUploader(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <ExcelUploader
              onDataLoaded={(data) => {
                console.log("Excel data loaded:", data)
              }}
            />
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="line-clamp-1">Secure, Fast, and Flexible Data Search</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                Search Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Supabase Files</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-3 sm:mb-4 max-w-xl mx-auto px-1">
                Instantly find and view all columns for any ID in your uploaded Excel or CSV files.
              </p>
            </div>
            {/* Mobile-Optimized Search Card */}
            <Card className="mb-6 shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader className="text-center px-4 py-4">
                <CardTitle className="text-lg flex items-center justify-center gap-2">
                  <SearchIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  Search by ID
                </CardTitle>
                <CardDescription className="text-sm">Enter the ID you want to search for</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Enter ID (e.g., lhr_ksr_dr01)"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="h-12 text-base pl-4 pr-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 touch-manipulation"
                        disabled={loading}
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                      {searchId && (
                        <button
                          type="button"
                          onClick={() => setSearchId('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-manipulation"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={loading || !searchId.trim()}
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-base font-semibold rounded-xl shadow-lg touch-manipulation"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Searching...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <SearchIcon className="h-5 w-5" />
                          Search Data
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            {/* Error Display */}
            {error && (
              <Alert className="mb-6 sm:mb-8 border-red-200 bg-red-50">
                <AlertDescription className="text-red-800 text-sm sm:text-base">{error}</AlertDescription>
              </Alert>
            )}
            {/* Results Display */}
            {(data || multiTabData) && (
              <div className="space-y-6">
                {/* Table Format Results (Parallel sheet data display) */}
                {data && !Array.isArray(data) && typeof data === 'object' && Object.keys(data).length > 0 && (
                  <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="px-3 py-4 bg-gradient-to-r from-blue-50 to-purple-50">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <span className="truncate">Data for ID: {searchId}</span>
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {Object.keys(data).length} sheet{Object.keys(data).length !== 1 ? 's' : ''} • Compact view for mobile
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {(() => {
                        // Collect all unique brand/column names while preserving original order
                        const allBrands: string[] = [];
                        const sheetNames = Object.keys(data);
                        
                        // Get brands from first sheet to establish order, then add any missing from other sheets
                        sheetNames.forEach(sheetName => {
                          const sheetData = data[sheetName];
                          if (sheetData.brandData) {
                            Object.keys(sheetData.brandData).forEach(brand => {
                              if (!allBrands.includes(brand)) {
                                allBrands.push(brand);
                              }
                            });
                          }
                        });
                        
                        const brandList = allBrands;
                        
                        if (brandList.length === 0) {
                          return (
                            <div className="text-center py-12 px-4 text-gray-500">
                              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                              <p className="text-lg font-medium">No data found</p>
                              <p className="text-sm">No data found for this ID across all sheets</p>
                            </div>
                          );
                        }
                        
                                                return (
                          <div className="w-full">
                            <Table className="w-full">
                              <TableHeader>
                                <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50">
                                  <TableHead className="font-bold text-blue-800 sticky left-0 bg-blue-50 z-10 w-[30%] px-1 py-2 text-xs border-r border-blue-200">
                                    Brand
                                  </TableHead>
                                  {sheetNames.map((sheetName, index) => (
                                    <TableHead key={sheetName} className={`font-bold text-center w-[${70/sheetNames.length}%] px-1 py-2 text-xs ${
                                      index === 0 ? 'text-green-800' : 
                                      index === 1 ? 'text-purple-800' : 
                                      index === 2 ? 'text-orange-800' :
                                      'text-blue-800'
                                    }`}>
                                      <div className="flex flex-col items-center">
                                        <span className="font-bold truncate">{sheetName}</span>
                                        {/* {sheetName.toLowerCase() === 'left' && (
                                          <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">
                                            Left
                                          </span>
                                        )} */}
                                      </div>
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {brandList.map((brandName) => (
                                  <TableRow key={brandName} className="hover:bg-gray-50 border-b border-gray-100">
                                    <TableCell className="font-semibold text-gray-900 bg-blue-50 sticky left-0 z-10 border-r border-blue-200 px-1 py-2 text-xs">
                                      <div className="min-w-0">
                                        <p className="font-bold text-gray-800 truncate text-xs leading-tight" title={brandName}>
                                          {brandName.length > 15 ? `${brandName.substring(0, 15)}...` : brandName}
                                        </p>
                                      </div>
                                    </TableCell>
                                    {sheetNames.map((sheetName, index) => {
                                      const sheetData = data[sheetName];
                                      const value = sheetData.brandData?.[brandName];
                                      const numValue = Number(value);
                                      const isNumeric = !isNaN(numValue) && value !== '' && value !== null && value !== undefined;
                                      const isPositive = isNumeric && numValue > 0;
                                      const isNegative = isNumeric && numValue < 0;
                                      const isZero = isNumeric && numValue === 0;
                                      const hasValue = value !== undefined && value !== null && value !== '';
                                      
                                      // Check if this is the "Left" sheet
                                      const isLeftSheet = sheetName.toLowerCase() === 'left';
                                      
                                      // Apply special styling for any values from the "Left" sheet
                                      const shouldApplyLeftBanner = isLeftSheet;
                                      
                                      return (
                                        <TableCell key={`${sheetName}-${brandName}`} className={`text-center px-1 py-2 ${
                                          hasValue && isNumeric && shouldApplyLeftBanner
                                            ? isZero
                                              ? 'bg-gray-50'
                                              : isPositive
                                                ? 'bg-red-50 border-l-2 border-red-500'     // Red banner for positive left
                                                : 'bg-green-50 border-l-2 border-green-500' // Green banner for negative left
                                            : ''
                                        }`}>
                                          {hasValue ? (
                                            <div className="flex flex-col items-center">
                                              <span className={`inline-block px-1 py-1 rounded text-xs font-bold ${
                                                isNumeric 
                                                  ? isZero 
                                                    ? 'bg-gray-200 text-gray-800' 
                                                    : shouldApplyLeftBanner
                                                      ? isPositive
                                                        ? 'bg-red-500 text-white'     // Strong red banner
                                                        : 'bg-green-500 text-white' // Strong green banner
                                                      : isPositive 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                  : index === 0 ? 'bg-green-100 text-green-800' :
                                                    index === 1 ? 'bg-purple-100 text-purple-800' :
                                                    index === 2 ? 'bg-orange-100 text-orange-800' :
                                                    'bg-blue-100 text-blue-800'
                                              }`}>
                                                {String(value).length > 8 ? `${String(value).substring(0, 8)}...` : String(value)}
                                              </span>
                                              {shouldApplyLeftBanner && hasValue && (
                                                <span className={`text-xs px-1 rounded mt-1 ${
                                                  isPositive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                  {isPositive ? 'Need' : 'Done'}
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-gray-400 text-xs">—</span>
                                          )}
                                        </TableCell>
                                      );
                                    })}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })()}
                      
                    
                    </CardContent>
                  </Card>
                )}

              
              </div>
            )}
          
          </>
        )}
   </main>
   {/* Footer */}
   <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
    <div className="container mx-auto px-4 py-8">
     <div className="text-center text-gray-600">
      <p>
       &copy; {new Date().getFullYear()} Data Fetcher. Secure, fast, and
       flexible data search.
      </p>
     </div>
    </div>
   </footer>
  </div>
 );
}
