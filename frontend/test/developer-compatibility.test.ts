import { it, expect } from 'vitest';
import { build, type Rollup } from 'vite';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { FileTreeProps, CodeBlockProps } from '@hollis-labs/kit-code';
import type { CanvasProps } from '@hollis-labs/kit-workflow/canvas';
type Assert<T extends true> = T;
type IsAny<T> = 0 extends (1 & T) ? true : false;
type FileTyped = Assert<IsAny<FileTreeProps> extends false ? true : false>;
type CodeTyped = Assert<IsAny<CodeBlockProps> extends false ? true : false>;
type CanvasTyped = Assert<IsAny<CanvasProps> extends false ? true : false>;
it('actual candidate core entries keep optional highlight/ANSI/canvas runtimes out of their graph', async () => {
    const scratch = fileURLToPath(new URL('../../.scratch/developer-core/', import.meta.url));
    await mkdir(scratch, { recursive: true });
    const entries = { code: '@hollis-labs/kit-code', workflow: '@hollis-labs/kit-workflow' };
    for (const [name, entry] of Object.entries(entries)) {
        const path = `${scratch}${name}.ts`;
        await writeFile(path, `export * from ${JSON.stringify(fileURLToPath(import.meta.resolve(entry)))}\n`);
        const parsed: string[] = [];
        // Base peer dependencies are external. Optional peers are deliberately NOT
        // externalized, so an accidental root import would appear in this build graph.
        const result = await build({ configFile: false, plugins: [{ name: 'record-core-module-graph', moduleParsed(info) { parsed.push(info.id); } }], root: fileURLToPath(new URL('..', import.meta.url)), logLevel: 'silent', build: { write: false, minify: false, rollupOptions: { input: path, preserveEntrySignatures: 'strict', external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react', '@hollis-labs/design-components', '@hollis-labs/design-tokens'], output: { format: 'es' } } } }) as Rollup.RollupOutput;
        const modules = parsed;
        expect(result.output.some(chunk => chunk.type === 'chunk')).toBe(true);
        expect(modules.some(path => /node_modules\/(?:@xyflow|shiki|@shikijs|ansi-to-react)\//.test(path))).toBe(false);
        expect(modules.some(path => path.includes(`/kit-${name}/`))).toBe(true);
        await writeFile(`${scratch}${name}-modules.json`, JSON.stringify(modules, null, 2));
    }
}, 10000);
it('distributed candidate assets preserve complete mixed license and token canvas bridge', async () => {
    for (const packageName of ['kit-code', 'kit-workflow']) {
        const installed = await readFile(fileURLToPath(new URL(`../node_modules/@hollis-labs/${packageName}/LICENSE`, import.meta.url)), 'utf8');
        const asset = await readFile(fileURLToPath(new URL(`../example/public/licenses/${packageName}.LICENSE`, import.meta.url)), 'utf8');
        expect(asset).toBe(installed);
        expect(asset).toContain('Apache License');
        expect(asset).toContain('Permission is hereby granted');
    }
    const css = await readFile(fileURLToPath(new URL('../node_modules/@hollis-labs/kit-workflow/src/styles/canvas.css', import.meta.url)), 'utf8');
    expect(css).toContain('@xyflow/react/dist/base.css');
    expect(css).not.toContain('@xyflow/react/dist/style.css');
});
