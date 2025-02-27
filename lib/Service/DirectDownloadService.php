<?php

/**
 * SPDX-FileCopyrightText: 2024 Jankari Tech Pvt. Ltd.
 * SPDX-FileCopyrightText: 2022 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\OpenProject\Service;

use DateTime;
use OC\Files\Node\File;
use OCP\DB\QueryBuilder\IQueryBuilder;
use OCP\Files\IRootFolder;
use OCP\IDBConnection;

class DirectDownloadService {
	/**
	 * @var IDBConnection
	 */
	private $db;
	/**
	 * @var IRootFolder
	 */
	private $root;

	/**
	 * Service to check and get direct download links
	 */
	public function __construct(IDBConnection $db,
		IRootFolder $root) {
		$this->db = $db;
		$this->root = $root;
	}

	public function getDirectDownloadFile(string $token): ?File {
		$qb = $this->db->getQueryBuilder();

		$qb->select('id', 'user_id', 'file_id', 'token', 'expiration')
		   ->from('directlink')
		   ->where(
		   	$qb->expr()->eq('token', $qb->createNamedParameter($token, IQueryBuilder::PARAM_STR))
		   );
		$req = $qb->executeQuery();

		while ($row = $req->fetch()) {
			$dbFileId = (int) $row['file_id'];
			$dbExpiration = (int) $row['expiration'];
			$dbUserId = $row['user_id'];

			$nowTs = (new DateTime())->getTimestamp();
			if ($nowTs <= $dbExpiration) {
				$userFolder = $this->root->getUserFolder($dbUserId);
				$files = $userFolder->getById($dbFileId);
				if (count($files) > 0 && $files[0] instanceof File) {
					$req->closeCursor();
					$qb->resetQueryParts();
					return $files[0];
				}
			}
		}
		$req->closeCursor();
		$qb->resetQueryParts();

		return null;
	}
}
