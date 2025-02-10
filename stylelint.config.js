/**
 * SPDX-FileCopyrightText: 2021-2022 Jankari Tech Pvt. Ltd.
 * SPDX-FileCopyrightText: 2021 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

const stylelintConfig = require('@nextcloud/stylelint-config')
stylelintConfig.rules = {
	...stylelintConfig.rules,
	'declaration-colon-space-after': 'always',
	'max-empty-lines': 1,
	"block-opening-brace-space-before": "always"
}
module.exports = stylelintConfig
