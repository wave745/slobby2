// This file handles the initialization of the Supabase client.
// It allows the app to function with or without Supabase credentials.

const SUPABASE_URL = 'https://rbnffiymomcpvkoywoiy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibmZmaXltb21jcHZrb3l3b2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyOTQwNTIsImV4cCI6MjA2NTg3MDA1Mn0.k-gJiD29ubxrbj46lD8FXBhJ96lPR1urOOn3dg9505s';

const APP_NAME = window.APP_NAME || 'Slobby';

// Function to dynamically load the Supabase library and create a client.
async function loadSupabase() {
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Define a custom fetch wrapper that adds a custom header using APP_NAME.
  const customFetch = async (input, init = {}) => {
    init.headers = {
      ...init.headers,
      'x-custom-user-agent': APP_NAME
    };
    return fetch(input, init);
  };

  // Create and return the Supabase client with the custom fetch wrapper.
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      fetch: customFetch,
    },
  });
}

// Initialize Supabase only if the URL and Key are provided.
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) ? await loadSupabase() : null;

if (supabase) {
  console.log("Supabase client initialized successfully.");
} else {
  console.warn("Supabase credentials not found. Running in offline mode.");
}

export { supabase };