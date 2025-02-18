/**
 * SPDX-FileCopyrightText: 2025 Jankari Tech Pvt. Ltd.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { translate as t } from '@nextcloud/l10n'
import APP_ID from './appID.js'

export const error = {
	featureNotAvailable: t(APP_ID, 'This feature is not available for this user account'),
	opConnectionUnauthorized: t(APP_ID, 'Unauthorized to connect to OpenProject'),
}

export const messagesFmt = {
	appNotSupported: (app, userOidcMinimumVersion) => t(APP_ID, '"app" app not supported. Minimum required version: "{userOidcMinimumVersion}"', { app, userOidcMinimumVersion }),
}
