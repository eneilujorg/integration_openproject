<?php

declare(strict_types=1);

/**
 * SPDX-FileCopyrightText: 2023-2024 Jankari Tech Pvt. Ltd.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\OpenProject\Listener;

use OCA\OpenProject\AppInfo\Application;
use OCP\AppFramework\OCS\OCSBadRequestException;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\User\Events\UserChangedEvent;
use Psr\Log\LoggerInterface;

/**
 * @template-implements IEventListener<Event>
 */
class UserChangedListener implements IEventListener {

	/**
	 * @var LoggerInterface
	 */
	private $logger;


	/**
	 * @param LoggerInterface $logger
	 */
	public function __construct(LoggerInterface $logger) {
		$this->logger = $logger;
	}

	/**
	 * @throws \Exception
	 */
	public function handle(Event $event): void {
		if (!($event instanceof UserChangedEvent)) {
			return;
		}

		if ($event->getUser()->getUID() === Application::OPEN_PROJECT_ENTITIES_NAME) {
			$feature = $event->getFeature();
			if ($feature === 'enabled' && !$event->getValue()) {
				$this->logger->error('User "OpenProject" is needed to be protected by the app "OpenProject Integration", thus cannot be disabled. Please check the documentation "https://www.openproject.org/docs/system-admin-guide/integrations/nextcloud/#troubleshooting" for further information.');
				$event->getUser()->setEnabled();
				throw new OCSBadRequestException('<p>&nbsp;User "OpenProject" is needed to be protected by the
				app "OpenProject Integration", thus cannot be disabled.
				Please check the <a style="color:var(--color-primary-default)" href="https://www.openproject.org/docs/system-admin-guide/integrations/nextcloud/#troubleshooting"
				target="_blank"><u>troubleshooting guide</u></a> for further information.</p>');
			}
		}
	}
}
