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
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Exception\ServerException;
use OCA\OpenProject\AppInfo\Application;
use OCA\OpenProject\Service\OpenProjectAPIService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\Http\Client\LocalServerException;

use OCP\IConfig;
use OCP\IRequest;
use OCP\IURLGenerator;
use Psr\Log\LoggerInterface;

class OpenProjectController extends Controller {

	public function __construct(string $appName,
		IRequest $request,
		private IConfig $config,
		private OpenProjectAPIService $openprojectAPIService,
		private IURLGenerator $urlGenerator,
		private LoggerInterface $logger,
		private ?string $userId,
	) {
		parent::__construct($appName, $request);
	}

	/**
	 * check if there is a OpenProject behind a certain URL
	 *
	 * @param string $url
	 *
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function isValidOpenProjectInstance(string $url): DataResponse {
		if ($this->openprojectAPIService::validateURL($url) !== true) {
			$this->logger->error(
				"The OpenProject URL '$url' is invalid",
				['app' => $this->appName]
			);
			return new DataResponse(['result' => 'invalid']);
		}
		try {
			$response = $this->openprojectAPIService->rawRequest(
				'', $url, '', [], 'GET',
				['allow_redirects' => false]
			);
			$statusCode = $response->getStatusCode();
			if ($statusCode >= 300 && $statusCode <= 399) {
				$newLocation = $response->getHeader('Location');
				if ($newLocation !== '') {
					return new DataResponse(
						[
							'result' => 'redirected',
							'details' => str_replace('api/v3/', '', $newLocation)
						]
					);
				}
				$this->logger->error(
					"Could not connect to the URL '$url'",
					[
						'app' => $this->appName,
					]
				);
				return new DataResponse(
					[
						'result' => 'unexpected_error',
						'details' => 'received a redirect status code (' . $statusCode . ') but no "Location" header'
					]
				);
			}
			$body = (string) $response->getBody();
			$decodedBody = json_decode($body, true);
			if (
				$decodedBody &&
				isset($decodedBody['_type']) &&
				isset($decodedBody['instanceName']) &&
				$decodedBody['_type'] === 'Root' &&
				$decodedBody['instanceName'] !== ''
			) {
				return new DataResponse(['result' => true]);
			}
		} catch (ClientException $e) {
			$response = $e->getResponse();
			$body = (string) $response->getBody();
			$decodedBody = json_decode($body, true);
			if (
				$decodedBody &&
				isset($decodedBody['_type']) &&
				isset($decodedBody['errorIdentifier']) &&
				$decodedBody['_type'] === 'Error' &&
				$decodedBody['errorIdentifier'] !== ''
			) {
				return new DataResponse(['result' => true]);
			}
			$this->logger->error(
				"Could not connect to the OpenProject. " .
				"There is no valid OpenProject instance at '$url'",
				['app' => $this->appName, 'exception' => $e]
			);
			return new DataResponse(
				[
					'result' => 'client_exception',
					'details' => $response->getStatusCode() . " " . $response->getReasonPhrase()
				]
			);
		} catch (ServerException $e) {
			$response = $e->getResponse();
			$this->logger->error(
				"Could not connect to the OpenProject URL '$url', " .
				"The server replied with " . $response->getStatusCode() . " " . $response->getReasonPhrase(),
				['app' => $this->appName, 'exception' => $e]
			);
			return new DataResponse(
				[
					'result' => 'server_exception',
					'details' => $response->getStatusCode() . " " . $response->getReasonPhrase()
				]
			);
		} catch (RequestException $e) {
			$this->logger->error(
				"Could not connect to the URL '$url'",
				['app' => $this->appName, 'exception' => $e]
			);
			return new DataResponse(
				[
					'result' => 'request_exception',
					'details' => $e->getMessage()
				]
			);
		} catch (LocalServerException $e) {
			$this->logger->error(
				'Accessing OpenProject servers with local addresses is not allowed. ' .
				'To be able to use an OpenProject server with a local address, ' .
				'enable the `allow_local_remote_servers` setting.',
				['app' => $this->appName, 'exception' => $e]
			);
			return new DataResponse(
				[
					'result' => 'local_remote_servers_not_allowed'
				]
			);
		} catch (ConnectException $e) {
			$this->logger->error(
				"A network error occurred while trying to connect to the OpenProject URL '$url'",
				['app' => $this->appName, 'exception' => $e]
			);
			return new DataResponse(
				[
					'result' => 'network_error',
					'details' => $e->getMessage()
				]
			);
		} catch (Exception $e) {
			$this->logger->error(
				"Could not connect to the URL '$url'",
				['app' => $this->appName, 'exception' => $e]
			);
			return new DataResponse(
				[
					'result' => 'unexpected_error',
					'details' => $e->getMessage()
				]
			);
		}
		$this->logger->error(
			"Could not connect to the OpenProject. " .
			"There is no valid OpenProject instance at '$url'",
			['app' => $this->appName, 'data' => $body]
		);
		return new DataResponse(
			[
				'result' => 'not_valid_body',
				'details' => $body
			]
		);
	}

	/**
	 * @return DataResponse
	 */
	#[NoAdminRequired]
	public function getOpenProjectOauthURLWithStateAndPKCE(): DataResponse {
		$url = $this->openprojectAPIService::getOpenProjectOauthURL(
			$this->config, $this->urlGenerator
		);
		$oauthState = bin2hex(random_bytes(5));
		$this->config->setUserValue(
			$this->userId,
			Application::APP_ID,
			'oauth_state',
			$oauthState
		);
		// this results in a random string of 192 char and after packing and encoding a 128 char verifier
		$randomString = bin2hex(random_bytes(96));
		$codeVerifier = $this->base64UrlEncode(pack('H*', $randomString));
		$this->config->setUserValue(
			$this->userId,
			Application::APP_ID,
			'code_verifier',
			$codeVerifier
		);
		$hash = hash('sha256', $codeVerifier);
		$codeChallenge = $this->base64UrlEncode(pack('H*', $hash));
		$url = $url . '&state=' .$oauthState .
				 '&code_challenge=' . $codeChallenge .
				'&code_challenge_method=S256';

		return new DataResponse($url);
	}

	private function base64UrlEncode(string $plainText): string {
		$base64 = base64_encode($plainText);
		$base64 = trim($base64, "=");
		$base64url = strtr($base64, '+/', '-_');
		return ($base64url);
	}

	/**
	 * check if the project folder set up is already setup or not
	 *
	 * @return DataResponse
	 */
	#[NoCSRFRequired]
	public function getProjectFolderSetupStatus(): DataResponse {
		return new DataResponse(
			[
				'result' => $this->openprojectAPIService->isProjectFoldersSetupComplete()
			]
		);
	}
}
