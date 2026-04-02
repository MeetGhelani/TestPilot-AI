import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from 'path'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  resolve: {
    alias: {
      '@supabase/supabase-js': path.resolve(process.cwd(), 'node_modules/@supabase/supabase-js')
    }
  }
})
