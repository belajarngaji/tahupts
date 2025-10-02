// Integrasi Supabase Client
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ⚠️ Ganti dengan project Supabase kamu
const SUPABASE_URL = "https://vrpdotzqyesnhewynxta.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZycGRvdHpxeWVzbmhld3lueHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMTMyMzQsImV4cCI6MjA3MTg4OTIzNH0.2FGkxnEbD_L2VOu6mxnTcDK7l3Ncekwe425riYImpWI"

// Export Supabase Client untuk dipakai di file lain
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
