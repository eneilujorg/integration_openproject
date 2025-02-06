import { translate as t } from '@nextcloud/l10n'
import APP_ID from './appID.js'

export const error = {
	featureNotAvailable: t(APP_ID, 'This feature is not available for this user account'),
	opConnectionUnauthorized: t(APP_ID, 'Unauthorized to connect to OpenProject'),
	oidcUnspported: t(APP_ID, 'Oidc not supported'),
}
