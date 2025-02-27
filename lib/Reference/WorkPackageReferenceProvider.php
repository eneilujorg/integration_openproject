<?php

/**
 * SPDX-FileCopyrightText: 2023-2024 Jankari Tech Pvt. Ltd.
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\OpenProject\Reference;

use OCA\OpenProject\Service\OpenProjectAPIService;
use OCP\Collaboration\Reference\ADiscoverableReferenceProvider;
use OCP\Collaboration\Reference\Reference;
use OC\Collaboration\Reference\ReferenceManager;
use OCA\OpenProject\AppInfo\Application;
use OCP\Collaboration\Reference\IReference;
use OCP\IConfig;
use OCP\IL10N;
use OCP\IURLGenerator;

class WorkPackageReferenceProvider extends ADiscoverableReferenceProvider {
	private const RICH_OBJECT_TYPE = Application::APP_ID . '_work_package';

	// as we know we are on NC >= 26, we can use Php 8 syntax for class attributes
	public function __construct(private IConfig $config,
								private IL10N $l10n,
								private IURLGenerator $urlGenerator,
								private ReferenceManager $referenceManager,
								private OpenProjectAPIService $openProjectAPIService,
								private ?string $userId) {
	}

	/**
	 * @inheritDoc
	 */
	public function getId(): string {
		return 'openproject-work-package-ref';
	}

	/**
	 * @inheritDoc
	 */
	public function getTitle(): string {
		return $this->l10n->t('OpenProject work packages');
	}

	/**
	 * @inheritDoc
	 */
	public function getOrder(): int {
		return 10;
	}

	/**
	 * @inheritDoc
	 */
	public function getIconUrl(): string {
		return $this->urlGenerator->getAbsoluteURL(
			$this->urlGenerator->imagePath(Application::APP_ID, 'app-dark.svg')
		);
	}

	/**
	 * Parse a link to find a work package ID
	 *
	 * @param string $referenceText
	 *
	 * @return int|null
	 */
	public function getWorkPackageIdFromUrl(string $referenceText): ?int {
		$patterns = array(
			'\/wp\/([0-9]+)/',
			'\/projects\/[^\/\?]+\/(?:work_packages|bcf)(?:\/details)?\/([0-9]+)/',
			'\/(?:work_packages|notifications)\/details\/([0-9]+)/',
			'\/work_packages\/([0-9]+)/',
			'\/projects\/[^\/\?]+\/(?:boards|calendars|team_planners)\/[^\/\?]+\/details\/([0-9]+)/');
		// example links
		// https://community.openproject.org/projects/nextcloud-integration/work_packages/40070
		$openProjectUrl = rtrim($this->config->getAppValue(Application::APP_ID, 'openproject_instance_url'),'/');
		foreach ($patterns as $pattern) {
			$patternString ='/^' . preg_quote($openProjectUrl, '/') . $pattern;
			preg_match($patternString, $referenceText, $patternMatches);
			if (count($patternMatches) > 1) {
				return (int) $patternMatches[1];
			}
		}
		return null;
	}

	/**
	 */
	public function matchReference(string $referenceText): bool {
		if ($this->userId !== null) {
			$linkPreviewEnabled = $this->config->getUserValue($this->userId, Application::APP_ID, 'link_preview_enabled', '1') === '1';
			if (!$linkPreviewEnabled) {
				return false;
			}
		}
		$adminLinkPreviewEnabled = $this->config->getAppValue(Application::APP_ID, 'link_preview_enabled', '1') === '1';
		if (!$adminLinkPreviewEnabled) {
			return false;
		}

		return $this->getWorkPackageIdFromUrl($referenceText) !== null;
	}

	public function getIsAdminConfigOk(): bool {
		return OpenProjectAPIService::isAdminConfigOk($this->config);
	}

	/**
	 */
	public function resolveReference(string $referenceText): ?IReference {
		if ($this->matchReference($referenceText) && $this->getIsAdminConfigOk() ) {
			$wpId = $this->getWorkPackageIdFromUrl($referenceText);
			if ($wpId !== null) {
				$wpInfo = $this->openProjectAPIService->getWorkPackageInfo($this->userId, $wpId);
                if($wpInfo !== null) {
                    $reference = new Reference($referenceText);
                    // this is used if your custom reference widget cannot be loaded (in mobile/desktop clients for example)
                    $reference->setTitle($wpInfo['title']);
                    $reference->setDescription($wpInfo['description']);
                    $reference->setImageUrl($wpInfo['imageUrl']);
                    // this is the data you will get in your custom reference widget
                    $reference->setRichObject(
                        self::RICH_OBJECT_TYPE,
                        $wpInfo['entry']
                    );
                    return $reference;
                }
			}
		}
		return null;
	}

	/**
	 * We use the userId here because when connecting/disconnecting from the OpenProject account,
	 * we want to invalidate all the user cache and this is only possible with the cache prefix
	 * @inheritDoc
	 */
	public function getCachePrefix(string $referenceId): string {
		return $this->userId ?? '';
	}

	/**
	 * We don't use the userId here but rather a reference unique id
	 * @inheritDoc
	 */
	public function getCacheKey(string $referenceId): ?string {
		$wpId = $this->getWorkPackageIdFromUrl($referenceId);
		return (string) ($wpId ?? $referenceId);
	}

	/**
	 * @param string $userId
	 * @return void
	 */
	public function invalidateUserCache(string $userId): void {
		$this->referenceManager->invalidateCache($userId);
	}
}
