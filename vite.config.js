import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        chunkSizeWarningLimit: 1600,
    },
    server: {
        port: 3000,
        proxy: {
            '/send_mail.php': {
                target: 'http://localhost:80', // For local testing if you have a PHP server
                changeOrigin: true,
            }
        }
    }
});
