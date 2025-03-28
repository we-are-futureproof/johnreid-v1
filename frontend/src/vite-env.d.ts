/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_SUPABASE_FUNCTIONS_URL: string;
    readonly [key: string]: string | undefined;
  };
}
