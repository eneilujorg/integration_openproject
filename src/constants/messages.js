import { translate as t } from '@nextcloud/l10n'
import APP_ID from './appID.js'
import { loadState } from '@nextcloud/initial-state'
const state = loadState('integration_openproject', 'admin-config')

export const error = {
	featureNotAvailable: t(APP_ID, 'This feature is not available for this user account'),
	opConnectionUnauthorized: t(APP_ID, 'Unauthorized to connect to OpenProject'),
	// oidcUnspported: t(APP_ID, 'USER_OIDC app not supported. Minimum version: ' + state.user_oidc_minimum_version),
	userOidcVersionUnsupported: t(APP_ID, 'USER_OIDC app not supported. Minimum version: ' + state.user_oidc_minimum_version),
}
