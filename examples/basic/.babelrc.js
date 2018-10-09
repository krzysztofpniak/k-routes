const { NODE_ENV } = process.env;

module.exports = {
    presets: [
        '@babel/env',
        '@babel/react',
    ],
    plugins: [
        // don't use `loose` mode here - need to copy symbols when spreading
        '@babel/proposal-object-rest-spread',
        '@babel/plugin-transform-spread',
        NODE_ENV === 'test' && '@babel/transform-modules-commonjs'
    ].filter(Boolean)
};
