const path = require('path')

module.exports = {
	outputDir: path.resolve(__dirname, '../server/public'),
	// source maps would ship the whole client source with the app (~6 MB)
	productionSourceMap: false,
	configureWebpack: {
		// the webpack runtime in its own small file, so a change in the app keeps the vendor
		// bundle's hash (and the browser's cached copy) valid
		optimization: { runtimeChunk: 'single' },
	},
	devServer: {
		// the dev server forwards API calls to Express, so the browser talks to a single origin
		// (API_PROXY_TARGET is set by docker-compose.dev.yml)
		proxy:{
			'/api': {
				target: process.env.API_PROXY_TARGET || 'http://localhost:3000'
			}
		}
	},
}
