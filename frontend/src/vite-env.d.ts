/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GOVERNOR_ADDRESS: string;
  readonly VITE_TOKEN_ADDRESS: string;
  readonly VITE_TIMELOCK_ADDRESS: string;
  readonly VITE_TREASURY_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
