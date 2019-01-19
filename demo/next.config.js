const withPlugins = require('next-compose-plugins');


const withTypescript = require('@zeit/next-typescript')


const withCSS = require('@zeit/next-css')


module.exports = withPlugins([
    withCSS({
        cssModules: false
    }),
    withTypescript()
], null);
