import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// Custom plugin to bridge between browser and filesystem
const sourceSyncPlugin = () => ({
  name: 'source-sync',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/api/save-constants' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', () => {
          try {
            const { content } = JSON.parse(body);
            const filePath = path.resolve(__dirname, 'src/constants.ts');
            fs.writeFileSync(filePath, content, 'utf8');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  base: '/MyNav/',
  plugins: [tailwindcss(), react(), sourceSyncPlugin()],
  server: {
    port: 5173,
  },
  // Pre-bundle heavy deps so the first dev visit doesn't stall on compilation.
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'lucide-react', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
  },
})
