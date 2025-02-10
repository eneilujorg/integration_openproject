<?php

/**
 * Nextcloud - openproject
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Julien Veyssier <eneiluj@posteo.net>
 * @copyright Julien Veyssier 2020
 */

namespace OCA\OpenProject\Controller;

use Exception;
use InvalidArgumentException;
use OCA\OpenProject\AppInfo\Application;
use OCA\OpenProject\Exception\OpenprojectErrorException;
use OCA\OpenProject\Service\OpenProjectAPIService;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\DataDisplayResponse;
use OCP\AppFramework\Http\DataDownloadResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\OCSController;
use OCP\Files\NotFoundException;
use OCP\Files\NotPermittedException;

use OCP\IConfig;
use OCP\IRequest;

class OpenProjectAPIController extends OCSController {

	private string $accessToken;
	private string $openprojectUrl;

	public function __construct(string $appName,
		IRequest $request,
		private IConfig $config,
		private OpenProjectAPIService $openprojectAPIService,
		private ?string $userId,
	) {
		parent::__construct($appName, $request);
		$this->accessToken = $config->getUserValue($userId, Application::APP_ID, 'token');
		$this->openprojectUrl = $config->getAppValue(Application::APP_ID, 'openproject_instance_url');
	}

	private function validatePreRequestConditions(): array {
		$authMethod = $this->config->getAppValue(Application::APP_ID, 'authorization_method', '');
		if ($authMethod === OpenProjectAPIService::AUTH_METHOD_OAUTH && $this->accessToken === '') {
			return [
				'status' => false,
				'result' => new DataResponse('', Http::STATUS_UNAUTHORIZED)
			];
		} elseif ($authMethod === OpenProjectAPIService::AUTH_METHOD_OIDC &&
			!$this->openprojectAPIService->getOIDCToken()
		) {
			return [
				'status' => false,
				'result' => new DataResponse('', Http::STATUS_UNAUTHORIZED)
			];
		} elseif (!OpenProjectAPIService::validateURL($this->openprojectUrl)) {
			return [
				'status' => false,
				'result' => new DataResponse('', Http::STATUS_BAD_REQUEST)
			];
		}
		return ['status' => true, 'result' => null];
	}

	/**
	 * get openproject instance URL
	 *
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function getOpenProjectUrl(): DataResponse {
		return new DataResponse($this->openprojectUrl);
	}
	/**
	 * get openproject user avatar
	 *
	 * @param string $userId
	 * @param string $userName
	 * @return DataDisplayResponse|DataDownloadResponse
	 * @throws \OCP\Files\NotFoundException
	 * @throws \OCP\Files\NotPermittedException
	 * @throws \OCP\Lock\LockedException
	 */
	#[NoAdminRequired]
	#[NoCsrfRequired]
	public function getOpenProjectAvatar(string $userId = '', string $userName = '') {
		$result = $this->openprojectAPIService->getOpenProjectAvatar(
			$userId, $userName, $this->userId
		);
		$response = new DataDownloadResponse(
			$result['avatar'], 'avatar', $result['type'] ?? ''
		);
		$response->cacheFor(60 * 60 * 24);
		return $response;
	}

	/**
	 * get notifications list
	 *
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function getNotifications(): DataResponse {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		$result = $this->openprojectAPIService->getNotifications($this->userId);
		if (!isset($result['error'])) {
			$response = new DataResponse($result);
		} else {
			if (isset($result['statusCode'])) {
				$statusCode = $result['statusCode'];
			} else {
				$statusCode = Http::STATUS_UNAUTHORIZED;
			}
			$response = new DataResponse($result, $statusCode);
		}
		return $response;
	}

	/**
	 * get searched work packages
	 *
	 * @param ?string $searchQuery
	 * @param ?int $fileId
	 * @param bool $isSmartPicker
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function getSearchedWorkPackages(
		?string $searchQuery = null,
		?int $fileId = null,
		bool $isSmartPicker = false
	): DataResponse {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		// when the search is done through smart picker we don't want to check if the work package is linkable
		$result = $this->openprojectAPIService->searchWorkPackage(
			$this->userId,
			$searchQuery,
			$fileId,
			!$isSmartPicker
		);

		if (!isset($result['error'])) {
			$response = new DataResponse($result);
		} else {
			if (isset($result['statusCode'])) {
				$statusCode = $result['statusCode'];
			} else {
				$statusCode = Http::STATUS_BAD_REQUEST;
			}
			$response = new DataResponse($result, $statusCode);
		}
		return $response;
	}

	/**
	 * @param array<mixed> $values An array containing the following keys:
	 *        - "workpackageId" (int): The ID of the work package.
	 *        - "fileinfo" (array):  An array of file information with the following keys:
	 *            - "id" (int): File id of the file
	 *            - "name" (string): Name of the file
	 *
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function linkWorkPackageToFile(array $values): DataResponse {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		try {
			$result = $this->openprojectAPIService->linkWorkPackageToFile(
				$values,
				$this->userId,
			);
		} catch (InvalidArgumentException $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_BAD_REQUEST);
		} catch (OpenprojectErrorException $e) {
			return new DataResponse($e->getMessage(), $e->getcode());
		} catch (NotPermittedException | NotFoundException $e) {
			return new DataResponse('file not found', Http::STATUS_NOT_FOUND);
		} catch (\Exception $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_INTERNAL_SERVER_ERROR);
		}
		return new DataResponse($result);
	}

	/**
	 * @param int $workpackageId
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function markNotificationAsRead(int $workpackageId) {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		try {
			$result = $this->openprojectAPIService->markAllNotificationsOfWorkPackageAsRead(
				$workpackageId,
				$this->userId,
			);
		} catch (OpenprojectErrorException $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_BAD_REQUEST);
		} catch (Exception $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_INTERNAL_SERVER_ERROR);
		}
		if ($result['success'] !== true) {
			return new DataResponse(
				'could not mark notification as read',
				Http::STATUS_INTERNAL_SERVER_ERROR
			);
		}
		return new DataResponse($result);
	}

	/**
	 * @param int $id
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function getWorkPackageFileLinks(int $id): DataResponse {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		try {
			$result = $this->openprojectAPIService->getWorkPackageFileLinks(
				$id,
				$this->userId,
			);
		} catch (OpenprojectErrorException $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_BAD_REQUEST);
		} catch (NotFoundException $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_NOT_FOUND);
		} catch (\Exception $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_INTERNAL_SERVER_ERROR);
		}
		return new DataResponse($result);
	}

	/**
	 * @param int $id
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function deleteFileLink(int $id): DataResponse {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		try {
			$result = $this->openprojectAPIService->deleteFileLink(
				$id,
				$this->userId,
			);
		} catch (OpenprojectErrorException $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_BAD_REQUEST);
		} catch (NotFoundException $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_NOT_FOUND);
		} catch (\Exception $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_INTERNAL_SERVER_ERROR);
		}
		return new DataResponse($result);
	}

	/**
	 * get status of work packages
	 *
	 * @param string $id
	 *
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function getOpenProjectWorkPackageStatus(string $id): DataResponse {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		$result = $this->openprojectAPIService->getOpenProjectWorkPackageStatus(
			$this->userId, $id
		);
		if (!isset($result['error'])) {
			$response = new DataResponse($result);
		} else {
			$response = new DataResponse($result, Http::STATUS_UNAUTHORIZED);
		}
		return $response;
	}

	/**
	 * get type work packages
	 *
	 * @param string $id
	 *
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function getOpenProjectWorkPackageType(string $id): DataResponse {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		$result = $this->openprojectAPIService->getOpenProjectWorkPackageType(
			$this->userId, $id
		);
		if (!isset($result['error'])) {
			$response = new DataResponse($result);
		} else {
			$response = new DataResponse($result, Http::STATUS_UNAUTHORIZED);
		}
		return $response;
	}

	/**
	 * @param string|null $searchQuery
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function getAvailableOpenProjectProjects(?string $searchQuery = null): DataResponse {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		try {
			$result = $this->openprojectAPIService->getAvailableOpenProjectProjects($this->userId, $searchQuery);
		} catch (OpenprojectErrorException $e) {
			return new DataResponse($e->getMessage(), $e->getCode());
		} catch (\Exception $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_INTERNAL_SERVER_ERROR);
		}
		return new DataResponse($result);
	}


	/**
	 * @param string $projectId
	 * @param array<mixed> $body body is same in the format that OpenProject api expects the body to be i.e
	 *                             {
	 *                                _links: {
	 *                                    type: {
	 *                                        href: '/api/v3/types/1'
	 *                                        title: 'Task'
	 *                                    },
	 *                                    status: {
	 *                                        href: '/api/v3/statuses/1'
	 *                                        title: 'New'
	 *                                    },
	 *                                    assignee: {
	 *                                        href: ''
	 *                                        title: ''
	 *                                    },
	 *                                    project: {
	 *                                         href: '...'
	 *                                         title: '...'
	 *                                     },
	 *                                },
	 *                                subject: "something",
	 *                                description: {
	 *                                    format: 'markdown',
	 *                                    raw: '',
	 *                                    html: ''
	 *                                }
	 *                                }
	 *                           See POST request for create work package https://www.openproject.org/docs/api/endpoints/work-packages/
	 * 							 Note that this api will send `200` even with empty body and the body content is similar to that of create workpackages
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function getOpenProjectWorkPackageForm(string $projectId, array $body): DataResponse {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		try {
			$result = $this->openprojectAPIService->getOpenProjectWorkPackageForm($this->userId, $projectId, $body);
		} catch (OpenprojectErrorException $e) {
			return new DataResponse($e->getMessage(), $e->getcode());
		} catch (\Exception $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_INTERNAL_SERVER_ERROR);
		}
		return new DataResponse($result);
	}

	/**
	 * @param string $projectId
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function getAvailableAssigneesOfAProject(string $projectId): DataResponse {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		try {
			$result = $this->openprojectAPIService->getAvailableAssigneesOfAProject($this->userId, $projectId);
		} catch (OpenprojectErrorException $e) {
			return new DataResponse($e->getMessage(), $e->getcode());
		} catch (\Exception $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_INTERNAL_SERVER_ERROR);
		}
		return new DataResponse($result);
	}

	/**
	 * @param array<mixed> $body body is same in the format that OpenProject api expects the body to be i.e
	 *                            {
	 * 								_links: {
	 * 									type: {
	 * 									 	href: '/api/v3/types/1'
	 * 										title: 'Task'
	 * 									},
	 * 									status: {
	 * 									 	href: '/api/v3/statuses/1'
	 * 										title: 'New'
	 * 									},
	 * 									assignee: {
	 * 									 	href: ''
	 * 										title: ''
	 * 									},
	 * 									project: {
	 *                                        href: '...'
	 *                                        title: '...'
	 *                                    },
	 * 								},
	 * 								subject: "something",
	 * 								description: {
	 * 									format: 'markdown',
	 * 									raw: '',
	 * 									html: ''
	 * 								}
	 * 								}
	 *                          See POST request for create work package https://www.openproject.org/docs/api/endpoints/work-packages/
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function createWorkPackage(array $body): DataResponse {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		// we don't want to check if all the data in the body is set or not because
		// that calculation will be done by the openproject api itself
		// we don't want to duplicate the logic
		if (empty($body)) {
			return new DataResponse('Body cannot be empty', Http::STATUS_BAD_REQUEST);
		}
		try {
			$result = $this->openprojectAPIService->createWorkPackage($this->userId, $body);
		} catch (OpenprojectErrorException $e) {
			return new DataResponse($e->getMessage(), $e->getcode());
		} catch (\Exception $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_INTERNAL_SERVER_ERROR);
		}
		return new DataResponse($result, Http::STATUS_CREATED);
	}

	/**
	 * get OpenProject configuration
	 *
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function getOpenProjectConfiguration(): DataResponse {
		$validatePreRequestResult = $this->validatePreRequestConditions();
		if (!$validatePreRequestResult['status']) {
			return $validatePreRequestResult['result'];
		}
		try {
			$result = $this->openprojectAPIService->getOpenProjectConfiguration($this->userId);
		} catch (OpenprojectErrorException $e) {
			return new DataResponse($e->getMessage(), $e->getCode());
		} catch (\Exception $e) {
			return new DataResponse($e->getMessage(), Http::STATUS_INTERNAL_SERVER_ERROR);
		}
		return new DataResponse($result);
	}
}
