import isBuiltin from 'is-builtin-module';
import babel from 'rollup-plugin-babel';
import commonJs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import nodeBuiltins from 'rollup-plugin-node-builtins';
import nodeGlobals from 'rollup-plugin-node-globals';
import nodePolyfill from 'rollup-plugin-polyfill-node';
import packageJson from './package.json';
import tweakDefault from './build/rollup-plugin';

process.env.BABEL_ENV = 'rollup';

const dependencies = Object.keys(packageJson.dependencies);

export default {
  input: 'src/index.js',
  output: [
    { file: 'lib/index.js', format: 'cjs', exports: 'named' },
    { file: 'lib/index.es.js', format: 'es', exports: 'named', intro: 'process.emitWarning("The .es.js file is deprecated. Use .mjs instead.");' },
    { file: 'lib/index.mjs', format: 'es', exports: 'named' },
    { file: 'lib/index.browser.js', browser: true, format: 'iife', sourceMap: 'inline', name: "nodeFetch", exports: 'named' },
    { file: 'lib/index.browser.es.js', format: 'esm', exports: 'named' },
  ],
  plugins: [
    nodeResolve({
      // mainFields: [
      //   'main',
      //   'module',
      //   'browser',
      // ],
      "jsnext": true,
      "main": true,
      "browser": true,
      preferBuiltins: true,
    }),
    nodeGlobals(),
    // nodePolyfill(),
    // nodeBuiltins(),
    babel({
      runtimeHelpers: true,
      
    }),
    commonJs({
      include: /node_modules/
    }),
    tweakDefault(),
  ],
  external: function (id) {
    return dependencies.includes(id) || isBuiltin(id);
  }
};
