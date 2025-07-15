import { NextRequest, NextResponse } from 'next/server'
import { supabase, STORAGE_BUCKET } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Supabase connection...')
    
    // Test 1: Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseAnonKey
        }
      }, { status: 500 })
    }

    // Test 2: Check database connection
    try {
      const { data: tables, error: dbError } = await supabase
        .from('uploaded_files')
        .select('count', { count: 'exact', head: true })

      if (dbError) {
        return NextResponse.json({
          success: false,
          error: 'Database connection failed',
          details: dbError
        }, { status: 500 })
      }
    } catch (dbErr) {
      return NextResponse.json({
        success: false,
        error: 'Database test failed',
        details: dbErr
      }, { status: 500 })
    }

    // Test 3: Check storage bucket
    try {
      const { data: buckets, error: storageError } = await supabase.storage.listBuckets()
      
      if (storageError) {
        return NextResponse.json({
          success: false,
          error: 'Storage connection failed',
          details: storageError
        }, { status: 500 })
      }

      const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET)
      
      if (!bucketExists) {
        return NextResponse.json({
          success: false,
          error: `Storage bucket '${STORAGE_BUCKET}' does not exist`,
          details: {
            availableBuckets: buckets?.map(b => b.name) || []
          }
        }, { status: 500 })
      }
    } catch (storageErr) {
      return NextResponse.json({
        success: false,
        error: 'Storage test failed',
        details: storageErr
      }, { status: 500 })
    }

    // Test 4: Check bucket permissions
    try {
      const { data: files, error: listError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list('', { limit: 1 })

      if (listError) {
        return NextResponse.json({
          success: false,
          error: 'Storage bucket permissions error',
          details: listError
        }, { status: 500 })
      }
    } catch (permErr) {
      return NextResponse.json({
        success: false,
        error: 'Storage permissions test failed',
        details: permErr
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'All Supabase tests passed!',
      details: {
        database: 'Connected',
        storage: 'Connected',
        bucket: `'${STORAGE_BUCKET}' exists and accessible`
      }
    })

  } catch (error) {
    console.error('Supabase test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during testing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 