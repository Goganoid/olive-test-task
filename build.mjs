import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'esnext',
  outdir: 'dist',
  banner: {
    // compatibility with cjs packages
    js: `import { createRequire } from 'module';
    import path from 'node:path';
    import { fileURLToPath } from 'node:url';
    const require = createRequire(import.meta.url);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);`,
  },
  outExtension: {
    '.js': '.mjs',
  },
});
