const SUPABASE_URL = "https://jqdyaafwixnjasszsvkt.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_KHbLlwbhlkyaiz-7KXW6Mw_nAnTVsLa";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

window.amigateSupabase = supabaseClient;
