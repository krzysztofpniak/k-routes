import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default [
	// browser-friendly UMD build
	{
		input: 'src/main.js',
		output: {file: pkg.browser, format: 'umd', name: 'k-routes'},
		plugins: [
            replace({
                "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV)
            }),
            babel({
                exclude: ['node_modules/**']
            }),
            nodeResolve({
                jsnext: true,
            }),
            commonjs({
                namedExports: {
                    'node_modules/react/index.js': ['createFactory', 'Children', 'Component', 'PropTypes', 'createElement', 'cloneElement'],
                    'node_modules/react-dom/index.js': ['render']
                }
			}),
		],
	},
	// CommonJS (for Node) and ES module (for bundlers) build.
	// (We could have three entries in the configuration array
	// instead of two, but it's quicker to generate multiple
	// builds from a single configuration where possible, using
	// the `targets` option which can specify `dest` and `format`)
	{
		input: 'src/main.js',
		external: ['ramda', 'react', 'reselect', 'k-reducer', 'redux', 'recompose', 'redux-actions', 'path-parser', 'react-redux'],
		output: [
			{ file: pkg.main, format: 'cjs' },
			{ file: pkg.module, format: 'es' }
		],
		plugins: [
			babel({
				exclude: ['node_modules/**']
			})
		]
	}
];
