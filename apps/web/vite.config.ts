import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Builds straight into docs/ so the existing free GitHub Pages hosting
// (connexsa.co.za, see docs/CNAME) serves this app with no extra infra.
//
// IMPORTANT: emptyOutDir is deliberately false. docs/ also holds
// docs/business/, docs/technical/, and docs/archive/ — real business and
// technical documents unrelated to the website. emptyOutDir:true wipes the
// ENTIRE output directory before every build, which deletes those alongside
// the old marketing HTML. Vite already overwrites index.html/assets/ on
// every build without it; remove superseded static files by hand instead
// (see docs/archive/README.md-adjacent note, or just `git rm` them once).
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../../docs',
    emptyOutDir: false,
  },
})
