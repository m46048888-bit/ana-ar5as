// supabase-config.js
// هالمفتاح "anon public" آمن يظهر بكود المتصفح — مصمم لهيك.
// لا تحط هون أبداً المفتاح السري (service_role).
const SUPABASE_URL = "https://ipqtcgjympzoaxtrtqhl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwcXRjZ2p5bXB6b2F4dHJ0cWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MTkzNDAsImV4cCI6MjEwMzM5NTM0MH0.DQLCqb720ypvzKBIzWKyPoIKySxYoha-UUkjxbNRnI8";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
