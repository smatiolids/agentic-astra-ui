/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASTRA_DB_APPLICATION_TOKEN?: string;
  readonly VITE_ASTRA_DB_API_ENDPOINT?: string;
  readonly VITE_ASTRA_DB_DB_NAME?: string;
  readonly VITE_ASTRA_DB_CATALOG_COLLECTION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

