import * as esbuild from 'esbuild';

const common = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    globalName: 'niimbluelib',
    platform: 'node'
};

await esbuild.build({
    ...common,
    outfile: `./dist/umd/${common.globalName}.js`,
    format: 'iife',
    minify: false,
    sourcemap: true,
    target: ['es6'],
});

await esbuild.build({
    ...common,
    outfile: `./dist/umd/${common.globalName}.min.js`,
    format: 'iife',
    minify: true,
    sourcemap: true,
    target: ['es6'],
});
