import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/** Vite configuration for the SvelteKit + Tauri desktop application. */
export default defineConfig({
	plugins: [sveltekit()],
	// Vite options for Tauri
	clearScreen: false,
	server: {
		port: 5173,
		strictPort: true,
		watch: {
			ignored: ['**/src-tauri/**']
		},
		fs: {
			// Allow serving files from workspace packages (symlinked via node_modules)
			allow: ['..']
		}
	},
	envPrefix: ['VITE_', 'TAURI_'],
	build: {
		target: ['es2022', 'chrome110', 'safari15'],
		minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
		sourcemap: !!process.env.TAURI_DEBUG
	}
});
