import { cwd } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformSync } from '@babel/core';
import jsxTransform from '@babel/plugin-transform-react-jsx';

const baseURL = pathToFileURL(`${cwd()}/`).href;
const extensionsRegex = /\.jsx$/;

export async function resolve(specifier, context, nextResolve) {
  if (extensionsRegex.test(specifier)) {
    const { parentURL = baseURL } = context;
    return {
      shortCircuit: true,
      url: new URL(specifier, parentURL).href
    };
  }
  return nextResolve(specifier);
}

export async function load(url, context, nextLoad) {
  const format = 'module';
  if (extensionsRegex.test(url)) {
    const { source: rawSource } = await nextLoad(url, { ...context, format });
    const { code: transformedSource } = transformSync(rawSource, {
      plugins: [
        [
          jsxTransform,
          {
            pragma: 'React.createElement',
            pragmaFrag: 'React.Fragment',
            useBuiltIns: true
          }
        ]
      ],
      filename: fileURLToPath(url),
      sourceMaps: 'inline',
      babelrc: false,
      configFile: false
    });
    return {
      format,
      shortCircuit: true,
      source: transformedSource,
    };
  }
  return nextLoad(url);
}
