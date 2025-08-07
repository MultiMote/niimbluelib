import * as esbuild from 'esbuild';

const common = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    globalName: 'niimblue',
};

await esbuild.build({
    ...common,
    outfile: './dist/umd/niimblue.js',
    format: 'iife',
    minify: false,
    sourcemap: true,
    platform: 'browser',
    target: ['es6'],
});

await esbuild.build({
    ...common,
    outfile: './dist/umd/niimblue.min.js',
    format: 'iife',
    minify: true,
    sourcemap: true,
    platform: 'browser',
    target: ['es6'],
});
