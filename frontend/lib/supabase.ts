"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Whether the Supabase env vars are present (used to show a setup hint). */
export const supabaseConfigured = Boolean(url && anon);

/**
 * Browser Supabase client. Owns the auth session (stored in localStorage),
 * auto-refreshes tokens, and completes the OAuth PKCE redirect on return.
 */
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
