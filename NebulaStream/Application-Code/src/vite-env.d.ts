/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_API_ENDPOINT_URL?: string;
  readonly VITE_APP_TMDB_V3_API_KEY?: string;
  readonly VITE_APP_MOBILE_LLM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
