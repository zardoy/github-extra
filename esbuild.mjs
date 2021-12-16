import { build } from 'esbuild'

const production = process.argv[2] === 'prod'

await build({
    bundle: true,
    entryPoints: ['src/injectGithub.tsx', 'src/background.ts'],
    outdir: 'build',
    // minify: production,
    define: {
        __DEV__: `${!production}`,
    },
    platform: 'browser',
    watch: !production,
})
