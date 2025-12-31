import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// Vite options for Tauri
	clearScreen: false,
	server: {
		port: 5173,
		strictPort: true,
		watch: {
			ignored: ['**/src-tauri/**']
		}
	},
	envPrefix: ['VITE_', 'TAURI_'],
	build: {
		target: ['es2022', 'chrome110', 'safari15'],
		minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
		sourcemap: !!process.env.TAURI_DEBUG
	}
});
