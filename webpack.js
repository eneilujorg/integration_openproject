const path = require('path')
const webpackConfig = require('@nextcloud/webpack-vue-config')
const ESLintPlugin = require('eslint-webpack-plugin')
const StyleLintPlugin = require('stylelint-webpack-plugin')

const buildMode = process.env.NODE_ENV
const isDev = buildMode === 'development'
webpackConfig.devtool = isDev ? 'cheap-source-map' : 'source-map'

webpackConfig.stats = {
	colors: true,
	modules: false,
}

const appId = 'integration_openproject'
webpackConfig.entry = {
	personalSettings: {
		import: path.join(__dirname, 'src', 'personalSettings.js'),
		filename: appId + '-personalSettings.js',
	},
	adminSettings: { import: path.join(__dirname, 'src', 'adminSettings.js'), filename: appId + '-adminSettings.js' },
	dashboard: { import: path.join(__dirname, 'src', 'dashboard.js'), filename: appId + '-dashboard.js' },
	'openproject-tab': { import: path.join(__dirname, 'src', 'projectTab.js'), filename: appId + '-projectTab.js' },
	fileActions: { import: path.join(__dirname, 'src', 'fileActions.js'), filename: appId + '-fileActions.js' },
	filesPlugin: {
		import: path.join(__dirname, 'src/filesPlugin', 'filesPlugin'),
		filename: appId + '-filesPlugin.js',
	},
	filesPluginLessThan28: {
		import: path.join(__dirname, 'src/filesPlugin', 'filesPluginLessThan28.js'),
		filename: appId + '-filesPluginLessThan28.js',
	},
	reference: { import: path.join(__dirname, 'src', 'reference.js'), filename: appId + '-reference.js' },
}

webpackConfig.plugins.push(
	new ESLintPlugin({
		extensions: ['js', 'vue'],
		files: 'src',
		failOnError: !isDev,
	}),
)
webpackConfig.plugins.push(
	new StyleLintPlugin({
		files: 'src/**/*.{css,scss,vue}',
		failOnError: !isDev,
	}),
)

webpackConfig.module.rules.push({
	test: /\.svg$/i,
	type: 'asset/source',
})

module.exports = webpackConfig
