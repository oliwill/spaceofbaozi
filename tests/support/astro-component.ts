import { readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transform } from '@astrojs/compiler';
import ts from 'typescript';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

export async function compileAstro(path: string, base = '/'): Promise<{ url: string; css: string }> {
  const cache = new Map<string, Promise<{ url: string; css: string }>>();
  const compile = (file: string): Promise<{ url: string; css: string }> => {
    const cached = cache.get(file);
    if (cached) return cached;
    const pending = (async () => {
      const source = await readFile(file, 'utf8');
      const result = file.endsWith('.astro') ? await transform(source, {
        filename: file, astroGlobalArgs: JSON.stringify('https://example.test'), renderScript: true,
        resolvePath: specifier => specifier,
        internalURL: pathToFileURL(join(process.cwd(), 'node_modules/astro/dist/runtime/compiler/index.js')).href,
      }) : { code: source, css: [] };
      let code = ts.transpileModule(result.code.replace(/^import ["'][^"'\n]+(?:\.css|\?astro&type=style[^"'\n]*)["'];?$/gm, ''), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText.replaceAll('import.meta.env.BASE_URL', JSON.stringify(base));
      for (const match of [...code.matchAll(/from ["']((?:@\/|\.\.?\/)[^"'\n]+)["']/g)]) {
        const name = match[1];
        const dependencyPath = name.startsWith('@/') ? join(process.cwd(), 'src', name.slice(2)) : resolve(dirname(file), name);
        const dependency = await compile(/\.(astro|ts)$/.test(dependencyPath) ? dependencyPath : dependencyPath + '.ts');
        code = code.replaceAll(`"${name}"`, JSON.stringify(dependency.url)).replaceAll(`'${name}'`, JSON.stringify(dependency.url));
      }
      return { url: `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`, css: result.css.join('\n') };
    })();
    cache.set(file, pending);
    return pending;
  };
  return compile(path);
}

export async function renderAstro(path: string, props: Record<string, unknown>, base = '/') {
  const compiled = await compileAstro(join(process.cwd(), path), base);
  const component = await import(/* @vite-ignore */ compiled.url);
  const container = await AstroContainer.create();
  return { html: await container.renderToString(component.default, { props }), css: compiled.css };
}
