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

export default function LandingPage() {
  const [searchId, setSearchId] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any | null>(null)
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
      setData(searchResult.data)
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
            {/* Search Card */}
            <Card className="mb-6 sm:mb-8 shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader className="text-center px-4 sm:px-6 py-4 sm:py-6">
                <CardTitle className="text-xl sm:text-2xl flex items-center justify-center gap-2">
                  <SearchIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  Search by ID
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">Enter the ID you want to search</CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Enter ID (e.g., USER001)"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="h-10 sm:h-12 text-base sm:text-lg"
                        disabled={loading}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading || !searchId.trim()}
                      className="h-10 sm:h-12 px-4 sm:px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm sm:text-base"
                    >
                      {loading ? "Searching..." : "Search"}
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
            {data && (
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm overflow-hidden">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                  <CardTitle className="text-lg sm:text-xl">Search Results</CardTitle>
                  <CardDescription className="text-sm sm:text-base">Data retrieved for ID: {searchId}</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
                  <div className="grid gap-3 sm:gap-4 max-w-full overflow-x-auto">
                    {Object.entries(data).map(([key, value]) => {
                      console.log(key,'KEY')
                      const isRemainingTarget = key === "Remaining Target(Cans)";
                      const isZeroOrLess = isRemainingTarget && Number(value) <= 0;
                      const isTargetAchievement = key === "Target Acheivement";
                      const isTargetN = isTargetAchievement && value === "N";
                      const isTargetY = isTargetAchievement && value === "Y";
                      let bgClass = "bg-gray-50";
                      let valueClass = "bg-white text-gray-900";
                      let labelClass = "text-gray-700";
                      if (isRemainingTarget) {
                        if (isZeroOrLess) {
                          bgClass = "bg-green-500";
                          valueClass = "bg-green-600 text-white border-green-700";
                          labelClass = "text-white";
                        } else {
                          bgClass = "bg-red-500";
                          valueClass = "bg-red-600 text-white border-red-700";
                          labelClass = "text-white";
                        }
                      } else if (isTargetAchievement) {
                        if (isTargetN) {
                          bgClass = "bg-red-500";
                          valueClass = "bg-red-600 text-white border-red-700";
                          labelClass = "text-white";
                        } else if (isTargetY) {
                          bgClass = "bg-green-500";
                          valueClass = "bg-green-600 text-white border-green-700";
                          labelClass = "text-white";
                        }
                      }
                      return (
                        <div
                          key={key}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 ${bgClass} rounded-lg`}
                        >
                          <span className={`font-medium capitalize mb-1.5 sm:mb-0 text-sm sm:text-base ${labelClass}`}>
                            {key.replace(/([A-Z])/g, " $1").trim()}:
                          </span>
                          <span className={`font-mono text-sm px-2 sm:px-3 py-1 rounded border break-all sm:break-normal ${valueClass}`}>
                            {String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
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
