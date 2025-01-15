import { showError, showSuccess } from '@nextcloud/dialogs'
import { translate as t } from '@nextcloud/l10n'

let mytimer = 0
export function delay(callback, ms) {
	return function() {
		const context = this
		const args = arguments
		clearTimeout(mytimer)
		mytimer = setTimeout(function() {
			callback.apply(context, args)
		}, ms || 0)
	}
}

export function checkOauthConnectionResult(oauthConnectionResult, oauthConnectionErrorMessage) {
	if (oauthConnectionResult === 'success') {
		showSuccess(t('integration_openproject', 'Successfully connected to OpenProject!'))
	} else if (oauthConnectionResult === 'error') {
		showError(
			t(
				'integration_openproject',
				'OAuth access token could not be obtained:',
			) + ' ' + oauthConnectionErrorMessage,
		)
	}
}

export const STATE = {
	OK: 'ok',
	ERROR: 'error',
	LOADING: 'loading',
	NO_TOKEN: 'no-token',
	CONNECTION_ERROR: 'connection-error',
	FAILED_FETCHING_WORKPACKAGES: 'failed-fetching-workpackages',
}

export const F_MODES = {
	VIEW: 0,
	EDIT: 1,
	DISABLE: 2,
}

export const FORM = {
	SERVER: 0,
	AUTHORIZATION_METHOD: 1,
	AUTHORIZATION_SETTING: 2,
	OP_OAUTH: 3,
	NC_OAUTH: 4,
	GROUP_FOLDER: 5,
	APP_PASSWORD: 6,
}

export const WORKPACKAGES_SEARCH_ORIGIN = {
	PROJECT_TAB: 'project-tab',
	LINK_MULTIPLE_FILES_MODAL: 'link-multiple-files-modal',
}
export const USER_SETTINGS = {
	NAVIGATION_LINK_DESCRIPTION: t(
		'integration_openproject',
		'Displays a link to your OpenProject instance in the Nextcloud header.',
	),
	UNIFIED_SEARCH_DESCRIPTION: t(
		'integration_openproject',
		'Allows you to search OpenProject work packages via the universal search bar in Nextcloud.',
	),
}

export const NO_OPTION_TEXT_STATE = {
	START_TYPING: 0,
	SEARCHING: 1,
	RESULT: 2,
}

export const AUTH_METHOD = {
	OAUTH2: 'oauth2',
	OIDC: 'oidc',
}

export const AUTH_METHOD_LABEL = {
	OAUTH2: t('integration_openproject', 'OAuth2 two-way authorization code flow'),
	OIDC: t('integration_openproject', 'OpenID identity provider'),
}
