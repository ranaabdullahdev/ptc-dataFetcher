"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Copy, Check } from "lucide-react"

export default function QRCodeGenerator() {
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [currentUrl, setCurrentUrl] = useState("")

  useEffect(() => {
    // Get current URL
    const url = window.location.href
    setCurrentUrl(url)

    // Generate QR code using QR Server API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
    setQrCodeUrl(qrUrl)
  }, [])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const downloadQR = () => {
    const link = document.createElement("a")
    link.href = qrCodeUrl
    link.download = "qr-code.png"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="max-w-md mx-auto shadow-lg border-0 bg-white/70 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle>QR Code</CardTitle>
        <CardDescription>Scan this QR code to access the search page on mobile</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          {qrCodeUrl && (
            <img
              src={qrCodeUrl || "/placeholder.svg"}
              alt="QR Code"
              className="border rounded-lg shadow-sm"
              width={200}
              height={200}
            />
          )}
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600 break-all bg-gray-50 p-2 rounded">{currentUrl}</p>

          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex items-center gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy URL
                </>
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={downloadQR} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download QR
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
