<?php

/**
 * SPDX-FileCopyrightText: 2021-2025 Jankari Tech Pvt. Ltd.
 * SPDX-FileCopyrightText: 2021-2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\OpenProject\Service;

use DateTime;
use DateTimeZone;
use Exception;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use InvalidArgumentException;
use OC\Authentication\Events\AppPasswordCreatedEvent;
use OC\Authentication\Token\IProvider;
use OC\User\NoUserException;
use OCA\AdminAudit\AuditLogger;
use OCA\GroupFolders\Folder\FolderManager;
use OCA\OpenProject\AppInfo\Application;
use OCA\OpenProject\Exception\OpenprojectAvatarErrorException;
use OCA\OpenProject\Exception\OpenprojectErrorException;
use OCA\OpenProject\Exception\OpenprojectGroupfolderSetupConflictException;
use OCA\OpenProject\Exception\OpenprojectResponseException;
use OCA\OpenProject\ExchangedTokenRequestedEventHelper;
use OCA\TermsOfService\Db\Entities\Signatory;
use OCA\TermsOfService\Db\Mapper\SignatoryMapper;
use OCA\TermsOfService\Db\Mapper\TermsMapper;
use OCA\UserOIDC\Db\ProviderMapper;
use OCA\UserOIDC\Exception\TokenExchangeFailedException;
use OCA\UserOIDC\User\Backend as OIDCBackend;
use OCP\App\IAppManager;
use OCP\AppFramework\Http;
use OCP\Encryption\IManager;
use OCP\EventDispatcher\IEventDispatcher;
use OCP\Files\InvalidPathException;
use OCP\Files\IRootFolder;
use OCP\Files\Node;
use OCP\Files\NotFoundException;
use OCP\Files\NotPermittedException;
use OCP\Group\ISubAdmin;
use OCP\Http\Client\IClientService;
use OCP\Http\Client\IResponse;
use OCP\IAvatarManager;
use OCP\ICache;
use OCP\ICacheFactory;
use OCP\IConfig;
use OCP\IDBConnection;
use OCP\IGroupManager;
use OCP\IL10N;
use OCP\IURLGenerator;
use OCP\IUser;
use OCP\IUserManager;
use OCP\IUserSession;
use OCP\Log\ILogFactory;
use OCP\PreConditionNotMetException;
use OCP\Security\ISecureRandom;
use OCP\Server;
use Psr\Log\LoggerInterface;

define('CACHE_TTL', 3600);

class OpenProjectAPIService {
	public const AUTH_METHOD_OAUTH = 'oauth2';
	public const AUTH_METHOD_OIDC = 'oidc';
	/**
	 * @var string
	 */
	private $appName;
	/**
	 * @var IAvatarManager
	 */
	private $avatarManager;
	/**
	 * @var LoggerInterface
	 */
	private $logger;
	/**
	 * @var IL10N
	 */
	private $l10n;
	/**
	 * @var IConfig
	 */
	private $config;
	/**
	 * @var \OCP\Http\Client\IClient
	 */
	private $client;

	/** @var IRootFolder */
	private $storage;

	/**
	 * @var IURLGenerator
	 */
	private $urlGenerator;

	/**
	 * @var ICache
	 */
	private $cache = null;

	/**
	 * @var IUserManager
	 */
	private $userManager;

	/**
	 * @var IGroupManager
	 */
	private $groupManager;

	/**
	 * @var IAppManager
	 */
	private $appManager;

	/**
	 * @var ISubAdmin
	 */
	private ISubAdmin $subAdminManager;
	private IDBConnection $db;
	private ILogFactory $logFactory;
	private IManager $encryptionManager;

	/**
	 * @var IUserSession
	 */
	private $userSession;


	/**
	 * Service to make requests to OpenProject v3 (JSON) API
	 */


	private IProvider $tokenProvider;
	private ISecureRandom $random;
	private IEventDispatcher $eventDispatcher;
	private AuditLogger $auditLogger;
	private ExchangedTokenRequestedEventHelper $exchangedTokenRequestedEventHelper;

	public function __construct(
		string $appName,
		IAvatarManager $avatarManager,
		LoggerInterface $logger,
		IL10N $l10n,
		IConfig $config,
		IClientService $clientService,
		IRootFolder $storage,
		IURLGenerator $urlGenerator,
		ICacheFactory $cacheFactory,
		IUserManager $userManager,
		IGroupManager $groupManager,
		IAppManager $appManager,
		IProvider $tokenProvider,
		ISecureRandom $random,
		IEventDispatcher $eventDispatcher,
		ISubAdmin $subAdminManager,
		IDBConnection $db,
		ILogFactory $logFactory,
		IManager $encryptionManager,
		ExchangedTokenRequestedEventHelper $exchangedTokenRequestedEventHelper,
		IUserSession $userSession,
	) {
		$this->appName = $appName;
		$this->avatarManager = $avatarManager;
		$this->logger = $logger;
		$this->l10n = $l10n;
		$this->config = $config;
		$this->client = $clientService->newClient();
		$this->storage = $storage;
		$this->urlGenerator = $urlGenerator;
		$this->cache = $cacheFactory->createDistributed();
		$this->userManager = $userManager;
		$this->groupManager = $groupManager;
		$this->appManager = $appManager;
		$this->subAdminManager = $subAdminManager;
		$this->tokenProvider = $tokenProvider;
		$this->random = $random;
		$this->eventDispatcher = $eventDispatcher;
		$this->db = $db;
		$this->logFactory = $logFactory;
		$this->encryptionManager = $encryptionManager;
		$this->exchangedTokenRequestedEventHelper = $exchangedTokenRequestedEventHelper;
		$this->userSession = $userSession;
	}

	/**
	 * returns the current date and time with the correct format for OpenProject API
	 *
	 * @return string
	 */
	public function now(): string {
		date_default_timezone_set('UTC');
		$utcTimezone = new DateTimeZone('-0000');
		$nowDt = new Datetime();
		$nowDt->setTimezone($utcTimezone);
		return $nowDt->format('Y-m-d\TH:i:s\Z');
	}

	/**
	 * @param string $userId
	 * @return array<mixed>
	 * @throws \JsonException
	 */
	public function getNotifications(string $userId): array {
		$filters[] = [
			'readIAN' =>
				['operator' => '=', 'values' => ['f']]
		];

		$params = [
			'pageSize' => -1,
			'filters' => json_encode($filters, JSON_THROW_ON_ERROR)
		];
		$result = $this->request($userId, 'notifications', $params);
		if (isset($result['error'])) {
			return $result;
		} elseif (
			!isset($result['_embedded']['elements']) ||
			(   // if there is an element, it also has to contain '_links'
				isset($result['_embedded']['elements'][0]) &&
				!isset($result['_embedded']['elements'][0]['_links'])
			)
		) {
			return ['error' => 'Malformed response'];
		}

		$result = $result['_embedded']['elements'];
		return array_values($result);
	}

	/**
	 * wrapper around IURLGenerator::getBaseUrl() to make it easier to mock in tests
	 */
	public function getBaseUrl(): string {
		return $this->config->getSystemValueString('overwrite.cli.url');
	}

	/**
	 * @param string $userId
	 * @param string|null $query
	 * @param int|null $fileId
	 * @param bool $onlyLinkableWorkPackages
	 * @return array<mixed>
	 * @throws \OCP\PreConditionNotMetException
	 */
	public function searchWorkPackage(
		string $userId,
		string $query = null,
		int $fileId = null,
		bool $onlyLinkableWorkPackages = true,
		int $workPackageId = null
	): array {
		$filters = [];

		// search by description
		if ($fileId !== null) {
			$filters[] = ['file_link_origin_id' => ['operator' => '=', 'values' => [(string)$fileId]]];
		}

		if ($query !== null) {
			$filters[] = ['typeahead' => ['operator' => '**', 'values' => [$query]]];
		}

		//search by wpId
		if ($workPackageId !== null) {
			$filters[] = ['id' => ['operator' => '=', 'values' => [(string)$workPackageId]]];
		}

		$resultsById = $this->searchRequest($userId, $filters, $onlyLinkableWorkPackages);
		if (isset($resultsById['error'])) {
			return $resultsById;
		}
		return array_values($resultsById);
	}

	/**
	 * @param string $userId
	 * @param array<mixed> $filters
	 * @param bool $onlyLinkableWorkPackages
	 * @return array<mixed>
	 * @throws \OCP\PreConditionNotMetException|\JsonException
	 */
	private function searchRequest(string $userId, array $filters, bool $onlyLinkableWorkPackages = true): array {
		$resultsById = [];
		$sortBy = [['updatedAt', 'desc']];
		if ($onlyLinkableWorkPackages) {
			$filters[] = [
				'linkable_to_storage_url' =>
					['operator' => '=', 'values' => [urlencode($this->getBaseUrl())]]
			];
		}

		$params = [
			'filters' => json_encode($filters, JSON_THROW_ON_ERROR),
			'sortBy' => json_encode($sortBy, JSON_THROW_ON_ERROR),
		];
		$searchResult = $this->request($userId, 'work_packages', $params);

		if (isset($searchResult['error'])) {
			return $searchResult;
		}

		if (isset($searchResult['_embedded'], $searchResult['_embedded']['elements'])) {
			foreach ($searchResult['_embedded']['elements'] as $wp) {
				$resultsById[$wp['id']] = $wp;
			}
		}
		return $resultsById;
	}
	/**
	 * authenticated request to get an image from openproject
	 *
	 * @param string $openprojectUserId
	 * @param string $openprojectUserName
	 * @param string $nextcloudUserId
	 * @return array{avatar: string, type?: string}
	 * @throws \OCP\Files\NotFoundException
	 * @throws \OCP\Files\NotPermittedException
	 * @throws \OCP\Lock\LockedException
	 */
	public function getOpenProjectAvatar(
		string $openprojectUserId,
		string $openprojectUserName,
		string $nextcloudUserId
	): array {
		if ($this->config->getAppValue(Application::APP_ID, 'authorization_method', '') === self::AUTH_METHOD_OIDC) {
			$accessToken = $this->getOIDCToken();
		} else {
			$accessToken = $this->config->getUserValue($nextcloudUserId, Application::APP_ID, 'token');
			$this->config->getAppValue(Application::APP_ID, 'openproject_client_id');
			$this->config->getAppValue(Application::APP_ID, 'openproject_client_secret');
		}
		$openprojectUrl = $this->config->getAppValue(Application::APP_ID, 'openproject_instance_url');
		try {
			$response = $this->rawRequest(
				$accessToken, $openprojectUrl, 'users/'.$openprojectUserId.'/avatar'
			);
			$imageMimeType = $response->getHeader('Content-Type');
			$imageData = $response->getBody();

			// Check if the 'Content-Type' header exists
			if (empty($imageMimeType)) {
				throw new OpenprojectAvatarErrorException(
					'The response does not contain an image content-type.'
				);
			}

			// check if response contains image
			if (!@imagecreatefromstring($imageData)) {
				throw new OpenprojectAvatarErrorException(
					'The response contains invalid image data.'
				);
			}

			// check mimetype of response with content-type value
			// Create a temporary file
			$tempImageFile = tempnam(sys_get_temp_dir(), 'image');
			file_put_contents($tempImageFile, $imageData);

			// Get the MIME type of the temporary file
			$imageMimeTypeFromImageData = mime_content_type($tempImageFile);
			unlink($tempImageFile);
			if ($imageMimeType != $imageMimeTypeFromImageData) {
				throw new OpenprojectAvatarErrorException(
					"The content-type header is '$imageMimeType ' but the mime-type of the image is '$imageMimeTypeFromImageData'."
				);
			}
			return [
				'avatar' => $imageData,
				'type' => $imageMimeType ,
			];
		} catch (ServerException | ClientException | ConnectException | OpenprojectAvatarErrorException | Exception $e) {
			$this->logger->debug('Error while getting OpenProject avatar for user ' . $openprojectUserId . ': ' . $e->getMessage(), ['app' => $this->appName]);
			$avatar = $this->avatarManager->getGuestAvatar($openprojectUserName);
			$avatarContent = $avatar->getFile(64)->getContent();
			return ['avatar' => $avatarContent];
		}
	}

	/**
	 * @param string $accessToken
	 * @param string $openprojectUrl
	 * @param string $endPoint
	 * @param array<mixed> $params
	 * @param string $method
	 * @param array<mixed> $options further options to be given to Guzzle see https://docs.guzzlephp.org/en/stable/request-options.html
	 * @return array{error: string} | IResponse
	 */
	public function rawRequest(string $accessToken, string $openprojectUrl,
		string $endPoint, array $params = [],
		string $method = 'GET',
		array $options = []
	) {
		$url = $openprojectUrl . '/api/v3/' . $endPoint;
		if (!isset($options['headers']['Authorization'])) {
			$options['headers']['Authorization'] = 'Bearer ' . $accessToken;
		}
		if (!isset($options['headers']['User-Agent'])) {
			$options['headers']['User-Agent'] = 'Nextcloud OpenProject integration';
		}
		if (count($params) > 0) {
			if ($method === 'GET') {
				// manage array parameters
				$paramsContent = '';
				foreach ($params as $key => $value) {
					if (is_array($value)) {
						foreach ($value as $oneArrayValue) {
							$paramsContent .= $key . '[]=' . urlencode($oneArrayValue) . '&';
						}
						unset($params[$key]);
					}
				}
				$paramsContent .= http_build_query($params);
				$url .= '?' . $paramsContent;
			} else {
				if (isset($params['body'])) {
					$options['body'] = $params['body'];
				}
				if (!isset($options['headers']['Content-Type'])) {
					$options['headers']['Content-Type'] = 'application/json';
				}
			}
		} elseif ($method === 'DELETE') {
			if (!isset($options['headers']['Content-Type'])) {
				$options['headers']['Content-Type'] = 'application/json';
			}
		}

		if ($method === 'GET') {
			$response = $this->client->get($url, $options);
		} elseif ($method === 'POST') {
			$response = $this->client->post($url, $options);
		} elseif ($method === 'PUT') {
			$response = $this->client->put($url, $options);
		} elseif ($method === 'DELETE') {
			$response = $this->client->delete($url, $options);
		} else {
			return ['error' => $this->l10n->t('Bad HTTP method')];
		}
		return $response;
	}

	/**
	 * @param string $userId
	 * @param string $endPoint
	 * @param array<mixed> $params
	 * @param string $method
	 * @return array<mixed>
	 * @throws \OCP\PreConditionNotMetException
	 */
	public function request(string $userId,
		string $endPoint, array $params = [], string $method = 'GET'): array {
		if ($this->config->getAppValue(Application::APP_ID, 'authorization_method', '') === self::AUTH_METHOD_OIDC) {
			$accessToken = $this->getOIDCToken();
		} else {
			$accessToken = $this->config->getUserValue($userId, Application::APP_ID, 'token');
			$refreshToken = $this->config->getUserValue($userId, Application::APP_ID, 'refresh_token');
			$clientID = $this->config->getAppValue(Application::APP_ID, 'openproject_client_id');
			$clientSecret = $this->config->getAppValue(Application::APP_ID, 'openproject_client_secret');
		}
		$openprojectUrl = $this->config->getAppValue(Application::APP_ID, 'openproject_instance_url');
		if (!$openprojectUrl || !OpenProjectAPIService::validateURL($openprojectUrl)) {
			return ['error' => 'OpenProject URL is invalid', 'statusCode' => 500];
		}
		try {
			$response = $this->rawRequest($accessToken, $openprojectUrl, $endPoint, $params, $method);
			if (($method === 'DELETE' || $method === 'POST') &&
				$response->getStatusCode() === Http::STATUS_NO_CONTENT
			) {
				return ['success' => true];
			}
			return json_decode($response->getBody(), true);
		} catch (ServerException | ClientException $e) {
			$response = $e->getResponse();
			$body = (string) $response->getBody();
			// refresh token if it's invalid and we are using oauth
			// response can be : 'OAuth2 token is expired!', 'Invalid token!' or 'Not authorized'
			// This condition applies exclusively to the OAuth2 authorization method and not to OIDC authorization,
			// as token refreshing for OIDC is managed by the 'user_oidc' application.
			if ($response->getStatusCode() === 401 &&
				$this->config->getAppValue(Application::APP_ID, 'authorization_method', '') === self::AUTH_METHOD_OAUTH
			) {
				$this->logger->info('Trying to REFRESH the access token', ['app' => $this->appName]);
				// try to refresh the token
				$result = $this->requestOAuthAccessToken($openprojectUrl, [
					'client_id' => $clientID,
					'client_secret' => $clientSecret,
					'grant_type' => 'refresh_token',
					'refresh_token' => $refreshToken,
				], 'POST');
				if (isset($result['refresh_token'])) {
					$refreshToken = $result['refresh_token'];
					$this->config->setUserValue(
						$userId, Application::APP_ID, 'refresh_token', $refreshToken
					);
				}
				if (isset($result['access_token'])) {
					$accessToken = $result['access_token'];
					$this->config->setUserValue($userId, Application::APP_ID, 'token', $accessToken);
					// retry the request with new access token
					return $this->request($userId, $endPoint, $params, $method);
				}
			}
			// try to get the error in the response
			$this->logger->warning('OpenProject API error : '.$e->getMessage(), ['app' => $this->appName]);
			$decodedBody = json_decode($body, true);
			if ($decodedBody && isset($decodedBody['message'])) {
				if (gettype($decodedBody['message']) === 'array') {
					// the OpenProject API sometimes responds with an array as message
					// e.g. when sending a not-existing workpackage as resourceId filter
					// to /api/v3/notifications/read_ian
					// see POST /api/v3/notifications/read_ian in https://community.openproject.org/api/docs
					$message = implode(' ', $decodedBody['message']);
				} else {
					$message = $decodedBody['message'];
				}
				$this->logger->warning('OpenProject API error : '. $message, ['app' => $this->appName]);
			}
			return [
				'error' => $response->getBody(),
				'message' => $e->getMessage(),
				'statusCode' => $response->getStatusCode(),
			];
		} catch (ConnectException $e) {
			$this->logger->warning('OpenProject connection error : '.$e->getMessage(), ['app' => $this->appName]);
			return [
				'error' => $e->getMessage(),
				'statusCode' => 404,
			];
		} catch (Exception $e) {
			$this->logger->critical('OpenProject error : '.$e->getMessage(), ['app' => $this->appName]);
			return [
				'error' => $e->getMessage(),
				'statusCode' => 500,
			];
		}
	}

	/**
	 * @param string $url
	 * @param array<mixed> $params passed to `http_build_query` for GET requests, else send as body
	 * @param string $method
	 * @return array<mixed>
	 */
	public function requestOAuthAccessToken(string $url, array $params = [], string $method = 'GET'): array {
		try {
			$url = $url . '/oauth/token';
			$options = [
				'headers' => [
					'User-Agent' => 'Nextcloud OpenProject integration',
				]
			];

			if (count($params) > 0) {
				if ($method === 'GET') {
					$paramsContent = http_build_query($params);
					$url .= '?' . $paramsContent;
				} else {
					$options['body'] = $params;
				}
			}

			if ($method === 'GET') {
				$response = $this->client->get($url, $options);
			} elseif ($method === 'POST') {
				$response = $this->client->post($url, $options);
			} elseif ($method === 'PUT') {
				$response = $this->client->put($url, $options);
			} elseif ($method === 'DELETE') {
				$response = $this->client->delete($url, $options);
			} else {
				return ['error' => $this->l10n->t('Bad HTTP method')];
			}
			$body = $response->getBody();
			$respCode = $response->getStatusCode();

			if ($respCode >= 400) {
				return ['error' => $this->l10n->t('OAuth access token refused')];
			} else {
				return json_decode($body, true);
			}
		} catch (Exception $e) {
			$this->logger->warning('OpenProject OAuth error : '.$e->getMessage(), ['app' => $this->appName]);
			return ['error' => $e->getMessage()];
		}
	}

	public static function validateURL(string $url): bool {
		return filter_var($url, FILTER_VALIDATE_URL) &&
			preg_match('/^https?/', $url);
	}

	/**
	 * validates the provided data for integration setup
	 *
	 * @param array<string, string|null|bool> $values
	 * @param bool $allKeysMandatory
	 *
	 * @return bool
	 * @throws InvalidArgumentException
	 *
	 */
	public static function validateIntegrationSetupInformation(?array $values, bool $allKeysMandatory = true): bool {
		if (!$values) {
			throw new InvalidArgumentException("The data is not a valid JSON.");
		}
		$opKeys = [
			'openproject_instance_url',
			'openproject_client_id',
			'openproject_client_secret',
			'default_enable_navigation',
			'default_enable_unified_search',
			'setup_project_folder',
			'setup_app_password'
		];

		if ($allKeysMandatory) {
			foreach ($opKeys as $key) {
				if (!array_key_exists($key, $values)) {
					throw new InvalidArgumentException('invalid key');
				}
			}
			// for complete setup these both have to be true
			if (($values['setup_project_folder'] === true && $values['setup_app_password'] === false) ||
				($values['setup_project_folder'] === false && $values['setup_app_password'] === true)
			) {
				throw new InvalidArgumentException('invalid data');
			}
		} else {
			foreach (array_keys($values) as $key) {
				if (!in_array($key, $opKeys)) {
					throw new InvalidArgumentException('invalid key');
				}
			}
		}

		foreach ($values as $key => $value) {
			if ($key === 'openproject_instance_url' && !OpenProjectAPIService::validateURL((string)$value)) {
				throw new InvalidArgumentException('invalid data');
			}

			if ($key === 'default_enable_navigation' || $key === 'default_enable_unified_search' || $key === 'setup_project_folder' || $key === 'setup_app_password') {
				if (!is_bool($value)) {
					throw new InvalidArgumentException('invalid data');
				}
				continue;
			}
			// validate other key
			if ($value === '' || !is_string($value)) {
				throw new InvalidArgumentException('invalid data');
			}
		}
		return true;
	}

	/**
	 * authenticated request to get status of a work package
	 *
	 * @param string $userId
	 * @param string $statusId
	 * @return string[]
	 */
	public function getOpenProjectWorkPackageStatus(string $userId, string $statusId): array {
		$result = $this->cache->get(Application::APP_ID . '/statuses/' . $statusId);
		if ($result !== null) {
			return $result;
		}
		$result = $this->request($userId, 'statuses/' . $statusId);
		if (!isset($result['id'])) {
			return ['error' => 'Malformed response'];
		}

		$this->cache->set(
			Application::APP_ID . '/statuses/' . $statusId,
			$result,
			CACHE_TTL
		);
		return $result;
	}

	/**
	 * authenticated request to get status of a work package
	 *
	 * @param string $userId
	 * @param string $typeId
	 * @return string[]
	 */
	public function getOpenProjectWorkPackageType(string $userId, string $typeId): array {
		$result = $this->cache->get(Application::APP_ID . '/types/' . $typeId);
		if ($result !== null) {
			return $result;
		}
		$result = $this->request($userId, 'types/' . $typeId);
		if (!isset($result['id'])) {
			return ['error' => 'Malformed response'];
		}
		$this->cache->set(
			Application::APP_ID . '/types/' . $typeId,
			$result,
			CACHE_TTL
		);

		return $result;
	}

	/**
	 * @param IConfig $config
	 * @param IURLGenerator $urlGenerator
	 * @return string
	 * generates an oauth url to OpenProject containing openproject_client_id & redirect_uri as parameter
	 * please note that the state parameter is still missing, that needs to be generated dynamically
	 * and saved to the DB before calling the OAuth URI
	 * @throws Exception
	 */
	public static function getOpenProjectOauthURL(IConfig $config, IURLGenerator $urlGenerator): string {
		if (!self::isAdminConfigOk($config)) {
			throw new \Exception('OpenProject admin config is not valid!');
		}
		$clientID = $config->getAppValue(Application::APP_ID, 'openproject_client_id');
		$oauthUrl = $config->getAppValue(Application::APP_ID, 'openproject_instance_url');

		// remove trailing slash from the oauthUrl if present
		if (substr($oauthUrl, -1) === '/') {
			$oauthUrl = substr($oauthUrl, 0, -1);
		}

		return $oauthUrl .
			'/oauth/authorize' .
			'?client_id=' . $clientID .
			'&redirect_uri=' . urlencode(self::getOauthRedirectUrl($urlGenerator)) .
			'&response_type=code';
	}

	public static function getOauthRedirectUrl(IURLGenerator $urlGenerator): string {
		return $urlGenerator->getAbsoluteURL(
			'/index.php/apps/' . Application::APP_ID . '/oauth-redirect'
		);
	}

	/**
	 * @param string $userId
	 * @param int $fileId
	 * @return \OCP\Files\Node
	 * @throws NotPermittedException
	 * @throws \OC\User\NoUserException
	 * @throws NotFoundException
	 */
	public function getNode($userId, $fileId) {
		$userFolder = $this->storage->getUserFolder($userId);

		$file = $userFolder->getById($fileId);
		if (isset($file[0]) && $file[0] instanceof Node) {
			return $file[0];
		}
		throw new NotFoundException();
	}

	/**
	 *
	 * @param array<mixed> $values An array containing the following keys:
	 *        - "workpackageId" (int): The ID of the work package.
	 *        - "fileinfo" (array):  An array of file information with the following keys:
	 *            - "id" (int): File id of the file
	 *            - "name" (string): Name of the file
	 * @param string $userId
	 *
	 * @return array<int>
	 * @throws NotFoundException
	 * @throws \OCP\PreConditionNotMetException
	 * @throws NotPermittedException
	 * @throws OpenprojectErrorException
	 * @throws \OC\User\NoUserException
	 * @throws OpenprojectResponseException
	 * @throws InvalidArgumentException
	 * @throws InvalidPathException
	 * @throws \JsonException
	 *
	 */
	public function linkWorkPackageToFile(
		array $values,
		string $userId
	): array {
		$allowedKeys = [
			'workpackageId',
			'fileinfo'
		];
		foreach (array_keys($values) as $key) {
			if (!in_array($key, $allowedKeys)) {
				throw new InvalidArgumentException('invalid key');
			}
		}
		if (!is_int($values['workpackageId']) || !is_array($values['fileinfo']) || empty($values['fileinfo'])) {
			throw new InvalidArgumentException('invalid data');
		}
		$fileInfos = $values['fileinfo'];
		$elements = [];
		// multiple files can also be linked to a single work package
		foreach ($fileInfos as $fileInfo) {
			if (!key_exists('id', $fileInfo) || !key_exists('name', $fileInfo) || !is_int($fileInfo['id']) || $fileInfo['name'] === '' || !is_string($fileInfo['name'])) {
				throw new InvalidArgumentException('invalid data');
			}
			$fileId = $fileInfo["id"];
			$fileName = $fileInfo["name"];
			$file = $this->getNode($userId, $fileId);
			if (!$file->isReadable()) {
				throw new NotPermittedException();
			}
			$element = [
				'originData' => [
					'id' => $fileId,
					'name' => $fileName,
					'mimeType' => $file->getMimeType(),
					'createdAt' => gmdate('Y-m-d\TH:i:s.000\Z', $file->getCreationTime()),
					'lastModifiedAt' => gmdate('Y-m-d\TH:i:s.000\Z', $file->getMTime()),
					'createdByName' => '',
					'lastModifiedByName' => ''
				],
				'_links' => [
					'storageUrl' => [
						'href' => $this->getBaseUrl()
					]
				]
			];
			$elements[] = $element;
		}

		$body = [
			'_type' => 'Collection',
			'_embedded' => [
				'elements' => $elements
			]
		];

		$params['body'] = json_encode($body, JSON_THROW_ON_ERROR);
		$result = $this->request(
			$userId, 'work_packages/' . $values["workpackageId"] . '/file_links', $params, 'POST'
		);

		if (isset($result['error'])) {
			throw new OpenprojectErrorException($result['error'], $result['statusCode']);
		}
		if (
			!isset($result['_type']) ||
			$result['_type'] !== 'Collection' ||
			!isset($result['_embedded']) ||
			!isset($result['_embedded']['elements'])
		) {
			throw new OpenprojectResponseException('Malformed response');
		}
		$fileIds = [];
		for ($i = 0; $i < count($fileInfos); $i++) {
			if (
				!isset($result['_embedded']['elements'][$i]) ||
				!isset($result['_embedded']['elements'][$i]['id'])
			) {
				throw new OpenprojectResponseException('Malformed response');
			}
			$fileIds [] = $result['_embedded']['elements'][$i]['id'];
		}
		return $fileIds;
	}

	/**
	 * @throws OpenprojectErrorException
	 * @throws PreConditionNotMetException
	 * @throws Exception
	 * @return array<mixed>
	 */
	public function markAllNotificationsOfWorkPackageAsRead(
		int $workpackageId, string $userId
	) {
		$filters[] = [
			'resourceId' =>
				['operator' => '=', 'values' => [(string)$workpackageId]]
		];
		$params['body'] = '';
		$fullUrl = 'notifications/read_ian?filters=' . urlencode(json_encode($filters, JSON_THROW_ON_ERROR));

		$result = $this->request(
			$userId, $fullUrl, $params, 'POST'
		);
		if (isset($result['error'])) {
			throw new OpenprojectErrorException($result['error']);
		}
		return $result;
	}
	/**
	 * @param int $workpackageId
	 * @param string $userId
	 * @return array<mixed>
	 * @throws NotFoundException
	 * @throws OpenprojectErrorException
	 * @throws OpenprojectResponseException
	 */
	public function getWorkPackageFileLinks(int $workpackageId, string $userId): array {
		$result = $this->request(
			$userId, 'work_packages/' . $workpackageId. '/file_links'
		);
		if (isset($result['error'])) {
			throw new OpenprojectErrorException($result['error']);
		}
		if (
			!isset($result['_type']) ||
			$result['_type'] !== 'Collection' ||
			!isset($result['_embedded']) ||
			!isset($result['_embedded']['elements'])
		) {
			throw new OpenprojectResponseException('Malformed response');
		}
		return $result['_embedded']['elements'];
	}

	/**
	 * @param int $fileLinkId
	 * @param string $userId
	 * @return array<mixed>
	 * @throws NotFoundException
	 * @throws OpenprojectErrorException|OpenprojectResponseException
	 */
	public function deleteFileLink(int $fileLinkId, string $userId): array {
		$result = $this->request(
			$userId, 'file_links/' . $fileLinkId, [""], 'DELETE'
		);
		if (isset($result['error'])) {
			throw new OpenprojectErrorException($result['error']);
		}
		if (!isset($result['success'])) {
			throw new OpenprojectResponseException('Malformed response');
		}
		return $result;
	}

	/**
	 * checks if every admin config for oauth2 based authorization variables are set
	 * checks if the oauth instance url is valid
	 *
	 * @param IConfig $config
	 * @return bool
	 */
	public static function isAdminConfigOkForOauth2(IConfig $config):bool {
		$clientId = $config->getAppValue(Application::APP_ID, 'openproject_client_id');
		$clientSecret = $config->getAppValue(Application::APP_ID, 'openproject_client_secret');
		$oauthInstanceUrl = $config->getAppValue(Application::APP_ID, 'openproject_instance_url');
		$checkIfConfigIsSet = !!($clientId) && !!($clientSecret) && !!($oauthInstanceUrl);
		if (!$checkIfConfigIsSet) {
			return false;
		} else {
			return self::validateURL($oauthInstanceUrl);
		}
	}

	/**
	 * checks if every admin config for oidc based authorization variables are set
	 * checks if the oauth instance url is valid
	 *
	 * @param IConfig $config
	 * @return bool
	 */
	public static function isAdminConfigOkForOIDCAuth(IConfig $config):bool {
		$oidcProvider = $config->getAppValue(Application::APP_ID, 'oidc_provider');
		$targetAudienceClientId = $config->getAppValue(Application::APP_ID, 'targeted_audience_client_id');
		$oauthInstanceUrl = $config->getAppValue(Application::APP_ID, 'openproject_instance_url');
		$checkIfConfigIsSet = !!($oidcProvider) && !!($targetAudienceClientId) && !!($oauthInstanceUrl);
		if (!$checkIfConfigIsSet) {
			return false;
		} else {
			return self::validateURL($oauthInstanceUrl);
		}
	}


	/**
	 * returns overall admin config status whether it be 'oidc' or 'oauth2'
	 *
	 * @return bool
	 */
	public static function isAdminConfigOk(IConfig $config): bool {
		$authMethod = $config->getAppValue(Application::APP_ID, 'authorization_method');
		if ($authMethod === self::AUTH_METHOD_OAUTH) {
			return self::isAdminConfigOkForOauth2($config);
		} elseif ($authMethod === self::AUTH_METHOD_OIDC) {
			return self::isAdminConfigOkForOIDCAuth($config);
		}
		return false;
	}

	/**
	 * makes sure the URL has no extra slashes
	 */
	public static function sanitizeUrl(
		string $url, bool $trailingSlash = false
	): string {
		if ($trailingSlash === true) {
			$url = $url . "/";
		} else {
			$url = \rtrim($url, "/");
		}
		$url = \preg_replace("/([^:]\/)\/+/", '$1', $url);
		return $url;
	}

	/**
	 * Sends a POST request to the OpenProject API server to revoke an OAuth token for the provided client
	 *
	 * @param string $userUID the uid of the user to revoke the token for
	 * @param string $openProjectUrl the url of the openproject instance
	 * @param string $accessToken the refresh token to be revoked
	 * @param string $clientId the client id of the OAuth app
	 * @param string $clientSecret the client secret of the OAuth app
	 *
	 * @return void
	 * @throws OpenprojectErrorException
	 * @throws ConnectException
	 */
	public function revokeUserOAuthToken(
		string $userUID,
		string $openProjectUrl,
		string $accessToken,
		string $clientId,
		string $clientSecret
	): void {
		$options = [
			'headers' => [
				'User-Agent' => 'Nextcloud OpenProject integration',
				'Content-Type' => 'application/x-www-form-urlencoded',
				'Authorization' => 'Basic ' . \base64_encode($clientId . ':' . $clientSecret)
			]
		];
		try {
			$response = $this->client->post(
				rtrim($openProjectUrl, "/") . '/oauth/revoke' . '?token=' . $accessToken,
				$options
			);
			$body = $response->getBody();
			$respCode = $response->getStatusCode();
			if ($respCode !== 200) {
				throw new OpenprojectErrorException('Failed to revoke token in OpenProject for user "'. $userUID . '".\nResponse body: "' . $body . '"');
			}
		} catch (ConnectException $e) {
			throw new ConnectException(
				'Could not revoke token in OpenProject for user "' .
				$userUID . '".\n Message: "' . $e->getMessage() . '"',
				$e->getRequest()
			);
		} catch (ServerException | ClientException | Exception $e) {
			throw new OpenprojectErrorException('Could not revoke token in OpenProject for user "' . $userUID . '".\n Message: "' . $e->getMessage() . '"');
		}
	}

	/**
	 * @throws OpenprojectGroupfolderSetupConflictException
	 */
	public function isSystemReadyForProjectFolderSetUp(): bool {
		if ($this->userManager->userExists(Application::OPEN_PROJECT_ENTITIES_NAME) && $this->groupManager->groupExists(Application::OPEN_PROJECT_ENTITIES_NAME)) {
			if (!$this->isGroupfoldersAppEnabled()) {
				throw new \Exception('The "Group folders" app is not installed');
			}
		}
		if ($this->userManager->userExists(Application::OPEN_PROJECT_ENTITIES_NAME)) {
			throw new OpenprojectGroupfolderSetupConflictException('The user "'. Application::OPEN_PROJECT_ENTITIES_NAME .'" already exists');
		} elseif ($this->groupManager->groupExists(Application::OPEN_PROJECT_ENTITIES_NAME)) {
			throw new OpenprojectGroupfolderSetupConflictException('The group "'. Application::OPEN_PROJECT_ENTITIES_NAME .'" already exists');
		} elseif (!$this->isGroupfoldersAppEnabled()) {
			throw new \Exception('The "Group folders" app is not installed');
		} elseif ($this->isOpenProjectGroupfolderCreated()) {
			throw new OpenprojectGroupfolderSetupConflictException(
				'The group folder name "' .
				Application::OPEN_PROJECT_ENTITIES_NAME .
				'" already exists'
			);
		}
		return true;
	}

	/**
	 * checks whether the whole setup of the managed project folders is completed
	 *
	 * @return bool
	 */
	public function isProjectFoldersSetupComplete(): bool {
		return (
			$this->userManager->userExists(Application::OPEN_PROJECT_ENTITIES_NAME) &&
			$this->groupManager->groupExists(Application::OPEN_PROJECT_ENTITIES_NAME) &&
			$this->isUserPartOfAndAdminOfGroup() &&
			$this->isGroupfoldersAppEnabled() &&
			$this->isGroupfolderAppCorrectlySetup()
		);
	}

	/**
	 * @return array<mixed>
	 */
	public function getProjectFolderSetupInformation(): array {
		$status = $this->isProjectFoldersSetupComplete();
		$errorMessage = null;
		if (!$status) {
			try {
				$this->isSystemReadyForProjectFolderSetUp();
			} catch (Exception $e) {
				$errorMessage = $e->getMessage();
			}
		}
		if ($errorMessage !== null) {
			return [
				'status' => $status,
				'errorMessage' => $errorMessage
			];
		}
		return [
			'status' => $status
		];
	}

	/**
	 * @throws NotPermittedException
	 * @throws NotFoundException
	 * @throws NoUserException
	 */
	public function createGroupfolder(): void {
		$groupfoldersFolderManager = Server::get(FolderManager::class);
		$folderId = $groupfoldersFolderManager->createFolder(
			Application::OPEN_PROJECT_ENTITIES_NAME
		);

		// this also works if the group does not exist
		$groupfoldersFolderManager->addApplicableGroup(
			$folderId, Application::OPEN_PROJECT_ENTITIES_NAME
		);

		$groupfoldersFolderManager->setFolderACL($folderId, true);

		// this also works if the user does not exist
		$groupfoldersFolderManager->setManageACL(
			$folderId,
			'user',
			Application::OPEN_PROJECT_ENTITIES_NAME,
			true
		);
	}

	public function getGroupFolderManager(): FolderManager {
		$groupfoldersFolderManager = Server::get(FolderManager::class);
		return $groupfoldersFolderManager;
	}

	public function isOpenProjectGroupfolderCreated(): bool {
		$groupfoldersFolderManager = $this->getGroupFolderManager();
		$folders = $groupfoldersFolderManager->getAllFolders();
		foreach ($folders as $folder) {
			if ($folder['mount_point'] === Application::OPEN_PROJECT_ENTITIES_NAME) {
				return true;
			}
		}
		return false;
	}

	public function isGroupfoldersAppEnabled(): bool {
		$user = $this->userManager->get(Application::OPEN_PROJECT_ENTITIES_NAME);
		return (
			class_exists('\OCA\GroupFolders\Folder\FolderManager') &&
			$this->appManager->isEnabledForUser(
				'groupfolders',
				$user
			)
		);
	}

	/**
	 * @param $auditLogMessage
	 * @return void
	 */
	public function logToAuditFile($auditLogMessage): void {
		if ($this->isAdminAuditConfigSetCorrectly()) {
			$this->auditLogger = new AuditLogger($this->logFactory, $this->config);
			$this->auditLogger->info($auditLogMessage,
				['app' => 'admin_audit']
			);
		}
	}

	public function isAdminAuditConfigSetCorrectly(): bool {
		$logLevel = $this->config->getSystemValue('loglevel');
		$configAuditFile = $this->config->getSystemValue('logfile_audit');
		$logCondition = $this->config->getSystemValue('log.condition');
		// All the above config should be satisfied in order for admin audit log for the integration application
		// if any of the config is failed to be set then we are not able to send the admin audit logging in the audit.log file
		return (
			$this->appManager->isInstalled('admin_audit') &&
			$configAuditFile === $this->config->getSystemValue('datadirectory', \OC::$SERVERROOT . '/data') . '/audit.log' &&
			(isset($logCondition["apps"]) && in_array('admin_audit', $logCondition["apps"])) &&
			$logLevel >= 1
		);
	}

	public function isTermsOfServiceAppEnabled(): bool {
		return (
			class_exists('\OCA\TermsOfService\Db\Entities\Signatory') &&
			class_exists('\OCA\TermsOfService\Db\Mapper\SignatoryMapper') &&
			class_exists('\OCA\TermsOfService\Db\Mapper\TermsMapper') &&
			$this->appManager->isInstalled(
				'terms_of_service',
			)
		);
	}

	public function isServerSideEncryptionEnabled(): bool {
		$isEncryptionForHomeStorageEnabled = $this->config->getAppValue('encryption', 'encryptHomeStorage', '0') === '1';
		return (
			$this->appManager->isInstalled('encryption') &&
			$this->encryptionManager->isEnabled() &&
			$isEncryptionForHomeStorageEnabled
		);
	}

	/**
	 * @return array<mixed>
	 */
	public function getAllTermsOfServiceAvailable(): array {
		$termsMapper = new TermsMapper($this->db);
		return $termsMapper->getTerms();
	}

	/**
	 * @return array<mixed>
	 */
	public function getAllTermsOfServiceSignedByUserOpenProject($signatoryMapper): array {
		$alreadySignedTermsIdForUserOpenProject = [];
		if ($this->userManager->userExists(Application::OPEN_PROJECT_ENTITIES_NAME)) {
			$user = $this->userManager->get(Application::OPEN_PROJECT_ENTITIES_NAME);
			// get all the signed TOS for user "OpenProject"
			$signatoriesByUserOpenProject = $signatoryMapper->getSignatoriesByUser($user);
			if ($signatoriesByUserOpenProject) {
				foreach ($signatoriesByUserOpenProject as $signature) {
					$alreadySignedTermsIdForUserOpenProject[] = $signature->getTermsId();
				}
			}
		}
		return $alreadySignedTermsIdForUserOpenProject;
	}

	/**
	 * @return bool
	 */
	public function isAllTermsOfServiceSignedForUserOpenProject($signatoryMapper = null): bool {
		if ($this->isTermsOfServiceAppEnabled() && $this->userManager->userExists(Application::OPEN_PROJECT_ENTITIES_NAME)) {
			if ($signatoryMapper === null) {
				$signatoryMapper = new SignatoryMapper($this->db);
			}
			$terms = $this->getAllTermsOfServiceAvailable();
			$alreadySignedTermsIdForUserOpenProject = $this->getAllTermsOfServiceSignedByUserOpenProject($signatoryMapper);
			foreach ($terms as $term) {
				$termId = $term->id;
				if (!in_array($termId, $alreadySignedTermsIdForUserOpenProject)) {
					return false;
				}
			}
		}
		return true;
	}

	/**
	 * @throws \OCP\DB\Exception
	 */
	public function signTermsOfServiceForUserOpenProject(): void {
		$signatoryMapper = new SignatoryMapper($this->db);
		// get all the available terms of services
		$terms = $this->getAllTermsOfServiceAvailable();
		$alreadySignedTermsIdForUserOpenProject = $this->getAllTermsOfServiceSignedByUserOpenProject($signatoryMapper);
		foreach ($terms as $term) {
			$termId = $term->id;
			// sign only not signed TOS for user "OpenProject"
			if (!in_array($termId, $alreadySignedTermsIdForUserOpenProject)) {
				$signatory = new Signatory();
				$signatory->setUserId(Application::OPEN_PROJECT_ENTITIES_NAME);
				$signatory->setTermsId($termId);
				$signatory->setTimestamp(time());
				$signatoryMapper->insert($signatory);
			}
		}
	}

	public function isUserPartOfAndAdminOfGroup():bool {
		if ($this->groupManager->isInGroup(
			Application::OPEN_PROJECT_ENTITIES_NAME,
			Application::OPEN_PROJECT_ENTITIES_NAME
		) &&
			$this->subAdminManager->isSubAdminOfGroup(
				$this->userManager->get(Application::OPEN_PROJECT_ENTITIES_NAME),
				$this->groupManager->get(Application::OPEN_PROJECT_ENTITIES_NAME)
			)) {
			return true;
		}
		return false;
	}

	/**
	 * checks:
	 * - if the group names OpenProject is managing a folder called OpenProject
	 * - if the permissions are set correctly
	 * - if the ACL is enabled and can be managed by the user OpenProject
	 * @return bool
	 * @throws \OCP\DB\Exception
	 */
	private function isGroupfolderAppCorrectlySetup():bool {
		$groupFolderManager = $this->getGroupFolderManager();
		$folders = $groupFolderManager->getFoldersForGroup(Application::OPEN_PROJECT_ENTITIES_NAME);
		foreach ($folders as $folder) {
			if (
				$folder['mount_point'] === Application::OPEN_PROJECT_ENTITIES_NAME &&
				$folder['permissions'] === 31 &&
				$folder['acl'] === true
			) {
				if ($groupFolderManager->canManageACL(
					$folder['folder_id'],
					$this->userManager->get(Application::OPEN_PROJECT_ENTITIES_NAME)
				)) {
					return true;
				} else {
					return false;
				}
			}
		}
		return false;
	}

	/**
	 * @return int
	 */
	public function getPasswordLength(): int {
		$passLengthSet = (int) $this->config->getAppValue('password_policy', 'minLength', '0');
		return $passLengthSet === 0 ? 72 : max(72, $passLengthSet);
	}

	/**
	 * @return string
	 */
	public function generateAppPasswordTokenForUser(): string {
		$user = $this->userManager->get(Application::OPEN_PROJECT_ENTITIES_NAME);
		$userID = $user->getUID();
		$token = $this->random->generate(self::getPasswordLength(), ISecureRandom::CHAR_ALPHANUMERIC.ISecureRandom::CHAR_SYMBOLS);
		$generatedToken = $this->tokenProvider->generateToken(
			$token,
			$userID,
			$userID,
			null,
			Application::OPEN_PROJECT_ENTITIES_NAME,
			1 // type 0 => Temporary app password token where as type 1 => Permanent app password token
		);
		$this->eventDispatcher->dispatchTyped(
			new AppPasswordCreatedEvent($generatedToken)
		);
		return $token;
	}

	/**
	 * Deletes the created app password for user OpenProject
	 *
	 * @return void
	 */
	public function deleteAppPassword(): void {
		if ($this->hasAppPassword()) {
			$tokens = $this->tokenProvider->getTokenByUser(Application::OPEN_PROJECT_ENTITIES_NAME);
			foreach ($tokens as $token) {
				if ($token->getName() === Application::OPEN_PROJECT_ENTITIES_NAME) {
					$this->tokenProvider->invalidateTokenById(Application::OPEN_PROJECT_ENTITIES_NAME, $token->getId());
					$this->logToAuditFile(
						"Application password for user 'OpenProject has been deleted' in application " . Application::APP_ID
					);
				}
			}
		}
	}

	/**
	 * check if app password for user OpenProject is already created
	 *
	 * @return bool
	 */
	public function hasAppPassword(): bool {
		$tokens = $this->tokenProvider->getTokenByUser(Application::OPEN_PROJECT_ENTITIES_NAME);
		foreach ($tokens as $token) {
			if ($token->getName() === Application::OPEN_PROJECT_ENTITIES_NAME) {
				return true;
			}
		}
		return false;
	}

	/**
	 * @param string $userId
	 * @param int $wpId
	 *
	 * @return array<mixed>|null
	 */
	public function getWorkPackageInfo(string $userId, int $wpId): ?array {
		if ($this->config->getAppValue(Application::APP_ID, 'authorization_method', '') === self::AUTH_METHOD_OIDC) {
			$accessToken = $this->getOIDCToken();
		} else {
			$accessToken = $this->config->getUserValue($userId, Application::APP_ID, 'token');
		}
		if ($accessToken) {
			$searchResult = $this->searchWorkPackage($userId, null, null, false, $wpId);
			if (isset($searchResult['error'])) {
				return null;
			}
			$result = [];
			$result['title'] = $this->getSubline($searchResult[0]);
			$result['description'] = $this->getMainText($searchResult[0]);
			$result['imageUrl'] = $this->getOpenProjectUserAvatarUrl($searchResult[0]);
			$result['entry'] = $searchResult[0];
			return $result;
		}
		return null;
	}

	/**
	 * @param array<mixed> $entry
	 * @return string
	 */
	public function getMainText(array $entry): string {
		$workPackageType = isset($entry['_links'], $entry['_links']['type'], $entry['_links']['type']['title'])
			? strtoupper($entry['_links']['type']['title'])
			: '';
		$subject = $entry['subject'] ?? '';
		return $workPackageType . ": " . $subject;
	}

	/**
	 * @param array<mixed> $entry
	 * @return string
	 */
	public function getOpenProjectUserAvatarUrl(array $entry): string {
		$userIdURL = isset($entry['_links'], $entry['_links']['assignee'], $entry['_links']['assignee']['href'])
			? $entry['_links']['assignee']['href']
			: '';
		$userName = isset($entry['_links'], $entry['_links']['assignee'], $entry['_links']['assignee']['title'])
			? $entry['_links']['assignee']['title']
			: '';
		$userId = preg_replace('/.*\//', "", $userIdURL);
		return $this->urlGenerator->linkToOCSRouteAbsolute(
			Application::APP_ID . '.openProjectAPI.getOpenProjectAvatar',
			[
				'apiVersion' => 'v1',
				'userId' => $userId,
				'userName' => $userName,
			]
		);
	}

	/**
	 * @param array<mixed> $entry
	 * @return string
	 */
	public function getSubline(array $entry): string {
		$workPackageID = $entry['id'] ?? '';
		$status = isset($entry['_links'], $entry['_links']['status'], $entry['_links']['status']['title'])
			? '[' . $entry['_links']['status']['title'] . '] '
			: '';
		$projectTitle = isset($entry['_links'], $entry['_links']['project'], $entry['_links']['project']['title'])
			? $entry['_links']['project']['title']
			: '';
		return "#" . $workPackageID . " " . $status . $projectTitle;
	}

	/**
	 * @param array<mixed> $entry
	 * @param string $url
	 * @return string
	 */
	public function getLinkToOpenProject(array $entry, string $url): string {
		$projectId = isset($entry['_links'], $entry['_links']['project'], $entry['_links']['project']['href'])
			? preg_replace('/.*\//', '', $entry['_links']['project']['href'])
			: '';
		return ($projectId !== '')
			? $url . '/projects/' . $projectId . '/work_packages/' . $entry['id'] . '/activity'
			: '';
	}

	/**
	 * @param string $userId
	 * @param string|null $searchQuery
	 *
	 * @return array<mixed>
	 *
	 * @throws OpenprojectErrorException
	 * @throws OpenprojectResponseException|PreConditionNotMetException|\JsonException
	 */
	public function getAvailableOpenProjectProjects(string $userId, string $searchQuery = null): array {
		$resultsById = [];
		$filters = [];
		if ($searchQuery) {
			$filters[] = ['typeahead' => ['operator' => '**', 'values' => [$searchQuery]]];
		}
		$filters[] = [
			'storageUrl' =>
				['operator' => '=', 'values' => [$this->getBaseUrl()]],
			'userAction' =>
				['operator' => '&=', 'values' => ["file_links/manage", "work_packages/create"]]
		];
		$params = [
			'filters' => json_encode($filters, JSON_THROW_ON_ERROR),
			'pageSize' => 100
		];
		$result = $this->request($userId, 'work_packages/available_projects', $params);
		if (isset($result['error'])) {
			throw new OpenprojectErrorException($result['error'], $result['statusCode']);
		}
		if (
			!isset($result['_embedded']) ||
			!isset($result['_embedded']['elements'])
		) {
			throw new OpenprojectResponseException('Malformed response');
		}
		foreach ($result['_embedded']['elements'] as $project) {
			$resultsById[$project['id']] = $project;
		}
		return $resultsById;
	}

	/**
	 * @param string $userId
	 * @param string $projectId
	 * @param array<mixed> $body
	 *
	 * @return array<string,mixed>
	 * @throws OpenprojectResponseException|PreConditionNotMetException|OpenprojectErrorException|\JsonException
	 */
	public function getOpenProjectWorkPackageForm(string $userId, string $projectId, array $body): array {
		$params['body'] = json_encode($body, JSON_THROW_ON_ERROR);
		$result = $this->request($userId, 'projects/'.$projectId.'/work_packages/form', $params, 'POST');
		if (isset($result['error'])) {
			throw new OpenprojectErrorException($result['error'], $result['statusCode']);
		}
		if (
			!isset($result['_type']) ||
			$result['_type'] !== 'Form' ||
			!isset($result['_embedded']) ||
			!isset($result['_embedded']['payload']) ||
			!isset($result['_embedded']['schema'])
		) {
			throw new OpenprojectResponseException('Malformed response');
		}
		return $result['_embedded'];
	}

	/**
	 * @param string $userId
	 * @param string $projectId
	 *
	 * @return array<mixed>
	 * @throws OpenprojectResponseException|PreConditionNotMetException|OpenprojectErrorException
	 */
	public function getAvailableAssigneesOfAProject(string $userId, string $projectId): array {
		$result = $this->request($userId, 'projects/'.$projectId.'/available_assignees');
		if (isset($result['error'])) {
			throw new OpenprojectErrorException($result['error'], $result['statusCode']);
		}
		if (
			!isset($result['_type']) ||
			$result['_type'] !== 'Collection' ||
			!isset($result['_embedded']) ||
			!isset($result['_embedded']['elements'])
		) {
			throw new OpenprojectResponseException('Malformed response');
		}
		return $result['_embedded']['elements'];
	}

	/**
	 * @param string $userId
	 * @param array<mixed> $body
	 *
	 * @return array<mixed>
	 * @throws OpenprojectResponseException|PreConditionNotMetException|OpenprojectErrorException|\JsonException
	 */
	public function createWorkPackage(string $userId, array $body): array {
		$params['body'] = json_encode($body, JSON_THROW_ON_ERROR);
		$result = $this->request($userId, 'work_packages', $params, 'POST');
		if (isset($result['error'])) {
			throw new OpenprojectErrorException($result['error'], $result['statusCode']);
		}
		if (
			!isset($result['_type']) ||
			$result['_type'] !== 'WorkPackage' ||
			!isset($result['_embedded']) ||
			!isset($result['id'])
		) {
			throw new OpenprojectResponseException('Malformed response');
		}
		return $result;
	}

	/**
	 * @param string $userId
	 *
	 * @return array<mixed>
	 * @throws OpenprojectErrorException
	 * @throws OpenprojectResponseException|PreConditionNotMetException
	 */
	public function getOpenProjectConfiguration(string $userId): array {
		$result = $this->request(
			$userId, '/configuration'
		);

		if (isset($result['error'])) {
			throw new OpenprojectErrorException($result['error'], $result['statusCode']);
		}

		if (
			!isset($result['_type']) ||
			$result['_type'] !== 'Configuration'
		) {
			throw new OpenprojectResponseException('Malformed response');
		}
		return $result;
	}


	/**
	 * @return string|null
	 */
	public function getOIDCToken(): ?string {
		if (!$this->isUserOIDCAppInstalledAndEnabled()) {
			$this->logger->debug('The user_oidc app is not installed or enabled');
			return null;
		}
		try {
			$event = $this->exchangedTokenRequestedEventHelper->getEvent();
			/** @psalm-suppress InvalidArgument for dispatchTyped($event)
			 * but new ExchangedTokenRequestedEvent(targeted_audience_client_id) returns event
			 */
			$this->eventDispatcher->dispatchTyped($event);
		} catch (TokenExchangeFailedException $e) {
			$this->logger->debug('Failed to exchange token: ' . $e->getMessage());
			return null;
		}
		$token = $event->getToken();
		if ($token === null) {
			$this->logger->debug('ExchangedTokenRequestedEvent event has not been caught by user_oidc');
			return null;
		}
		// token expiration info
		$this->logger->debug('Obtained a token that expires in ' . $token->getExpiresInFromNow());
		return $token->getAccessToken();
	}

	/**
	 * @param string $userId
	 * @return void
	 */
	public function setUserInfoForOidcBasedAuth(string $userId): void {
		$info = $this->request($userId, 'users/me');
		if (isset($info['lastName'], $info['firstName'], $info['id'])) {
			$fullName = $info['firstName'] . ' ' . $info['lastName'];
			$this->config->setUserValue($userId, Application::APP_ID, 'user_id', $info['id']);
			$this->config->setUserValue($userId, Application::APP_ID, 'user_name', $fullName);
		}
	}

	public function getRegisteredOidcProviders(): array {
		$oidcProviders = [];
		if ($this->isUserOIDCAppInstalledAndEnabled()) {
			$providerMapper = new ProviderMapper($this->db);
			foreach ($providerMapper->getProviders() as $provider) {
				$oidcProviders[] = $provider->getIdentifier();
			}
		}
		return $oidcProviders;
	}

	public function isUserOIDCAppInstalledAndEnabled(): bool {
		return (
			class_exists('\OCA\UserOIDC\Db\ProviderMapper') &&
			class_exists('\OCA\UserOIDC\Event\ExchangedTokenRequestedEvent') &&
			class_exists('\OCA\UserOIDC\Exception\TokenExchangeFailedException') &&
			$this->appManager->isInstalled(
				'user_oidc',
			)
		);
	}

	/**
	 * @return bool
	 */
	public function isOIDCUser(): bool {
		if (!class_exists(OIDCBackend::class)) {
			return false;
		}

		$user = $this->userSession->getUser();
		if ($user instanceof IUser && $user->getBackend() instanceof OIDCBackend) {
			return true;
		}
		return false;
	}
}
