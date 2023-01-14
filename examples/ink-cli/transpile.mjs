#!/usr/bin/env node
import { statSync, readFileSync, writeFileSync } from 'fs';
import { globbySync } from 'globby';
import jsxTransform from '@babel/plugin-transform-react-jsx';
import { transformSync } from '@babel/core';

const ext = /\.jsx$/;
const force = process.argv.includes('-f');

for (const jsxPath of globbySync('**/*.jsx', { gitignore: true })) {
  const jsPath = jsxPath.replace(ext, '.mjs');
  if (force || mtime(jsxPath) > mtime(jsPath)) {
    transpile(jsxPath, jsPath);
  }
}

function transpile(jsxPath, jsPath) {
  const rawSource = readFileSync(jsxPath, 'utf-8');
  const { code } = transformSync(rawSource, {
    plugins: [
      [ renameJSX ],
      [ jsxTransform, { runtime: 'automatic' } ],
    ],
    filename: jsxPath,
    sourceMaps: 'inline',
    babelrc: false,
    configFile: false
  });
  writeFileSync(jsPath, code, 'utf-8');
}

function renameJSX({ types:t }) {
  const mjs = (source) => t.stringLiteral(source.value.replace(ext, '.mjs'));
  return {
    visitor: {
      Program: (path) => {
        const visitor = {
          ImportDeclaration: (path) => {
            const { node } = path;
            const { source } = node;
            if (ext.test(source.value)) {
              node.source = mjs(source);
            }
          },
          CallExpression: (path)  => {
            const { node } = path;
            if (node.callee.type === 'Import' && node.arguments?.length === 1) {
              const [ source ] = node.arguments;
              if (t.isStringLiteral(source)) {
                if (ext.test(source.value)) {
                  node.arguments = [ mjs(source) ];
                }
              } else {
                // insert replacement operation for non-static path
                // import(path)  ==>  import((path + "").replace(/\.jsx/, ""))
                const toString = t.binaryExpression('+', source, t.stringLiteral(''));
                const regExp = t.regExpLiteral(ext.source, ext.flags);
                const replace = t.memberExpression(toString, t.identifier('replace'));
                const call = t.callExpression(replace, [ regExp, t.stringLiteral('.mjs') ]);
                node.arguments = [ call ];
              }
            }            
          }
        };
        path.traverse(visitor);
      }
    }    
  };
}

function mtime(path) {
  try {
    return statSync(path).mtime;
  } catch (err) {
    return -1;
  }
}

