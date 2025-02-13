<?php

/**
 * SPDX-FileCopyrightText: 2024 Jankari Tech Pvt. Ltd.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

use Behat\Behat\Context\Context;
use Behat\Behat\Context\Environment\InitializedContextEnvironment;
use Behat\Behat\Hook\Scope\BeforeScenarioScope;
use GuzzleHttp\Exception\GuzzleException;
use PHPUnit\Framework\Assert;

/**
 * Defines application features from the specific context.
 */
class FilesVersionsContext implements Context {
	private FeatureContext $featureContext;

	/**
	 * @Then the version folder of file :path for user :user should contain :count element(s)
	 *
	 * @param string $path
	 * @param string $user
	 * @param int $count
	 *
	 * @return void
	 * @throws Exception
	 * @throws GuzzleException
	 */
	public function theVersionFolderOfFileShouldContainElements(
		string $path,
		string $user,
		int $count
	):void {
		$fileId = $this->featureContext->getIdOfFileOrFolder($user, $path);
		$this->theVersionFolderOfFileIdShouldContainElements($user, $fileId, $count);
	}

	/**
	 * assert file versions count
	 *
	 * @param string $user
	 * @param string $fileId
	 * @param int $count
	 *
	 * @return void
	 * @throws GuzzleException
	 */
	public function theVersionFolderOfFileIdShouldContainElements(
		string $user,
		string $fileId,
		int $count
	):void {
		$responseXml = $this->listVersionFolder($user, $fileId);
		$actualCount = \count($responseXml->xpath("//d:prop/d:getetag")) - 1;
		Assert::assertEquals(
			$count,
			$actualCount,
			"Expected the number of versions to be $count but the actual number of versions is $actualCount"
		);
	}

	/**
	 * returns the result parsed into an SimpleXMLElement
	 *
	 * @param string $user
	 * @param string $fileId
	 *
	 * @return SimpleXMLElement
	 * @throws GuzzleException
	 * @throws Exception
	 */
	public function listVersionFolder(
		string $user,
		string $fileId
	):SimpleXMLElement {
		$password = $this->featureContext->getRegularUserPassword();
		$fullUrl = $this->featureContext->sanitizeUrl(
			$this->featureContext->getBaseUrl() . '/remote.php/dav/versions/' . strtolower($user) . '/versions/' . $fileId
		);
		$body = '<?xml version="1.0"?>' .
			'<d:propfind xmlns:d="DAV:"' .
			' xmlns:oc="http://owncloud.org/ns"' .
			' xmlns:nc="http://nextcloud.org/ns"' .
			' xmlns:ocs="http://open-collaboration-services.org/ns">' .
			'	<d:prop>' .
			'		<d:getcontentlength />' .
			'		<d:getcontenttype />' .
			'		<d:getlastmodified />' .
			'		<d:getetag />' .
			'		<nc:version-label />' .
			'		<nc:has-preview />' .
			'	</d:prop>' .
			'</d:propfind>';
		$response = $this->featureContext->sendHttpRequest(
			$fullUrl, $user, $password, 'PROPFIND', null, $body
		);
		$xmlBody = $response->getBody()->getContents();
		return new SimpleXMLElement($xmlBody);
	}

	/**
	 * This will run before EVERY scenario.
	 * It will set the properties for this object.
	 *
	 * @BeforeScenario
	 *
	 * @param BeforeScenarioScope $scope
	 *
	 * @return void
	 */
	public function before(BeforeScenarioScope $scope):void {
		// Get the environment
		$environment = $scope->getEnvironment();

		// Get all the contexts you need in this context
		if ($environment instanceof InitializedContextEnvironment) {
			$this->featureContext = $environment->getContext('FeatureContext');
		}
	}
}
