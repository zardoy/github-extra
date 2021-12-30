//@ts-check
import { build } from 'esbuild'
import fs from 'fs'
import { modifyJsonFile } from 'modify-json-file'
import { readPackageJsonFile } from 'typed-jsonfile'
import { zip as zipFolder } from 'zip-a-folder'

const production = process.argv[2] === 'prod'

await fs.promises.rm('./build', {
    force: true,
    recursive: true,
})
await fs.promises.mkdir('./build')
await fs.promises.copyFile('./src/manifest.json', './build/manifest.json')

if (production) {
    await modifyJsonFile('./build/manifest.json', {
        ...(production
            ? {
                  background: undefined,
              }
            : {}),
        version: (await readPackageJsonFile({ dir: '.' })).version,
    })
}

await build({
    bundle: true,
    entryPoints: ['src/injectGithub.tsx', ...(production ? [] : ['src/background.ts'])],
    outdir: 'build',
    // minify: production,
    define: {
        __DEV__: `${!production}`,
    },
    platform: 'browser',
    watch: !production,
})

if (production) {
    await zipFolder('build', 'out.zip')
}
