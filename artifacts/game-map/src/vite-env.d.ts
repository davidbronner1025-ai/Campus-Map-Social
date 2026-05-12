/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** Optional absolute or root-relative URL to the campus GLB (e.g. CDN on Replit when the file is not in `public/`). */
  readonly VITE_CAMPUS_GLB_URL?: string;
}
