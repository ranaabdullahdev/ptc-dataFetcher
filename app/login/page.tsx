"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

interface LoginFormInputs {
  email: string
  password: string
}

export default function LoginPage() {
  const form = useForm<LoginFormInputs>({
    defaultValues: { email: "huzaifa.altaf@gmail.com", password: "12345678" },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const onSubmit = async (values: LoginFormInputs) => {
    setLoading(true)
    setError("")
    const { email, password } = values

    // Simple frontend-only check (replace with your own logic as needed)
    // For demo: hardcoded credentials
    const validEmail = "huzaifa.altaf@gmail.com"
    const validPassword = "12345678"

    await new Promise((resolve) => setTimeout(resolve, 800)) // Simulate network delay

    if (email === validEmail && password === validPassword) {
      toast({
        title: "Login successful",
        description: `Welcome, ${email}!`,
      })
      // Store login flag in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("isLoggedIn", "true")
      }
      // Optionally redirect or reload
      window.location.href = "/"
    } else {
      setError("Invalid email or password")
      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Card className="w-full max-w-md shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-col items-center">
          <Image src="/placeholder-logo.svg" alt="Logo" width={120} height={40} className="mb-2" />
          <CardTitle className="text-2xl">Sign in to your account</CardTitle>
          <CardDescription>Enter your email and password below</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                rules={{ required: "Email is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                rules={{ required: "Password is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
