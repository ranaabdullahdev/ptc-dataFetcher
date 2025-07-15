import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Storage bucket name for uploaded files
export const STORAGE_BUCKET = 'uploaded-files'

// Helper function to get public URL for a file
export const getPublicUrl = (filePath: string) => {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath)
  
  return data.publicUrl
}

// Helper function to upload file to storage
export const uploadFile = async (file: File, filePath: string) => {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw error
  }

  return data
}

// Helper function to list files in storage
export const listFiles = async (path?: string) => {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(path || '', {
      limit: 100,
      offset: 0,
    })

  if (error) {
    throw error
  }

  return data
}

// Helper function to delete file from storage
export const deleteFile = async (filePath: string) => {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filePath])

  if (error) {
    throw error
  }

  return true
}

// Helper function to download file from storage
export const downloadFile = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(filePath)

  if (error) {
    throw error
  }

  return data
} 