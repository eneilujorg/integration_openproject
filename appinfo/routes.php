<?php

/**
 * Nextcloud - OpenProject
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Julien Veyssier <eneiluj@posteo.net>
 * @copyright Julien Veyssier 2021
 */

$requirements = [
	'apiVersion' => '(v1)',
];

return [
	'routes' => [
		['name' => 'config#oauthRedirect', 'url' => '/oauth-redirect', 'verb' => 'GET'],
		['name' => 'config#setConfig', 'url' => '/config', 'verb' => 'PUT'],
		['name' => 'config#setAdminConfig', 'url' => '/admin-config', 'verb' => 'PUT'],
		['name' => 'config#autoOauthCreation', 'url' => '/nc-oauth', 'verb' => 'POST'],
		['name' => 'config#checkConfig', 'url' => '/check-config', 'verb' => 'GET'],
		['name' => 'config#checkAdminConfigOk', 'url' => '/check-admin-config', 'verb' => 'GET'],
		['name' => 'config#signTermsOfServiceForUserOpenProject', 'url' => '/sign-term-of-service', 'verb' => 'POST'],

		['name' => 'directDownload#directDownload', 'url' => '/direct/{token}/{fileName}', 'verb' => 'GET'],

		['name' => 'directUpload#prepareDirectUpload', 'url' => '/direct-upload-token', 'verb' => 'POST'],
		['name' => 'directUpload#directUpload', 'url' => '/direct-upload/{token}', 'verb' => 'POST'],
		['name' => 'directUpload#preflighted_cors', 'url' => '/direct-upload/{token}', 'verb' => 'OPTIONS'],

		['name' => 'config#setUpIntegration', 'url' => '/setup', 'verb' => 'POST'],
		['name' => 'config#resetIntegration', 'url' => '/setup', 'verb' => 'DELETE'],
		['name' => 'config#updateIntegration', 'url' => '/setup', 'verb' => 'PATCH'],

		['name' => 'openProject#isValidOpenProjectInstance', 'url' => '/is-valid-op-instance', 'verb' => 'POST'],
		['name' => 'openProject#getOpenProjectOauthURLWithStateAndPKCE', 'url' => '/op-oauth-url', 'verb' => 'GET'],
		['name' => 'openProject#getProjectFolderSetupStatus', 'url' => '/project-folder-status', 'verb' => 'GET'],
	],
	'ocs' => [
		['name' => 'files#getFileInfo', 'url' => '/fileinfo/{fileId}', 'verb' => 'GET'],
		['name' => 'files#getFilesInfo', 'url' => '/filesinfo', 'verb' => 'POST'],

		['name' => 'openProjectAPI#getNotifications', 'url' => '/api/{apiVersion}/notifications', 'verb' => 'GET', 'requirements' => $requirements],
		['name' => 'openProjectAPI#markNotificationAsRead', 'url' => '/api/{apiVersion}/work-packages/{workpackageId}/notifications', 'verb' => 'DELETE', 'requirements' => $requirements],
		['name' => 'openProjectAPI#getOpenProjectUrl', 'url' => '/api/{apiVersion}/url', 'verb' => 'GET', 'requirements' => $requirements],
		['name' => 'openProjectAPI#getOpenProjectAvatar', 'url' => '/api/{apiVersion}/avatar', 'verb' => 'GET', 'requirements' => $requirements],
		['name' => 'openProjectAPI#getSearchedWorkPackages', 'url' => '/api/{apiVersion}/work-packages', 'verb' => 'GET', 'requirements' => $requirements],
		['name' => 'openProjectAPI#linkWorkPackageToFile', 'url' => '/api/{apiVersion}/work-packages', 'verb' => 'POST', 'requirements' => $requirements],
		['name' => 'openProjectAPI#getWorkPackageFileLinks', 'url' => '/api/{apiVersion}/work-packages/{id}/file-links', 'verb' => 'GET', 'requirements' => $requirements],
		['name' => 'openProjectAPI#getOpenProjectWorkPackageStatus', 'url' => '/api/{apiVersion}/statuses/{id}', 'verb' => 'GET', 'requirements' => $requirements],
		['name' => 'openProjectAPI#getOpenProjectWorkPackageType', 'url' => '/api/{apiVersion}/types/{id}', 'verb' => 'GET', 'requirements' => $requirements],
		['name' => 'openProjectAPI#deleteFileLink', 'url' => '/api/{apiVersion}/file-links/{id}', 'verb' => 'DELETE', 'requirements' => $requirements],
		['name' => 'openProjectAPI#getAvailableOpenProjectProjects', 'url' => '/api/{apiVersion}/projects','verb' => 'GET', 'requirements' => $requirements],
		['name' => 'openProjectAPI#getOpenProjectWorkPackageForm', 'url' => '/api/{apiVersion}/projects/{projectId}/work-packages/form','verb' => 'POST', 'requirements' => $requirements],
		['name' => 'openProjectAPI#getAvailableAssigneesOfAProject', 'url' => '/api/{apiVersion}/projects/{projectId}/available-assignees','verb' => 'GET', 'requirements' => $requirements],
		['name' => 'openProjectAPI#createWorkPackage', 'url' => '/api/{apiVersion}/create/work-packages','verb' => 'POST', 'requirements' => $requirements],
		['name' => 'openProjectAPI#getOpenProjectConfiguration', 'url' => '/api/{apiVersion}/configuration', 'verb' => 'GET', 'requirements' => $requirements],
	]
];
