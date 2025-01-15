module.exports = {
	globals: {
		appVersion: true,
	},
	parserOptions: {
		requireConfigFile: false,
	},
	extends: ['@nextcloud'],
	rules: {
		'jsdoc/require-jsdoc': 'off',
		'jsdoc/tag-lines': 'off',
		'vue/first-attribute-linebreak': 'off',
		'import/extensions': 'off',
		'max-len': ['error', { code: 120 }],
	},
	ignorePatterns: ['node_modules/*', 'js/*', 'vendor/*', 'dev/apps/*', 'l10n/*'],
}
