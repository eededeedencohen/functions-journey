import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ttsPlugin } from './tts-server.js';

// base: './' so the built site also works when opened from any sub-folder / static host
export default defineConfig({
  base: './',
  plugins: [react(), ttsPlugin()],
  // own ports, so the tablet address stays the same even when other projects are running
  // never hand out key files (config.env) to browsers on the network
  server: {
    host: true,
    port: 5180,
    fs: { deny: ['.env', '.env.*', '*.env', '*.{crt,pem}', '**/.git/**'] },
    watch: { ignored: ['**/data/**', '**/public/tts/**', '**/voice-samples/**'] },
  },
  preview: { host: true, port: 5181 },
});
