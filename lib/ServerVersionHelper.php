<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2024 Jankari Tech Pvt. Ltd.
 * SPDX-FileCopyrightText: 2024 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\OpenProject;

use OC_Util;

class ServerVersionHelper {
	/**
	 * Get Nextcloud version string.
	 *
	 * @return string
	 */
	public static function getNextcloudVersion(): string {
		// for nextcloud above 31 OC_Util::getVersion() method does not exists
		if (class_exists('OCP\ServerVersion')) {
			$versionArray = (new \OCP\ServerVersion())->getVersion();
		} else {
			/** @psalm-suppress UndefinedMethod getVersion() method is not in stable31 so making psalm not complain */
			$versionArray = OC_Util::getVersion();
		}

		return implode('.', $versionArray);
	}
}
