import { defineConfig, minimalPreset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
	preset: minimalPreset,
	images: ['src/lib/assets/favicon.svg'],
	outDir: 'static'
});
