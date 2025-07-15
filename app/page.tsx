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
import { Cloud, Search as SearchIcon, FileSpreadsheet, ShieldCheck, Columns3, UploadCloud } from "lucide-react"
import ExcelUploader from "@/components/excel-uploader"
import { X } from "lucide-react"

export default function LandingPage() {
  const [searchId, setSearchId] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState("")
  const [fileId, setFileId] = useState<string | null>(null)
  const [showUploader, setShowUploader] = useState(false)

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

  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Data Fetcher</h1>
            </div>
            <div className="flex items-center gap-2">
             
              {/* Logout button if isLoggedIn is true in localStorage */}
              {typeof window !== "undefined" && typeof window.localStorage !== "undefined" && window.localStorage.getItem("isLoggedIn") === "true" && (
               
               <>
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
                  </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl flex-1 w-full">
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
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <FileSpreadsheet className="h-4 w-4" />
                Secure, Fast, and Flexible Data Search
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                Search Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Supabase Files</span>
              </h2>
              <p className="text-lg text-gray-600 mb-4 max-w-xl mx-auto">
                Instantly find and view all columns for any ID in your uploaded Excel or CSV files. Powered by secure cloud storage and a modern UI.
              </p>
            </div>
            {/* Search Card */}
            <Card className="mb-8 shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <SearchIcon className="h-6 w-6 text-blue-600" />
                  Search by ID (Supabase File)
                </CardTitle>
                <CardDescription>Enter the ID you want to search in the latest uploaded file</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Enter ID (e.g., USER001)"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="h-12 text-lg"
                        disabled={loading}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading || !searchId.trim()}
                      className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {loading ? "Searching..." : "Search"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            {/* Error Display */}
            {error && (
              <Alert className="mb-8 border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            {/* Results Display */}
            {data && (
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl">Search Results</CardTitle>
                  <CardDescription>Data retrieved from Supabase file for ID: {searchId}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {Object.entries(data).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-700 capitalize mb-1 sm:mb-0">
                          {key.replace(/([A-Z])/g, " $1").trim()}:
                        </span>
                        <span className="text-gray-900 font-mono bg-white px-3 py-1 rounded border">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Features Section */}
            <div className="mt-16 grid md:grid-cols-2 gap-8">
              <div className="flex flex-col items-center text-center p-6 bg-white/60 rounded-lg shadow">
                <ShieldCheck className="h-10 w-10 text-blue-600 mb-2" />
                <h3 className="text-lg font-semibold mb-1">Secure Cloud Storage</h3>
                <p className="text-gray-600">Your files are safely stored and processed in Supabase cloud storage.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 bg-white/60 rounded-lg shadow">
                <SearchIcon className="h-10 w-10 text-purple-600 mb-2" />
                <h3 className="text-lg font-semibold mb-1">Fast ID Search</h3>
                <p className="text-gray-600">Find any row by ID instantly, even in large Excel or CSV files.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 bg-white/60 rounded-lg shadow">
                <Columns3 className="h-10 w-10 text-green-600 mb-2" />
                <h3 className="text-lg font-semibold mb-1">All Columns Displayed</h3>
                <p className="text-gray-600">See every column for your ID, with a clean and readable layout.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6 bg-white/60 rounded-lg shadow">
                <UploadCloud className="h-10 w-10 text-orange-600 mb-2" />
                <h3 className="text-lg font-semibold mb-1">Easy Excel/CSV Upload</h3>
                <p className="text-gray-600">Upload your Excel or CSV files and start searching in seconds.</p>
              </div>
            </div>
          </>
        )}
      </main>
      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; {new Date().getFullYear()} Data Fetcher. Secure, fast, and flexible data search.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
