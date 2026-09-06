import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
    // Load env from monorepo root and local apps/website directory
    const rootEnv = loadEnv(mode, path.resolve(__dirname, '../../'), '');
    const localEnv = loadEnv(mode, __dirname, '');
    const env = { ...rootEnv, ...localEnv };

    const rawApiUrl = env.VITE_API_URL || env.NEXT_PUBLIC_RALION_API_URL;
    const resolvedApiUrl =
        rawApiUrl && !rawApiUrl.includes('onrender.com') && !rawApiUrl.includes('alinew.onrender.com')
            ? rawApiUrl
            : 'https://rasalilabs.com/ralion';

    const resolvedSupabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
    const resolvedSupabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g';

    return {
        plugins: [react()],
        base: '/',
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        define: {
            'import.meta.env.VITE_API_URL': JSON.stringify(resolvedApiUrl),
            'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(resolvedSupabaseUrl),
            'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(resolvedSupabaseAnonKey),
        },
        build: {
            outDir: 'dist',
            sourcemap: false,
            chunkSizeWarningLimit: 1600,
        }
    };
});

