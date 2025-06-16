"use client"

import type React from "react"

import { useState } from "react"
import { Search, Loader2, QrCode, Database, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import QRCodeGenerator from "@/components/qr-code-generator"

interface SheetData {
  id: string
  [key: string]: any
}

export default function LandingPage() {
  const [searchId, setSearchId] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SheetData | null>(null)
  const [error, setError] = useState("")
  const [showQR, setShowQR] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchId.trim()) return

    setLoading(true)
    setError("")
    setData(null)

    try {
      const response = await fetch(`/api/sheets?id=${encodeURIComponent(searchId)}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch data")
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }
console.log(data,'DATA::::')
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center  gap-2">
              <Database className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Data Fetcher</h1>
            </div>
            {/* <Button variant="outline" size="sm" onClick={() => setShowQR(!showQR)} className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </Button> */}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Smartphone className="h-4 w-4" />
            Real-time Google Sheets Data
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Top Trader 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {" "}
              Program Update
            </span>
          </h2>
          {/* <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Enter an ID to instantly fetch the latest information from our Google Sheets database. Data is updated
            multiple times daily for accuracy.
          </p> */}
        </div>

        {/* QR Code Section */}
        {showQR && (
          <div className="mb-8">
            <QRCodeGenerator />
          </div>
        )}

        {/* Search Section */}
        <Card className="mb-8 shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Search RCS8ID</CardTitle>
            <CardDescription>Enter the ID you want to search </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Enter ID (e.g., USER001, PROD123)"
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
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Search Results</CardTitle>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Found
                </Badge>
              </div>
              <CardDescription>Data retrieved from Google Sheets for ID: {data.id}</CardDescription>
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
                    <span className={`text-gray-900 font-mono bg-white px-3  py-1 rounded border ${
                      key === 'Achieved' ? 'text-green-600' : 
                      key === 'Left' ? 'text-red-600' : ''
                    }`}>{String(value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Section */}
        {/* <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Real-time Data</h3>
            <p className="text-gray-600">Data is synced multiple times daily from Google Sheets</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">QR Code Access</h3>
            <p className="text-gray-600">Generate QR codes for easy mobile access</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Mobile Optimized</h3>
            <p className="text-gray-600">Fully responsive design for all devices</p>
          </div>
        </div> */}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>&copy; 2025. Powered by Data Fetcher Company.</p>
        </div>
      </footer>
    </div>
  )
}
