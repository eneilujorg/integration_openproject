<?php
/**
 * Nextcloud - OpenProject
 *
 *
 * @author Kiran Parajuli <kiran@jankaritech.com>
 * @copyright Kiran Parajuli 2022
 */

namespace OCA\OpenProject\Settings;

use OCP\AppFramework\Services\IInitialState;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IConfig;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class PersonalTest extends TestCase {
	/**
	 * @var Personal
	 */
	private $setting;

	/**
	 * @var MockObject | IConfig
	 */
	private $config;

	/**
	 * @var MockObject | IInitialState
	 */
	private $initialState;

	protected function setUp(): void {
		parent::setUp();
		$this->config = $this->getMockBuilder(IConfig::class)->getMock();
		$this->initialState = $this->getMockBuilder(IInitialState::class)->getMock();
		$this->setting = new Personal($this->config, $this->initialState, "testUser");
	}

	/**
	 * @return array<mixed>
	 */
	public function dataTestGetForm(): array {
		return [
			[
				// valid dataset
				"clientId" => 'some-client-id',
				"clientSecret" => 'some-client-secret',
				"oauthInstanceUrl" => 'http://some.url',
				"adminConfigStatus" => true,
			],
			[
				// dataset with empty client secret
				"clientId" => 'some-client-id',
				"clientSecret" => '',
				"oauthInstanceUrl" => 'http://some.url',
				"adminConfigStatus" => false,
			],
			[
				// dataset with invalid oauth instance url
				"clientId" => 'some-client-id',
				"clientSecret" => 'some-secret',
				"oauthInstanceUrl" => 'http:/',
				"adminConfigStatus" => false,
			],
		];
	}

	/**
	 * @dataProvider dataTestGetForm
	 *
	 * @param string $clientId
	 * @param string $clientSecret
	 * @param string $oauthInstanceUrl
	 * @param bool $adminConfigStatus
	 * @return void
	 */
	public function testGetForm(
		string $clientId, string $clientSecret, string $oauthInstanceUrl, bool $adminConfigStatus
	) {
		$this->config
			->method('getUserValue')
			->withConsecutive(
				['testUser', 'integration_openproject', 'token'],
				['testUser', 'integration_openproject', 'user_name'],
				['testUser', 'integration_openproject', 'search_enabled', '0'],
				['testUser', 'integration_openproject', 'notification_enabled', '0'],
				['testUser', 'integration_openproject', 'navigation_enabled', '0'],
			)
			->willReturnOnConsecutiveCalls(
				'some-token',
				'some-username',
				'0', '0', '0'
			);
		$this->config
			->method('getAppValue')
			->withConsecutive(
				['integration_openproject', 'client_id'],
				['integration_openproject', 'client_secret'],
				['integration_openproject', 'oauth_instance_url'],
				['integration_openproject', 'client_id'],
				['integration_openproject', 'oauth_instance_url'],
			)
			->willReturnOnConsecutiveCalls(
				$clientId,
				$clientSecret,
				$oauthInstanceUrl,
				$clientId,
				$oauthInstanceUrl,
			);



		$this->initialState
			->method('provideInitialState')
			->withConsecutive(
				[
					'user-config', [
						'token' => 'some-token',
						'user_name' => 'some-username',
						'search_enabled' => false,
						'notification_enabled' => false,
						'navigation_enabled' => false,
						'admin_config_ok' => $adminConfigStatus,
					]
				],
				['oauth-connection-result'],
				['oauth-connection-error-message']
			);

		$form = $this->setting->getForm();
		$expected = new TemplateResponse('integration_openproject', 'personalSettings');
		$this->assertEquals($expected, $form);
	}
}
