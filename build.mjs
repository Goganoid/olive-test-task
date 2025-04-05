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
    js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);`,
  },
  outExtension: {
    '.js': '.mjs',
  },
});
