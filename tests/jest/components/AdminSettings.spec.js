/* jshint esversion: 8 */

import axios from '@nextcloud/axios'
import { createLocalVue, shallowMount, mount } from '@vue/test-utils'
import AdminSettings from '../../../src/components/AdminSettings.vue'
import { F_MODES, AUTH_METHOD } from '../../../src/utils.js'
import * as dialogs from '@nextcloud/dialogs'

jest.mock('@nextcloud/axios', () => {
	const originalModule = jest.requireActual('@nextcloud/axios')
	return {
		__esModule: true,
		...originalModule,
		default: {
			get: jest.fn(),
			put: jest.fn(),
			post: jest.fn(),
		},
	}
})
jest.mock('@nextcloud/l10n', () => ({
	translate: jest.fn((app, msg) => msg),
	getLanguage: jest.fn(() => ''),
}))
jest.mock('@nextcloud/dialogs', () => ({
	getLanguage: jest.fn(() => ''),
	showError: jest.fn(),
	showSuccess: jest.fn(),
}))

jest.mock('@nextcloud/initial-state', () => {
	const originalModule = jest.requireActual('@nextcloud/initial-state')
	return {
		__esModule: true,
		...originalModule,
		default: jest.fn(),
		loadState: jest.fn(() => {
			return {
				openproject_instance_url: null,
				oauth_client_id: null,
				oauth_client_secret: null,
			}
		}),
	}
})

const localVue = createLocalVue()

global.OC = {
	dialogs: {
		confirmDestructive: jest.fn(),
		YES_NO_BUTTONS: 70,
	},
}

global.t = (app, text) => text

const writeText = jest.fn()

Object.assign(global.navigator, {
	clipboard: {
	  writeText,
	},
})

const selectors = {
	oauthInstanceInput: '#openproject-oauth-instance > .text-input-input-wrapper > input',
	serverHostForm: '.openproject-server-host',
	opOauthForm: '.openproject-oauth-values',
	authorizationMethod: '.authorization-method',
	authorizationSettings: '.authorization-settings',
	authorizationMethodSaveButton: '[data-test-id="submit-auth-method-values-btn"]',
	authorizationSettingsSaveButton: '[data-test-id="submit-oidc-auth-settings-values-btn"]',
	providerInput: '#provider-search-input',
	oidcDropDownFirstElement: 'ul [title="keycloak"]',
	authorizationMethodResetButton: '[data-test-id="reset-authorization-method-btn"]',
	authorizationCancelResetButton: '[data-test-id="cancel-edit-auth-method-btn"]',
	authorizationSettingsResetButton: '[data-test-id="reset-auth-settings-btn"]',
	authorizationSettingsCancelButton: '[data-test-id="cancel-edit-auth-setting-btn"]',
	openIdIdentityRadio: '[value="oidc"]',
	oauth2Radio: '[value="oauth2"]',
	openIdIdentityDisabled: 'input[type="radio"][value="oidc"][disabled="disabled"]',
	authSettingTargetAudClient: '#authorization-method-target-client-id input',
	ncOauthForm: '.nextcloud-oauth-values',
	projectFolderSetupForm: '.project-folder-setup',
	resetServerHostButton: '[data-test-id="reset-server-host-btn"]',
	textInputWrapper: '.text-input',
	cancelEditServerHostForm: '[data-test-id="cancel-edit-server-host-btn"]',
	resetOPOAuthFormButton: '[data-test-id="reset-op-oauth-btn"]',
	resetNcOAuthFormButton: '[data-test-id="reset-nc-oauth-btn"]',
	submitOPOAuthFormButton: '[data-test-id="submit-op-oauth-btn"]',
	opOauthClientIdInput: '#openproject-oauth-client-id > .text-input-input-wrapper > input',
	opOauthClientSecretInput: '#openproject-oauth-client-secret > .text-input-input-wrapper > input',
	submitServerHostFormButton: '[data-test-id="submit-server-host-form-btn"]',
	submitNcOAuthFormButton: '[data-test-id="submit-nc-oauth-values-form-btn"]',
	resetAllAppSettingsButton: '#reset-all-app-settings-btn',
	defaultUserConfigurationsForm: '.default-prefs',
	defaultEnableNavigation: '#default-prefs--link',
	projectFolderSetupSwitch: '[type="checkbox"]',
	completeProjectFolderSetupWithGroupFolderButton: '[data-test-id="complete-with-project-folders-form-btn"]',
	completeWithoutProjectFolderSetupButton: '[data-test-id="complete-without-project-folder-form-btn"]',
	editProjectFolderSetup: '[data-test-id="edit-project-folder-setup"]',
	projectFolderStatus: '.project-folder-status-value',
	projectFolderErrorMessage: '.note-card--title',
	projectFolderErrorMessageDetails: '.note-card--error-description',
	userAppPasswordButton: '[data-test-id="reset-user-app-password"]',
	setupIntegrationDocumentationLinkSelector: '.settings--documentation-info',
	adminAuditNoteCardInfoSelector: '[type="info"]',
	encryptionNoteCardWarningSelector: '.notecard--warning',
	appNotSupportedError: '[type="error"]',
}

const completeOAUTH2IntegrationState = {
	openproject_instance_url: 'http://openproject.com',
	authorization_method: AUTH_METHOD.OAUTH2,
	openproject_client_id: 'some-client-id-for-op',
	openproject_client_secret: 'some-client-secret-for-op',
	nc_oauth_client: {
		nextcloud_client_id: 'something',
		nextcloud_client_secret: 'something-else',
	},
}

const completeOIDCIntegrationState = {
	openproject_instance_url: 'http://openproject.com',
	authorization_method: AUTH_METHOD.OIDC,
	authorization_settings: {
		oidc_provider: 'some-oidc-provider',
		targeted_audience_client_id: 'some-target-aud-client-id',
	},
}

describe('AdminSettings.vue', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})
	const confirmSpy = jest.spyOn(global.OC.dialogs, 'confirmDestructive')

	describe('form mode and completed status without project folder setup for OAUTH2 authorization config', () => {
		it.each([
			[
				'with empty state',
				{
					openproject_instance_url: null,
					authorization_method: null,
					openproject_client_id: null,
					openproject_client_secret: null,
					nc_oauth_client: null,
				},
				{
					server: F_MODES.EDIT,
					authorizationMethod: F_MODES.DISABLE,
					opOauth: F_MODES.DISABLE,
					ncOauth: F_MODES.DISABLE,
					projectFolderSetUp: F_MODES.DISABLE,
					opUserAppPassword: F_MODES.DISABLE,
				},
				{
					server: false,
					authorizationMethod: false,
					opOauth: false,
					ncOauth: false,
					projectFolderSetUp: false,
					opUserAppPassword: false,
				},
			],
			[
				'with incomplete OpenProject Authorization Method',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: null,
					openproject_client_id: null,
					openproject_client_secret: null,
					nc_oauth_client: null,
				},
				{
					server: F_MODES.VIEW,
					authorizationMethod: F_MODES.EDIT,
					opOauth: F_MODES.DISABLE,
					ncOauth: F_MODES.DISABLE,
					projectFolderSetUp: F_MODES.DISABLE,
					opUserAppPassword: F_MODES.DISABLE,
				},
				{
					server: true,
					authorizationMethod: false,
					opOauth: false,
					ncOauth: false,
					projectFolderSetUp: false,
					opUserAppPassword: false,
				},
			],
			[
				'with incomplete OpenProject OAuth values',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: AUTH_METHOD.OAUTH2,
					openproject_client_id: null,
					openproject_client_secret: null,
					nc_oauth_client: null,
				},
				{
					server: F_MODES.VIEW,
					authorizationMethod: F_MODES.VIEW,
					opOauth: F_MODES.EDIT,
					ncOauth: F_MODES.DISABLE,
					projectFolderSetUp: F_MODES.DISABLE,
					opUserAppPassword: F_MODES.DISABLE,
				},
				{
					server: true,
					authorizationMethod: true,
					opOauth: false,
					ncOauth: false,
					projectFolderSetUp: false,
					opUserAppPassword: false,
				},
			],
			[
				'with complete OpenProject OAuth values',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: AUTH_METHOD.OAUTH2,
					openproject_client_id: 'abcd',
					openproject_client_secret: 'abcdefgh',
					nc_oauth_client: null,
					fresh_project_folder_setup: true,
				},
				{
					server: F_MODES.VIEW,
					authorizationMethod: F_MODES.VIEW,
					opOauth: F_MODES.VIEW,
					ncOauth: F_MODES.DISABLE,
					projectFolderSetUp: F_MODES.DISABLE,
					opUserAppPassword: F_MODES.DISABLE,
				},
				{
					server: true,
					authorizationMethod: true,
					opOauth: true,
					ncOauth: false,
					projectFolderSetUp: false,
					opUserAppPassword: false,
				},
			],
			[
				'with everything but empty OpenProject OAuth values',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: AUTH_METHOD.OAUTH2,
					openproject_client_id: null,
					openproject_client_secret: null,
					nc_oauth_client: {
						nextcloud_client_id: 'some-client-id-here',
						nextcloud_client_secret: 'some-client-secret-here',
					},
				},
				{
					server: F_MODES.VIEW,
					authorizationMethod: F_MODES.VIEW,
					opOauth: F_MODES.EDIT,
					ncOauth: F_MODES.VIEW,
					projectFolderSetUp: F_MODES.VIEW,
					opUserAppPassword: F_MODES.DISABLE,
				},
				{
					server: true,
					authorizationMethod: true,
					opOauth: false,
					ncOauth: true,
					projectFolderSetUp: true,
					opUserAppPassword: false,
				},
			],
			[
				'with a complete admin settings',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: AUTH_METHOD.OAUTH2,
					openproject_client_id: 'client-id-here',
					openproject_client_secret: 'client-id-here',
					nc_oauth_client: {
						nextcloud_client_id: 'nc-client-id-here',
						nextcloud_client_secret: 'nc-client-secret-here',
					},
				},
				{
					server: F_MODES.VIEW,
					authorizationMethod: F_MODES.VIEW,
					opOauth: F_MODES.VIEW,
					ncOauth: F_MODES.VIEW,
					projectFolderSetUp: F_MODES.VIEW,
					opUserAppPassword: F_MODES.DISABLE,
				},
				{
					server: true,
					authorizationMethod: true,
					opOauth: true,
					ncOauth: true,
					projectFolderSetUp: true,
					opUserAppPassword: false,
				},
			],
		])('when the form is loaded %s', (name, state, expectedFormMode, expectedFormState) => {
			const wrapper = getWrapper({ state })
			expect(wrapper.vm.formMode.server).toBe(expectedFormMode.server)
			expect(wrapper.vm.formMode.authorizationMethod).toBe(expectedFormMode.authorizationMethod)
			expect(wrapper.vm.formMode.opOauth).toBe(expectedFormMode.opOauth)
			expect(wrapper.vm.formMode.ncOauth).toBe(expectedFormMode.ncOauth)
			expect(wrapper.vm.formMode.projectFolderSetUp).toBe(expectedFormMode.projectFolderSetUp)
			expect(wrapper.vm.formMode.opUserAppPassword).toBe(expectedFormMode.opUserAppPassword)

			expect(wrapper.vm.isFormCompleted.server).toBe(expectedFormState.server)
			expect(wrapper.vm.isFormCompleted.authorizationMethod).toBe(expectedFormState.authorizationMethod)
			expect(wrapper.vm.isFormCompleted.opOauth).toBe(expectedFormState.opOauth)
			expect(wrapper.vm.isFormCompleted.ncOauth).toBe(expectedFormState.ncOauth)
			expect(wrapper.vm.isFormCompleted.projectFolderSetUp).toBe(expectedFormState.projectFolderSetUp)
			expect(wrapper.vm.isFormCompleted.opUserAppPassword).toBe(expectedFormState.opUserAppPassword)
		})
	})

	describe('form mode and completed status without project folder setup for OIDC authorization config', () => {
		it.each([
			[
				'with empty state',
				{
					openproject_instance_url: null,
					authorization_method: null,
					authorization_settings: {
						oidc_provider: null,
						targeted_audience_client_id: null,
					},
				},
				{
					server: F_MODES.EDIT,
					authorizationMethod: F_MODES.DISABLE,
					authorizationSetting: F_MODES.DISABLE,
					projectFolderSetUp: F_MODES.DISABLE,
					opUserAppPassword: F_MODES.DISABLE,
				},
				{
					server: false,
					authorizationMethod: false,
					authorizationSetting: false,
					projectFolderSetUp: false,
					opUserAppPassword: false,
				},
			],
			[
				'with incomplete OpenProject Authorization Method',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: null,
					authorization_settings: {
						oidc_provider: null,
						targeted_audience_client_id: null,
					},
				},
				{
					server: F_MODES.VIEW,
					authorizationMethod: F_MODES.EDIT,
					authorizationSetting: F_MODES.DISABLE,
					projectFolderSetUp: F_MODES.DISABLE,
					opUserAppPassword: F_MODES.DISABLE,
				},
				{
					server: true,
					authorizationMethod: false,
					authorizationSetting: false,
					projectFolderSetUp: false,
					opUserAppPassword: false,
				},
			],
			[
				'with incomplete authorization settings values',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: AUTH_METHOD.OIDC,
					authorization_settings: {
						oidc_provider: null,
						targeted_audience_client_id: null,
					},
				},
				{
					server: F_MODES.VIEW,
					authorizationMethod: F_MODES.VIEW,
					authorizationSetting: F_MODES.EDIT,
					projectFolderSetUp: F_MODES.DISABLE,
					opUserAppPassword: F_MODES.DISABLE,
				},
				{
					server: true,
					authorizationMethod: true,
					authorizationSetting: false,
					projectFolderSetUp: false,
					opUserAppPassword: false,
				},
			],
			[
				'with complete authorization settings values',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: AUTH_METHOD.OIDC,
					authorization_settings: {
						oidc_provider: 'some-oidc-provider',
						targeted_audience_client_id: 'some-target-aud-client-id',
					},
				},
				{
					server: F_MODES.VIEW,
					authorizationMethod: F_MODES.VIEW,
					authorizationSetting: F_MODES.VIEW,
					projectFolderSetUp: F_MODES.VIEW,
					opUserAppPassword: F_MODES.DISABLE,
				},
				{
					server: true,
					authorizationMethod: true,
					authorizationSetting: true,
					projectFolderSetUp: true,
					opUserAppPassword: false,
				},
			],
			[
				'with everything but empty authorization settings values',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: AUTH_METHOD.OIDC,
					authorization_settings: {
						oidc_provider: null,
						targeted_audience_client_id: null,
					},
					// it means project folder is already set up
					fresh_project_folder_setup: false,
				},
				{
					server: F_MODES.VIEW,
					authorizationMethod: F_MODES.VIEW,
					authorizationSetting: F_MODES.EDIT,
					projectFolderSetUp: F_MODES.VIEW,
					opUserAppPassword: F_MODES.DISABLE,
				},
				{
					server: true,
					authorizationMethod: true,
					authorizationSetting: false,
					projectFolderSetUp: true,
					opUserAppPassword: false,
				},
			],
			[
				'with a complete admin settings',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: AUTH_METHOD.OIDC,
					authorization_settings: {
						oidc_provider: 'some-oidc-provider',
						targeted_audience_client_id: 'some-target-aud-client-id',
					},
				},
				{
					server: F_MODES.VIEW,
					authorizationMethod: F_MODES.VIEW,
					authorizationSetting: F_MODES.VIEW,
					projectFolderSetUp: F_MODES.VIEW,
					opUserAppPassword: F_MODES.DISABLE,
				},
				{
					server: true,
					authorizationMethod: true,
					authorizationSetting: true,
					projectFolderSetUp: true,
					opUserAppPassword: false,
				},
			],
		])('when the form is loaded %s', (name, state, expectedFormMode, expectedFormState) => {
			const wrapper = getWrapper({ state })
			expect(wrapper.vm.formMode.server).toBe(expectedFormMode.server)
			expect(wrapper.vm.formMode.authorizationMethod).toBe(expectedFormMode.authorizationMethod)
			expect(wrapper.vm.formMode.authorizationSetting).toBe(expectedFormMode.authorizationSetting)
			expect(wrapper.vm.formMode.projectFolderSetUp).toBe(expectedFormMode.projectFolderSetUp)
			expect(wrapper.vm.formMode.opUserAppPassword).toBe(expectedFormMode.opUserAppPassword)

			expect(wrapper.vm.isFormCompleted.server).toBe(expectedFormState.server)
			expect(wrapper.vm.isFormCompleted.authorizationMethod).toBe(expectedFormState.authorizationMethod)
			expect(wrapper.vm.isFormCompleted.authorizationSetting).toBe(expectedFormState.authorizationSetting)
			expect(wrapper.vm.isFormCompleted.projectFolderSetUp).toBe(expectedFormState.projectFolderSetUp)
			expect(wrapper.vm.isFormCompleted.opUserAppPassword).toBe(expectedFormState.opUserAppPassword)
		})
	})

	describe('documentation link when OAUTH2 authorization', () => {
		it.each([
			[
				'with all empty state',
				{
					openproject_instance_url: null,
					authorization_method: null,
					openproject_client_id: null,
					openproject_client_secret: null,
					nc_oauth_client: null,
				},
			],
			[
				'with incomplete OpenProject OAuth and NC OAuth values',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: AUTH_METHOD.OAUTH2,
					openproject_client_id: null,
					openproject_client_secret: null,
					nc_oauth_client: null,
				},
			],
			[
				'with incomplete NC OAuth values',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: AUTH_METHOD.OAUTH2,
					openproject_client_id: 'client-id-here',
					openproject_client_secret: 'client-secret-here',
					nc_oauth_client: null,
				},
			],
		])('should be visible %s', (name, state) => {
			const wrapper = getMountedWrapper({ state })
			const setupIntegrationDocumentationLink = wrapper.find(selectors.setupIntegrationDocumentationLinkSelector)
			expect(setupIntegrationDocumentationLink.text()).toBe('Visit our documentation for in-depth information on {htmlLink} integration.')
		})

		it('should be visible when integration is completed', () => {
			const wrapper = getMountedWrapper({ state: completeOAUTH2IntegrationState })
			const setupIntegrationDocumentationLink = wrapper.find(selectors.setupIntegrationDocumentationLinkSelector)
			expect(setupIntegrationDocumentationLink.text()).toBe('Visit our documentation for in-depth information on {htmlLink} integration.')
		})
	})

	describe('documentation link when OIDC authorization', () => {
		it.each([
			[
				'with all empty state',
				{
					openproject_instance_url: null,
					authorization_method: null,
					authorization_settings: {
						oidc_provider: null,
						targeted_audience_client_id: null,
					},
				},
			],
			[
				'with incomplete OpenProject authorization settings values',
				{
					openproject_instance_url: 'https://openproject.example.com',
					authorization_method: AUTH_METHOD.OIDC,
					authorization_settings: {
						oidc_provider: null,
						targeted_audience_client_id: null,
					},
				},
			],
		])('should be visible %s', (name, state) => {
			const wrapper = getMountedWrapper({ state })
			const setupIntegrationDocumentationLink = wrapper.find(selectors.setupIntegrationDocumentationLinkSelector)
			expect(setupIntegrationDocumentationLink.text()).toBe('Visit our documentation for in-depth information on {htmlLink} integration.')
		})

		it('should be visible when integration is completed', () => {
			const wrapper = getMountedWrapper({ state: completeOIDCIntegrationState })
			const setupIntegrationDocumentationLink = wrapper.find(selectors.setupIntegrationDocumentationLinkSelector)
			expect(setupIntegrationDocumentationLink.text()).toBe('Visit our documentation for in-depth information on {htmlLink} integration.')
		})
	})

	describe('server host url form', () => {
		describe('view mode and completed state', () => {
			let wrapper, resetButton
			beforeEach(() => {
				wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
					},
				})
				resetButton = wrapper.find(selectors.resetServerHostButton)
			})
			it('should show field value and hide the input field', () => {
				expect(wrapper.find(selectors.serverHostForm)).toMatchSnapshot()
			})
			describe('reset button', () => {
				it('should be visible when the form is in completed state', async () => {
					expect(resetButton).toMatchSnapshot()
				})
				it("should set the form to 'edit' mode on click", async () => {
					await resetButton.trigger('click')

					expect(wrapper.vm.formMode.server).toBe(F_MODES.EDIT)
				})
				it('should set the saved url to the edit parameter on click', async () => {
					const wrapper = getMountedWrapper({
						state: {
							openproject_instance_url: 'http://openproject.com',
						},
					})
					resetButton = wrapper.find(selectors.resetServerHostButton)

					expect(wrapper.vm.serverHostUrlForEdit).toBe(null)

					await resetButton.trigger('click')

					expect(wrapper.vm.serverHostUrlForEdit).toBe('http://openproject.com')
					expect(wrapper.vm.state.openproject_instance_url).toBe('http://openproject.com')
				})
			})
		})
		describe('edit mode', () => {
			it('should reset open project server host validity check on input', async () => {
				const wrapper = getMountedWrapper()
				await wrapper.setData({
					isOpenProjectInstanceValid: true,
				})

				const oauthInstanceInput = wrapper.find(selectors.oauthInstanceInput)
				await oauthInstanceInput.trigger('input')
				await wrapper.vm.$nextTick()

				expect(wrapper.vm.isOpenProjectInstanceValid).toBe(null)
			})

			describe('readonly state', () => {
				let wrapper, oauthInstanceInput
				beforeEach(() => {
					wrapper = getMountedWrapper({
						state: {
							openproject_instance_url: '',
						},
					})
					oauthInstanceInput = wrapper.find(selectors.oauthInstanceInput)
				})
				it('should set the input field to readonly at first', () => {
					expect(oauthInstanceInput).toMatchSnapshot()
				})
				it('should clear the readonly state when clicked on the input', async () => {
					await oauthInstanceInput.trigger('click')
					oauthInstanceInput = wrapper.find(selectors.oauthInstanceInput)
					expect(oauthInstanceInput).toMatchSnapshot()
				})
			})
			describe('submit button', () => {
				it.each([
					{
						data: {
							result: 'client_exception',
							details: '404 Not Found',
						},
						expectedDetailsMessage: 'Response: "404 Not Found"',
					},
					{
						data: {
							result: 'invalid',
						},
						expectedDetailsMessage: 'The URL should have the form "https://openproject.org"',
					},
					{
						data: {
							result: 'server_exception',
							details: '503 Service Unavailable',
						},
						expectedDetailsMessage: '503 Service Unavailable',
					},
					{
						data: {
							result: 'request_exception',
							details: 'a long message from the exception',
						},
						expectedDetailsMessage: 'a long message from the exception',
					},
					{
						data: {
							result: 'local_remote_servers_not_allowed',
						},
						expectedDetailsMessage: 'To be able to use an OpenProject server with a local address, enable the `allow_local_remote_servers` setting. {htmlLink}.',
					},
					{
						data: {
							result: 'network_error',
							details: 'a long message from the exception',
						},
						expectedDetailsMessage: 'a long message from the exception',
					},
					{
						data: {
							result: 'unexpected_error',
							details: 'a long message from the exception',
						},
						expectedDetailsMessage: 'a long message from the exception',
					},
					{
						data: {
							result: 'not_valid_body',
							details: '<body>the complete body of the return</body>',
						},
						expectedDetailsMessage: null,
					},
					{
						data: {
							result: 'redirected',
							details: 'https://openproject.org/',
						},
						expectedDetailsMessage: null,
					},
				])('should set the input to error state and display correct message when the url is invalid', async (testCase) => {
					dialogs.showError.mockImplementationOnce()
					jest.spyOn(axios, 'post')
						.mockImplementationOnce(() => Promise.resolve({ data: testCase.data }))
					const saveOPOptionsSpy = jest.spyOn(AdminSettings.methods, 'saveOPOptions')
						.mockImplementationOnce(() => jest.fn())

					const wrapper = getMountedWrapper()
					await wrapper.setData({
						serverHostUrlForEdit: 'does-not-matter-for-the-test',
					})

					expect(wrapper.vm.isOpenProjectInstanceValid).toBe(null)

					const submitServerFormButton = wrapper.find(selectors.submitServerHostFormButton)
					await submitServerFormButton.trigger('click')

					for (let i = 0; i <= 100; i++) {
						await wrapper.vm.$nextTick()
					}

					const serverHostForm = wrapper.find(selectors.serverHostForm)
					expect(wrapper.vm.isOpenProjectInstanceValid).toBe(false)
					expect(serverHostForm.find(selectors.textInputWrapper)).toMatchSnapshot()
					expect(saveOPOptionsSpy).toBeCalledTimes(0)
					expect(wrapper.vm.openProjectNotReachableErrorMessageDetails)
						.toBe(testCase.expectedDetailsMessage)
					jest.clearAllMocks()
				})
				it('should save the form when the url is valid', async () => {
					let serverHostForm
					jest.spyOn(axios, 'post')
						.mockImplementationOnce(() => Promise.resolve({ data: { result: true } }))
					const setAdminConfigAPISpy = jest.spyOn(axios, 'put')
						.mockImplementationOnce(() => Promise.resolve({ data: { status: true, oPOAuthTokenRevokeStatus: 'success' } }))

					const wrapper = getMountedWrapper({
						state: {
							openproject_instance_url: '',
							authorization_method: null,
							openproject_client_id: null,
							openproject_client_secret: null,
							nc_oauth_client: null,
						},
					})

					expect(wrapper.vm.formMode.server).toBe(F_MODES.EDIT)
					expect(wrapper.vm.isOpenProjectInstanceValid).toBe(null)
					expect(wrapper.vm.formMode.authorizationMethod).toBe(F_MODES.DISABLE)

					serverHostForm = wrapper.find(selectors.serverHostForm)
					await serverHostForm.find('input').setValue('http://openproject.com')
					serverHostForm = wrapper.find(selectors.serverHostForm)
					await serverHostForm.find(selectors.submitServerHostFormButton).trigger('click')

					for (let i = 0; i <= 100; i++) {
						await wrapper.vm.$nextTick()
					}

					expect(wrapper.vm.isOpenProjectInstanceValid).toBe(true)
					expect(wrapper.vm.formMode.server).toBe(F_MODES.VIEW)
					expect(wrapper.vm.isFormCompleted.server).toBe(true)
					expect(setAdminConfigAPISpy).toBeCalledTimes(1)
					// should set the OpenProject OAuth Values form to edit mode
					expect(wrapper.vm.formMode.authorizationMethod).toBe(F_MODES.EDIT)
				})
			})
			describe('disabled state', () => {
				it.each(['', null])('should set the submit button as disabled when url is empty', (value) => {
					const wrapper = getWrapper({
						state: { openproject_instance_url: value },
					})
					const serverHostForm = wrapper.find(selectors.serverHostForm)
					const submitButton = serverHostForm.find(selectors.submitServerHostFormButton)
					expect(submitButton.attributes().disabled).toBe('true')
				})
				it('should unset the disabled state on input', async () => {
					const wrapper = getMountedWrapper({
						state: { openproject_instance_url: '' },
					})
					let submitButton
					const serverHostForm = wrapper.find(selectors.serverHostForm)
					submitButton = serverHostForm.find(selectors.submitServerHostFormButton)
					expect(submitButton.attributes().disabled).toBe('disabled')

					// first click to enable the input field
					await serverHostForm.find('input').trigger('click')
					await serverHostForm.find('input').setValue('a')

					submitButton = serverHostForm.find(selectors.submitServerHostFormButton)
					expect(submitButton.attributes().disabled).toBe(undefined)
				})
			})
			describe('cancel button', () => {
				let wrapper, editButton
				beforeEach(async () => {
					wrapper = getMountedWrapper({
						state: {
							openproject_instance_url: 'http://openproject.com',
						},
					})
					await wrapper.setData({
						formMode: {
							server: F_MODES.EDIT,
						},
					})
					editButton = wrapper.find(selectors.cancelEditServerHostForm)
				})
				it('should be visible when the form is in completed state with edit mode', async () => {
					expect(editButton).toMatchSnapshot()
				})
				it('should set the form to view mode on click', async () => {
					await editButton.trigger('click')
					expect(wrapper.vm.formMode.server).toBe(F_MODES.VIEW)
				})
			})
		})
	})

	describe('Authorization Method', () => {
		describe('view mode form complete', () => {
			let wrapper, authorizationMethodForm
			beforeEach(() => {
				wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
					},
				})
				authorizationMethodForm = wrapper.find(selectors.authorizationMethod)
			})

			afterEach(() => {
				axios.put.mockReset()
				jest.clearAllMocks()
			})

			it.each([
				[AUTH_METHOD.OAUTH2],
				[AUTH_METHOD.OIDC],
			])('should show field values and hide the form completed with %s auth method', async (authorizationMethod) => {
				await wrapper.setData({
					state: {
						authorization_method: authorizationMethod,
					},
				})
				expect(authorizationMethodForm).toMatchSnapshot()
			})
		})

		describe('edit mode form, incomplete admin configuration', () => {
			let wrapper
			const saveOPOptionsSpy = jest.spyOn(axios, 'put')
				.mockImplementationOnce(() => Promise.resolve({ data: { status: true, oPOAuthTokenRevokeStatus: '' } }))
			beforeEach(() => {
				wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
					},
				})
			})
			afterEach(() => {
				axios.put.mockReset()
				jest.clearAllMocks()
			})
			it('should disable "OpenID identity provider" radio button for user_oidc app not installed', async () => {
				await wrapper.setData({
					state: {
						user_oidc_enabled: false,
					},
				})
				const openIDProviderDisabled = wrapper.find(selectors.openIdIdentityDisabled)
				expect(openIDProviderDisabled.isVisible()).toBe(true)
			})

			it('should not disable "OpenID identity provider" radio button for user_oidc app installed', async () => {
				await wrapper.setData({
					state: {
						user_oidc_enabled: true,
						user_oidc_supported: true,
					},
				})
				expect(wrapper.find(selectors.openIdIdentityDisabled).exists()).toBe(false)
			})

			it('should disable "OpenID identity provider" radio button for user_oidc app installed but not supported', async () => {
				await wrapper.setData({
					state: {
						user_oidc_enabled: true,
						user_oidc_supported: false,
					},
				})
				expect(wrapper.find(selectors.openIdIdentityDisabled).exists()).toBe(true)
			})

			it('should show openproject oauth form for "oauth2" method selected', async () => {
				const authMehodForm = wrapper.find(selectors.authorizationMethod)
				const authMethodSaveButton = authMehodForm.find(selectors.authorizationMethodSaveButton)
				expect(authMethodSaveButton.exists()).toBe(true)
				await authMethodSaveButton.trigger('click')
				await wrapper.vm.$nextTick()
				expect(saveOPOptionsSpy).toBeCalledTimes(1)
				expect(saveOPOptionsSpy).toBeCalledWith('http://localhost/apps/integration_openproject/admin-config', expect.objectContaining({
					values: expect.objectContaining({
						authorization_method: AUTH_METHOD.OAUTH2,
					}),
				}))
				expect(wrapper.vm.formMode.authorizationMethod).toBe(F_MODES.VIEW)
				expect(wrapper.vm.formMode.opOauth).toBe(F_MODES.EDIT)
			})

			it('should show authorization settings form for "oidc" method selected', async () => {
				await wrapper.setData({
					state: {
						user_oidc_enabled: true,
						user_oidc_supported: true,
						authorization_settings: {
							oidc_provider: null,
							targeted_audience_client_id: null,
						},
					},
				})
				// select auth method to 'oidc' auth first
				const authMehodForm = wrapper.find(selectors.authorizationMethod)
				const oidcRadioCheck = authMehodForm.find(selectors.openIdIdentityRadio)
				await oidcRadioCheck.trigger('click')
				await wrapper.vm.$nextTick()
				// save the option
				const authMethodSaveButton = authMehodForm.find(selectors.authorizationMethodSaveButton)
				expect(authMethodSaveButton.exists()).toBe(true)
				await authMethodSaveButton.trigger('click')
				await wrapper.vm.$nextTick()
				expect(saveOPOptionsSpy).toBeCalledTimes(1)
				expect(saveOPOptionsSpy).toBeCalledWith('http://localhost/apps/integration_openproject/admin-config', expect.objectContaining({
					values: expect.objectContaining({
						authorization_method: AUTH_METHOD.OIDC,
					}),
				}))
				expect(wrapper.vm.formMode.authorizationMethod).toBe(F_MODES.VIEW)
			})
		})

		describe('edit mode form, complete OAUTH2 admin config', () => {
			describe('on trigger edit button', () => {
				let wrapper, authorizationMethodForm, resetButton
				const saveOPOptionsSpy = jest.spyOn(axios, 'put')
					.mockImplementationOnce(() => Promise.resolve({ data: { status: true, oPOAuthTokenRevokeStatus: '' } }))
				beforeEach(async () => {
					wrapper = getMountedWrapper({
						state: completeOAUTH2IntegrationState,
					})
					authorizationMethodForm = wrapper.find(selectors.authorizationMethod)
					resetButton = authorizationMethodForm.find(selectors.authorizationMethodResetButton)
					expect(resetButton.exists()).toBe(true)
					await resetButton.trigger('click')
				})

				afterEach(() => {
					axios.put.mockReset()
					jest.clearAllMocks()
				})
				it('should set auth method form to edit mode', async () => {
					expect(wrapper.vm.formMode.authorizationMethod).toBe(F_MODES.EDIT)
				})
				it('should set "save" button as disabled', async () => {
					const authMethodSaveButton = authorizationMethodForm.find(selectors.authorizationMethodSaveButton)
					expect(authMethodSaveButton.exists()).toBe(true)
					expect(authMethodSaveButton.attributes().disabled).toBe('disabled')
				})
				it('should have "cancel" button', async () => {
					const authCancelResetButton = authorizationMethodForm.find(selectors.authorizationCancelResetButton)
					expect(authCancelResetButton.exists()).toBe(true)
				})

				it('should set auth method form to view on click "cancel" button', async () => {
					const authCancelResetButton = authorizationMethodForm.find(selectors.authorizationCancelResetButton)
					expect(authCancelResetButton.exists()).toBe(true)
					await authCancelResetButton.trigger('click')
					expect(wrapper.vm.formMode.authorizationMethod).toBe(F_MODES.VIEW)
				})

				it('should enable "save" button when OIDC auth is selected', async () => {
					await wrapper.setData({
						state: {
							user_oidc_enabled: true,
							user_oidc_supported: true,
						},
					})
					const authMethodSaveButton = authorizationMethodForm.find(selectors.authorizationMethodSaveButton)
					const oidcRadio = wrapper.find(selectors.openIdIdentityRadio)
					expect(oidcRadio.exists()).toBe(true)
					await oidcRadio.trigger('click')
					expect(authMethodSaveButton.attributes().disabled).toBe(undefined)
				})
				describe('on trigger save', () => {
					it('should open auth method switch dialog confirm "Yes, Switch"', async () => {
						await wrapper.setData({
							state: {
								user_oidc_enabled: true,
								user_oidc_supported: true,
							},
						})
						const expectedDialogMessage = 'If you proceed this method, you will have an OIDC based authorization configuration which will delete'
							+ ' all the configuration setting for current OAUTH2 based authorization.'
							+ ' You can switch back to it anytime.'
						const expectedDialogTitle = 'Switch Authorization Method'
						const expectedDialogOpts = {
							cancel: 'Cancel',
							confirm: 'Yes, switch',
							confirmClasses: 'error',
							type: 70,
						}
						const authMethodSaveButton = authorizationMethodForm.find(selectors.authorizationMethodSaveButton)
						const oidcRadio = wrapper.find(selectors.openIdIdentityRadio)
						expect(oidcRadio.exists()).toBe(true)
						await oidcRadio.trigger('click')
						await authMethodSaveButton.trigger('click')
						expect(confirmSpy).toBeCalledTimes(1)
						expect(confirmSpy).toHaveBeenCalledWith(
							expectedDialogMessage,
							expectedDialogTitle,
							expectedDialogOpts,
							expect.any(Function),
							true,
						)
					})
					// this test is the switch from oauth2 to oidc
					it('on confirm "Yes, switch" should reset oauth2 settings', async () => {
						// the "Yes, switch" click from the dialog should reset openproject oauth2 settings only
						await wrapper.setData({
							state: {
								openproject_client_id: '',
								openproject_client_secret: '',
							},
						})
						await wrapper.vm.saveAuthorizationMethodValue()
						expect(saveOPOptionsSpy).toBeCalledTimes(1)
						expect(saveOPOptionsSpy).toBeCalledWith('http://localhost/apps/integration_openproject/admin-config', expect.objectContaining({
							values: expect.objectContaining({
								openproject_instance_url: 'http://openproject.com',
								openproject_client_id: '',
								openproject_client_secret: '',
							}),
						}))
						expect(wrapper.vm.state.openproject_client_id).toBe('')
						expect(wrapper.vm.state.openproject_client_secret).toBe('')
					})
				})
			})
		})

		describe('edit mode form, complete OIDC admin config', () => {
			describe('on trigger edit button', () => {
				let wrapper, authorizationMethodForm, resetButton
				const saveOPOptionsSpy = jest.spyOn(axios, 'put')
					.mockImplementationOnce(() => Promise.resolve({ data: { status: true, oPOAuthTokenRevokeStatus: '' } }))
				beforeEach(async () => {
					wrapper = getMountedWrapper({
						state: completeOIDCIntegrationState,
					})
					await wrapper.setData({
						state: {
							user_oidc_enabled: true,
						},
					})
					authorizationMethodForm = wrapper.find(selectors.authorizationMethod)
					resetButton = authorizationMethodForm.find(selectors.authorizationMethodResetButton)
					expect(resetButton.exists()).toBe(true)
					await resetButton.trigger('click')
				})

				afterEach(() => {
					axios.put.mockReset()
					jest.clearAllMocks()
				})
				it('should enable "save" button when OAUTH2 auth is selected', async () => {
					const authMethodSaveButton = authorizationMethodForm.find(selectors.authorizationMethodSaveButton)
					const oauth2Radio = wrapper.find(selectors.oauth2Radio)
					expect(oauth2Radio.exists()).toBe(true)
					await oauth2Radio.trigger('click')
					expect(authMethodSaveButton.attributes().disabled).toBe(undefined)
				})

				describe('on trigger save button', () => {
					it('should open auth method switch dialog confirm "Yes, Switch"', async () => {
						const expectedDialogMessage = 'If you proceed this method, you will have an OAUTH2 based authorization configuration which will delete'
							+ ' all the configuration setting for current OIDC based authorization.'
							+ ' You can switch back to it anytime.'
						const expectedDialogTitle = 'Switch Authorization Method'
						const expectedDialogOpts = {
							cancel: 'Cancel',
							confirm: 'Yes, switch',
							confirmClasses: 'error',
							type: 70,
						}
						const authMethodSaveButton = authorizationMethodForm.find(selectors.authorizationMethodSaveButton)
						const oauth2Radio = wrapper.find(selectors.oauth2Radio)
						expect(oauth2Radio.exists()).toBe(true)
						await oauth2Radio.trigger('click')
						await authMethodSaveButton.trigger('click')
						expect(confirmSpy).toBeCalledTimes(1)
						expect(confirmSpy).toHaveBeenCalledWith(
							expectedDialogMessage,
							expectedDialogTitle,
							expectedDialogOpts,
							expect.any(Function),
							true,
						)
					})
					// this test is the switch from oidc to oauth2
					it('on confirm "Yes, switch" should reset oidc settings', async () => {
						// the "Yes, switch" click from the dialog should reset authorization settings only
						await wrapper.setData({
							state: {
								authorization_settings: {
									targeted_audience_client_id: null,
								},
							},
							authorizationSetting: {
								currentOIDCProviderSelected: null,
							},
						})
						await wrapper.vm.saveAuthorizationMethodValue()
						expect(saveOPOptionsSpy).toBeCalledTimes(1)
						expect(saveOPOptionsSpy).toBeCalledWith('http://localhost/apps/integration_openproject/admin-config', expect.objectContaining({
							values: expect.objectContaining({
								openproject_instance_url: 'http://openproject.com',
								oidc_provider: null,
								targeted_audience_client_id: null,
							}),
						}))
						expect(wrapper.vm.state.authorization_settings.targeted_audience_client_id).toBe(null)
						expect(wrapper.vm.authorizationSetting.currentOIDCProviderSelected).toBe(null)
					})
				})
			})
		})
	})

	describe('Authorization settings', () => {
		describe('view mode form complete', () => {
			let wrapper, authorizationSettingsForm
			beforeEach(() => {
				wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
						authorization_method: AUTH_METHOD.OIDC,
						authorization_settings: {
							oidc_provider: 'some-oidc-provider',
							targeted_audience_client_id: 'some-target-aud-client-id',
						},
					},
				})
				authorizationSettingsForm = wrapper.find(selectors.authorizationSettings)
			})

			it('should show field values and hide authorization settings form', () => {
				expect(authorizationSettingsForm).toMatchSnapshot()
			})
			it('should complete OIDC integration', () => {
				expect(wrapper.vm.isIntegrationCompleteWithOIDC).toBe(true)
			})
		})

		describe('edit mode form, complete admin configuration', () => {
			let wrapper, authorizationSettingsForm, authSettingsResetButton
			beforeEach(async () => {
				axios.put.mockReset()
				jest.clearAllMocks()
				wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
						authorization_method: AUTH_METHOD.OIDC,
						authorization_settings: {
							oidc_provider: 'some-oidc-provider',
							targeted_audience_client_id: 'some-target-aud-client-id',
						},
					},
				})
				authorizationSettingsForm = wrapper.find(selectors.authorizationSettings)
				authSettingsResetButton = authorizationSettingsForm.find(selectors.authorizationSettingsResetButton)
				await authSettingsResetButton.trigger('click')
			})

			it('should show authorization settings in view mode', () => {
				expect(wrapper.vm.formMode.authorizationSetting).toBe(F_MODES.EDIT)
			})

			it('should show "cancel" button', () => {
				const authSettingsCancelButton = wrapper.find(selectors.authorizationSettingsCancelButton)
				expect(authSettingsCancelButton.isVisible()).toBe(true)
			})

			it('should show "save" button as disabled', () => {
				const authSettingsSaveButton = wrapper.find(selectors.authorizationSettingsSaveButton)
				expect(authSettingsSaveButton.attributes().disabled).toBe('disabled')
			})

			it('should enable "save" button for new auth settings value', async () => {
				const authSettingsSaveButton = wrapper.find(selectors.authorizationSettingsSaveButton)
				await wrapper.find(selectors.authSettingTargetAudClient).trigger('click')
				await wrapper.find(selectors.authSettingTargetAudClient).setValue('new-openproject-client-id')
				expect(authSettingsSaveButton.attributes().disabled).toBe(undefined)
			})
			// editing new auth settings values
			describe('on trigger save button', () => {
				it('should set auth values with new values', async () => {
					const saveOPOptionsSpy = jest.spyOn(axios, 'put')
						.mockImplementationOnce(() => Promise.resolve({ data: { status: true, oPOAuthTokenRevokeStatus: '' } }))
					const authSettingsSaveButton = wrapper.find(selectors.authorizationSettingsSaveButton)
					await wrapper.find(selectors.authSettingTargetAudClient).trigger('click')
					await wrapper.find(selectors.authSettingTargetAudClient).setValue('new-openproject-client-id')
					expect(authSettingsSaveButton.attributes().disabled).toBe(undefined)
					await authSettingsSaveButton.trigger('click')
					await wrapper.vm.$nextTick()
					expect(saveOPOptionsSpy).toBeCalledTimes(1)
					expect(saveOPOptionsSpy).toBeCalledWith(
						'http://localhost/apps/integration_openproject/admin-config',
						{
							values: {
								oidc_provider: 'some-oidc-provider',
								targeted_audience_client_id: 'new-openproject-client-id',
							},
						},
					)
				})
			})
		})

		describe('edit mode, incomplete admin configuration', () => {
			let wrapper, authorizationSettingsForm
			beforeEach(() => {
				wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
						authorization_method: AUTH_METHOD.OIDC,
						authorization_settings: {
							oidc_provider: null,
							targeted_audience_client_id: null,
						},
					},
				})
				authorizationSettingsForm = wrapper.find(selectors.authorizationSettings)
			})

			it('should show authorization settings in edit mode', () => {
				expect(wrapper.vm.formMode.authorizationSetting).toBe(F_MODES.EDIT)
			})

			it('should show "save" button disabled', () => {
				const authSettingsSaveButton = authorizationSettingsForm.find(selectors.authorizationSettingsSaveButton)
				expect(authSettingsSaveButton.attributes().disabled).toBe('disabled')
			})

			it('should disable "save" button for empty "oidc_provider"', () => {
				const wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
						authorization_method: AUTH_METHOD.OIDC,
						authorization_settings: {
							oidc_provider: null,
							targeted_audience_client_id: 'some-targeted-aud-client-id',
						},
					},
				})
				const authSettingsSaveButton = wrapper.find(selectors.authorizationSettingsSaveButton)
				expect(authSettingsSaveButton.attributes().disabled).toBe('disabled')
			})

			it('should disable "save" button for empty "targeted_audience_client_id"', () => {
				const wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
						authorization_method: AUTH_METHOD.OIDC,
						authorization_settings: {
							oidc_provider: 'some-oidc-provider',
							targeted_audience_client_id: null,
						},
					},
				})
				const authSettingsSaveButton = wrapper.find(selectors.authorizationSettingsSaveButton)
				expect(authSettingsSaveButton.attributes().disabled).toBe('disabled')
			})

			describe('save button', () => {
				beforeEach(async () => {
					axios.put.mockReset()
					jest.clearAllMocks()
					await wrapper.setData({
						registeredOidcProviders: ['keycloak'],
					})
					const providerInputField = wrapper.find(selectors.providerInput)
					await providerInputField.setValue('key')
					await localVue.nextTick()
					const optionList = wrapper.find(selectors.oidcDropDownFirstElement)
					await optionList.trigger('click')
					await authorizationSettingsForm.find(selectors.authSettingTargetAudClient).trigger('click')
					await authorizationSettingsForm.find(selectors.authSettingTargetAudClient).setValue('openproject')
				})

				it('should be enabled for authorization values set', async () => {
					const authSettingsSaveButton = wrapper.find(selectors.authorizationSettingsSaveButton)
					expect(authSettingsSaveButton.attributes().disabled).toBe(undefined)
				})

				it('"on trigger" should set auth settings values', async () => {
					const saveOPOptionsSpy = jest.spyOn(axios, 'put')
						.mockImplementationOnce(() => Promise.resolve({ data: { status: true, oPOAuthTokenRevokeStatus: '' } }))
					const authSettingsSaveButton = wrapper.find(selectors.authorizationSettingsSaveButton)
					expect(authSettingsSaveButton.exists()).toBe(true)
					await authSettingsSaveButton.trigger('click')
					await wrapper.vm.$nextTick()
					expect(saveOPOptionsSpy).toBeCalledTimes(1)
					expect(saveOPOptionsSpy).toBeCalledWith(
						'http://localhost/apps/integration_openproject/admin-config',
						{
							values: {
								oidc_provider: 'keycloak',
								targeted_audience_client_id: 'openproject',
							},
						},
					)
					expect(wrapper.vm.formMode.authorizationSetting).toBe(F_MODES.VIEW)
				})
			})
		})
	})

	describe('OpenProject OAuth values form', () => {
		describe('view mode and completed state', () => {
			let wrapper, opOAuthForm, resetButton
			const saveOPOptionsSpy = jest.spyOn(axios, 'put')
				.mockImplementationOnce(() => Promise.resolve({ data: { status: true, oPOAuthTokenRevokeStatus: '' } }))
			beforeEach(() => {
				wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
						authorization_method: AUTH_METHOD.OAUTH2,
						openproject_client_id: 'openproject-client-id',
						openproject_client_secret: 'openproject-client-secret',
						nc_oauth_client: null,
					},
				})
				opOAuthForm = wrapper.find(selectors.opOauthForm)
				resetButton = opOAuthForm.find(selectors.resetOPOAuthFormButton)
			})
			it('should show field values and hide the form if server host form is complete', () => {
				expect(opOAuthForm).toMatchSnapshot()
			})
			describe('reset button', () => {
				it('should trigger confirm dialog on click', async () => {
					await resetButton.trigger('click')
					expect(confirmSpy).toBeCalledTimes(1)

					const expectedDialogMessage = 'If you proceed you will need to update these settings with the new'
						+ ' OpenProject OAuth credentials. Also, all users will need to reauthorize'
						+ ' access to their OpenProject account.'
					const expectedDialogTitle = 'Replace OpenProject OAuth values'
					const expectedDialogOpts = {
						cancel: 'Cancel',
						confirm: 'Yes, replace',
						confirmClasses: 'error',
						type: 70,
					}
					expect(confirmSpy).toHaveBeenCalledWith(
						expectedDialogMessage,
						expectedDialogTitle,
						expectedDialogOpts,
						expect.any(Function),
						true,
					)
					jest.clearAllMocks()
					wrapper.destroy()
				})
				it('should clear values on confirm', async () => {
					jest.clearAllMocks()
					await wrapper.vm.clearOPOAuthClientValues()

					expect(saveOPOptionsSpy).toBeCalledTimes(1)
					expect(wrapper.vm.state.openproject_client_id).toBe(null)
				})
			})
		})
		describe('edit mode', () => {
			let wrapper
			beforeEach(() => {
				jest.spyOn(axios, 'put')
					.mockImplementationOnce(() => Promise.resolve({ data: { status: true } }))
				jest.spyOn(axios, 'post')
					.mockImplementationOnce(() => Promise.resolve({
						data: {
							clientId: 'nc-client-id101',
							clientSecret: 'nc-client-secret101',
						},
					}))
				wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
						authorization_method: AUTH_METHOD.OAUTH2,
						openproject_client_id: '',
						openproject_client_secret: '',
						nc_oauth_client: null,
					},
				})
			})
			afterEach(() => {
				axios.post.mockReset()
				axios.put.mockReset()
				jest.clearAllMocks()
				wrapper.destroy()
			})
			it('should show the form and hide the field values', () => {
				expect(wrapper.find(selectors.opOauthForm)).toMatchSnapshot()
			})
			describe('submit button', () => {
				it('should be enabled with complete client values', async () => {
					let submitButton
					submitButton = wrapper.find(selectors.submitOPOAuthFormButton)
					expect(submitButton.attributes().disabled).toBe('disabled')
					await wrapper.find(selectors.opOauthClientIdInput).setValue('qwerty')
					await wrapper.find(selectors.opOauthClientSecretInput).setValue('qwerty')

					submitButton = wrapper.find(selectors.submitOPOAuthFormButton)
					expect(submitButton.attributes().disabled).toBe(undefined)
				})
				describe('when clicked', () => {
					describe('when the admin config is ok on save options', () => {
						beforeEach(async () => {
							await wrapper.find(selectors.opOauthClientIdInput).setValue('qwerty')
							await wrapper.find(selectors.opOauthClientSecretInput).setValue('qwerty')
							await wrapper.find(selectors.submitOPOAuthFormButton).trigger('click')
						})
						it('should set the form to view mode', () => {
							expect(wrapper.vm.formMode.opOauth).toBe(F_MODES.VIEW)
						})
						it('should set the adminConfigStatus as "true"', () => {
							expect(wrapper.vm.isAdminConfigOk).toBe(true)
						})
						it('should create Nextcloud OAuth client if not already present', () => {
							expect(wrapper.vm.state.nc_oauth_client).toMatchObject({
								clientId: 'nc-client-id101',
								clientSecret: 'nc-client-secret101',
							})
						})
						it('should not create Nextcloud OAuth client if already present', async () => {
							jest.spyOn(axios, 'put')
								.mockImplementationOnce(() => Promise.resolve({ data: { status: true } }))
							const createNCOAuthClientSpy = jest.spyOn(AdminSettings.methods, 'createNCOAuthClient')
								.mockImplementationOnce(() => jest.fn())
							const wrapper = getMountedWrapper({
								state: {
									openproject_instance_url: 'http://openproject.com',
									authorization_method: AUTH_METHOD.OAUTH2,
									openproject_client_id: '',
									openproject_client_secret: '',
									nc_oauth_client: {
										nextcloud_client_id: 'abcdefg',
										nextcloud_client_secret: 'slkjdlkjlkd',
									},
								},
							})
							await wrapper.find(selectors.opOauthClientIdInput).setValue('qwerty')
							await wrapper.find(selectors.opOauthClientSecretInput).setValue('qwerty')
							await wrapper.find(selectors.submitOPOAuthFormButton).trigger('click')
							expect(createNCOAuthClientSpy).not.toHaveBeenCalled()
						})

						it('should not create new user app password if already present', async () => {
							const saveOPOptionsSpy = jest.spyOn(axios, 'put')
								.mockImplementationOnce(() => Promise.resolve({ data: { oPUserAppPassword: null } }))
							const wrapper = getMountedWrapper({
								state: {
									openproject_instance_url: 'http://openproject.com',
									authorization_method: AUTH_METHOD.OAUTH2,
									openproject_client_id: '',
									openproject_client_secret: '',
									nc_oauth_client: {
										nextcloud_client_id: 'abcdefg',
										nextcloud_client_secret: 'slkjdlkjlkd',
									},
									fresh_project_folder_setup: false,
									project_folder_info: {
										status: true,
									},
									app_password_set: false,
								},
								oPUserAppPassword: 'opUserPassword',
							})
							expect(saveOPOptionsSpy).toBeCalledWith(
								'http://localhost/apps/integration_openproject/admin-config',
								{
									values: {
										openproject_instance_url: 'http://openproject.com',
										openproject_client_id: 'qwerty',
										openproject_client_secret: 'qwerty',
									},
								},
							)
							expect(wrapper.vm.oPUserAppPassword).toBe('opUserPassword')
						})
					})
				})
			})
		})
	})

	describe('Nextcloud OAuth values form', () => {
		describe('view mode with complete values', () => {
			it('should show the field values and hide the form', () => {
				const wrapper = getWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
						authorization_method: AUTH_METHOD.OAUTH2,
						openproject_client_id: 'some-client-id-here',
						openproject_client_secret: 'some-client-secret-here',
						nc_oauth_client: {
							nextcloud_client_id: 'some-nc-client-id-here',
							nextcloud_client_secret: 'some-nc-client-secret-here',
						},
					},
				})
				expect(wrapper.find(selectors.ncOauthForm)).toMatchSnapshot()
			})
			describe('reset button', () => {
				afterEach(() => {
					jest.clearAllMocks()
				})
				it('should trigger the confirm dialog', async () => {
					const wrapper = getMountedWrapper({
						state: {
							openproject_instance_url: 'http://openproject.com',
							openproject_client_id: 'op-client-id',
							openproject_client_secret: 'op-client-secret',
							nc_oauth_client: {
								nextcloud_client_id: 'nc-clientid',
								nextcloud_client_secret: 'nc-clientsecret',
							},
						},
					})

					const expectedConfirmText = 'If you proceed you will need to update the settings in your OpenProject '
						+ 'with the new Nextcloud OAuth credentials. Also, all users in OpenProject '
						+ 'will need to reauthorize access to their Nextcloud account.'
					const expectedConfirmOpts = {
						cancel: 'Cancel',
						confirm: 'Yes, replace',
						confirmClasses: 'error',
						type: 70,
					}
					const expectedConfirmTitle = 'Replace Nextcloud OAuth values'

					const resetButton = wrapper.find(selectors.resetNcOAuthFormButton)
					await resetButton.trigger('click')

					expect(confirmSpy).toBeCalledTimes(1)
					expect(confirmSpy).toBeCalledWith(
						expectedConfirmText,
						expectedConfirmTitle,
						expectedConfirmOpts,
						expect.any(Function),
						true,
					)
					wrapper.destroy()
				})
				it('should create new client on confirm', async () => {
					jest.spyOn(axios, 'post')
						.mockImplementationOnce(() => Promise.resolve({
							data: {
								clientId: 'new-client-id77',
								clientSecret: 'new-client-secret77',
							},
						}))
					const wrapper = getMountedWrapper({
						state: {
							openproject_instance_url: 'http://openproject.com',
							authorization_method: AUTH_METHOD.OAUTH2,
							openproject_client_id: 'op-client-id',
							openproject_client_secret: 'op-client-secret',
							nc_oauth_client: {
								nextcloud_client_id: 'nc-client-id',
								nextcloud_client_secret: 'nc-client-secret',
							},
						},
					})
					await wrapper.vm.createNCOAuthClient()
					expect(wrapper.vm.state.nc_oauth_client).toMatchObject({
						clientId: 'new-client-id77',
						clientSecret: 'new-client-secret77',
					})
					expect(wrapper.vm.formMode.ncOauth).toBe(F_MODES.EDIT)
					expect(wrapper.vm.isFormCompleted.ncOauth).toBe(false)
					wrapper.destroy()
				})
			})
		})
		describe('recreate button', () => {
			it('should be displayed if nextcloud oauth credentials is empty and everything is set', async () => {
				const wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
						authorization_method: AUTH_METHOD.OAUTH2,
						openproject_client_id: 'op-client-id',
						openproject_client_secret: 'op-client-secret',
						nc_oauth_client: null,
					},
					formMode: {
						projectFolderSetUp: F_MODES.VIEW,
					},
					showDefaultManagedProjectFolders: true,
					isFormCompleted: {
						projectFolderSetUp: true,
					},

				})
				const resetButton = wrapper.find(selectors.resetNcOAuthFormButton)
				expect(resetButton.isVisible()).toBe(true)
				expect(resetButton.text()).toBe('Create Nextcloud OAuth values')
				wrapper.destroy()
			})
		})
		describe('edit mode', () => {
			it('should show the form and hide the field values', async () => {
				const wrapper = getWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
						authorization_method: AUTH_METHOD.OAUTH2,
						openproject_client_id: 'op-client-id',
						openproject_client_secret: 'op-client-secret',
						nc_oauth_client: {
							nextcloud_client_id: 'nc-client-id',
							nextcloud_client_secret: 'nc-client-secret',
						},
					},
				})
				await wrapper.setData({
					formMode: {
						ncOauth: F_MODES.EDIT,
					},
				})
				expect(wrapper.find(selectors.ncOauthForm)).toMatchSnapshot()
			})
			describe('done button', () => {
				it('should set the form to view mode if the oauth values are complete', async () => {
					const wrapper = getMountedWrapper({
						state: {
							openproject_instance_url: 'http://openproject.com',
							authorization_method: AUTH_METHOD.OAUTH2,
							openproject_client_id: 'some-client-id-for-op',
							openproject_client_secret: 'some-client-secret-for-op',
							nc_oauth_client: {
								nextcloud_client_id: 'something',
								nextcloud_client_secret: 'something-else',
							},
						},
					})
					await wrapper.setData({
						formMode: {
							ncOauth: F_MODES.EDIT,
						},
					})
					await wrapper.find(selectors.ncOauthForm)
						.find(selectors.submitNcOAuthFormButton)
						.trigger('click')
					expect(wrapper.vm.formMode.ncOauth).toBe(F_MODES.VIEW)
					expect(wrapper.vm.isFormCompleted.ncOauth).toBe(true)
				})
			})
		})
	})

	describe('Project folders form (Project Folder Setup)', () => {
		describe('view mode', () => {
			describe('without project folder setup', () => {
				it('should show status as "Inactive"', () => {
					const wrapper = getWrapper({
						state: {
							openproject_instance_url: 'http://openproject.com',
							authorization_method: AUTH_METHOD.OAUTH2,
							openproject_client_id: 'some-client-id-here',
							openproject_client_secret: 'some-client-secret-here',
							nc_oauth_client: {
								nextcloud_client_id: 'some-nc-client-id-here',
								nextcloud_client_secret: 'some-nc-client-secret-here',
							},
							fresh_project_folder_setup: true,
							// project folder is already not set up
							project_folder_info: {
								status: false,
							},
							app_password_set: false,
						},
					})
					const projectFolderStatus = wrapper.find(selectors.projectFolderStatus)
					const actualProjectFolderStatusValue = projectFolderStatus.text()
					expect(actualProjectFolderStatusValue).toContain('Inactive')
					expect(wrapper.find(selectors.projectFolderSetupForm)).toMatchSnapshot()
				})
			})
		})

		describe('edit mode ', () => {
			describe('fresh setup/after reset', () => {
				beforeEach(async () => {
					axios.put.mockReset()
					axios.get.mockReset()
				})

				it('should show the switch as "On" and button text label as "Setup OpenProject user, group and folder"', async () => {
					const wrapper = getWrapper({
						state: {
							openproject_instance_url: 'http://openproject.com',
							authorization_method: AUTH_METHOD.OAUTH2,
							openproject_client_id: 'some-client-id-here',
							openproject_client_secret: 'some-client-secret-here',
							nc_oauth_client: {
								nextcloud_client_id: 'some-nc-client-id-here',
								nextcloud_client_secret: 'some-nc-client-secret-here',
							},
							fresh_project_folder_setup: true,
							// project folder is already not set up
							project_folder_info: {
								status: false,
							},
							app_password_set: false,
						},
					})
					await wrapper.setData({
						formMode: {
							projectFolderSetUp: F_MODES.EDIT,
						},
					})
					expect(wrapper.vm.isProjectFolderSwitchEnabled).toBe(true)
					const completeProjectFolderSetupWithGroupFolderButton = wrapper.find(selectors.completeProjectFolderSetupWithGroupFolderButton)
					expect(completeProjectFolderSetupWithGroupFolderButton.text()).toBe('Setup OpenProject user, group and folder')
				})

				it('should show button text label "Complete without group folder setup" when the switch is "off"', async () => {
					const wrapper = getMountedWrapper({
						state: {
							openproject_instance_url: 'http://openproject.com',
							authorization_method: AUTH_METHOD.OAUTH2,
							openproject_client_id: 'some-client-id-here',
							openproject_client_secret: 'some-client-secret-here',
							nc_oauth_client: {
								nextcloud_client_id: 'some-nc-client-id-here',
								nextcloud_client_secret: 'some-nc-client-secret-here',
							},
							fresh_project_folder_setup: true,
							// group folder is already not set up
							project_folder_info: {
								status: false,
							},
							app_password_set: false,
						},
					})
					await wrapper.setData({
						formMode: {
							projectFolderSetUp: F_MODES.EDIT,
						},
					})
					expect(wrapper.vm.isProjectFolderSwitchEnabled).toBe(true)
					const projectFolderSetupSwitchButton = wrapper.find(selectors.projectFolderSetupSwitch)
					await projectFolderSetupSwitchButton.trigger('click')
					expect(wrapper.vm.isProjectFolderSwitchEnabled).toBe(false)
					const completeWithoutProjectFolderSetupButton = wrapper.find(selectors.completeWithoutProjectFolderSetupButton)
					expect(completeWithoutProjectFolderSetupButton.text()).toBe('Complete without project folders')
				})

				describe('on trigger "Complete without group folder setup"', () => {
					let wrapper = {}
					let saveOPOptionsSpy
					beforeEach(async () => {
						axios.put.mockReset()
						axios.get.mockReset()
						saveOPOptionsSpy = jest.spyOn(axios, 'put')
							.mockImplementationOnce(() => Promise.resolve({
								data: {
									oPUserAppPassword: null,
								},
							}))
						wrapper = getMountedWrapper({
							state: {
								openproject_instance_url: 'http://openproject.com',
								authorization_method: AUTH_METHOD.OAUTH2,
								openproject_client_id: 'some-client-id-here',
								openproject_client_secret: 'some-client-secret-here',
								default_enable_unified_search: false,
								default_enable_navigation: false,
								nc_oauth_client: {
									nextcloud_client_id: 'some-nc-client-id-here',
									nextcloud_client_secret: 'some-nc-client-secret-here',
								},
								fresh_project_folder_setup: true,
								// project folder is already not set up
								project_folder_info: {
									status: false,
								},
								app_password_set: false,
							},
						})
						await wrapper.setData({
							formMode: {
								projectFolderSetUp: F_MODES.EDIT,
							},
						})
						expect(wrapper.vm.formMode.projectFolderSetUp).toBe(F_MODES.EDIT)
						const projectFolderSetupSwitchButton = wrapper.find(selectors.projectFolderSetupSwitch)
						await projectFolderSetupSwitchButton.trigger('click')
						await wrapper.vm.$nextTick()
						const completeWithoutProjectFolderSetupButton = wrapper.find(selectors.completeWithoutProjectFolderSetupButton)
						expect(completeWithoutProjectFolderSetupButton.text()).toBe('Complete without project folders')
						await completeWithoutProjectFolderSetupButton.trigger('click')
						await wrapper.vm.$nextTick()
						expect(saveOPOptionsSpy).toBeCalledWith(
							'http://localhost/apps/integration_openproject/admin-config',
							{
								values: {
									authorization_method: AUTH_METHOD.OAUTH2,
									setup_app_password: false,
									setup_project_folder: false,
								},
							},
						)
					})

					it('should set status "Inactive"', async () => {
						const projectFolderStatusWrapper = wrapper.find(selectors.projectFolderStatus)
						const actualProjectFolderStatusValue = projectFolderStatusWrapper.text()
						expect(actualProjectFolderStatusValue).toContain('Inactive')
					})

					it('should set form mode to view', async () => {
						expect(wrapper.vm.formMode.projectFolderSetUp).toBe(F_MODES.VIEW)

					})

					it('should not create user app password', async () => {
						expect(wrapper.vm.$data.oPUserAppPassword).toBe(null)
					})
				})

				// test for error while setting up the group folder
				describe('trigger on "Setup OpenProject user, group and folder" button', () => {
					beforeEach(async () => {
						axios.put.mockReset()
						axios.get.mockReset()
					})

					describe('upon failure', () => {
						it.each([
							[
								'should set the project folder error message and error details when group folders app is not enabled',
								{
									error: 'The "Group folders" app is not installed',
									expectedErrorDetailsMessage: 'Please install the "Group folders" app to be able to use automatically managed folders. {htmlLink}',
								},
							],
							[
								'should set the user already exists error message and error details when user already exists',
								{
									error: 'The user "OpenProject" already exists',
									expectedErrorDetailsMessage: 'Setting up the OpenProject user, group and group folder was not possible. Please check this troubleshooting guide on how to resolve this situation.',
								},
							],
							[
								'should set the group folder name already exists error message and error details when group folder already exists',
								{
									error: 'The group folder name "OpenProject" already exists',
									expectedErrorDetailsMessage: 'Setting up the OpenProject user, group and group folder was not possible. Please check this troubleshooting guide on how to resolve this situation.',
								},
							],
							[
								'should set the group already exists error message and error details when group already exists',
								{
									error: 'The group "OpenProject" already exists',
									expectedErrorDetailsMessage: 'Setting up the OpenProject user, group and group folder was not possible. Please check this troubleshooting guide on how to resolve this situation.',
								},
							],

						])('%s', async (name, expectedErrorDetails) => {
							const wrapper = getMountedWrapper({
								state: {
									openproject_instance_url: 'http://openproject.com',
									authorization_method: AUTH_METHOD.OAUTH2,
									openproject_client_id: 'some-client-id-here',
									openproject_client_secret: 'some-client-secret-here',
									default_enable_unified_search: false,
									default_enable_navigation: false,
									nc_oauth_client: {
										nextcloud_client_id: 'some-nc-client-id-here',
										nextcloud_client_secret: 'some-nc-client-secret-here',
									},
									fresh_project_folder_setup: true,
									project_folder_info: {
										status: false,
									},
									app_password_set: false,
									projectFolderSetupError: null,
								},
							})

							await wrapper.setData({
								formMode: {
									projectFolderSetUp: F_MODES.EDIT,
								},
							})
							const getgroupfolderStatus = jest.spyOn(axios, 'get').mockImplementationOnce(() => Promise.resolve({
								data: {
									result: false,
								},
							}))

							// creating an error since the put request is not resolved
							const err = new Error()
							err.response = {}
							err.response.data = {}
							err.response.data.error = expectedErrorDetails.error

							const saveOPOptionsSpy = jest.spyOn(axios, 'put')
								.mockImplementationOnce(() => Promise.reject(err))
							if (expectedErrorDetails.error !== 'The "Group folders" app is not installed') {
								jest.spyOn(wrapper.vm, 'projectFolderSetUpErrorMessageDescription').mockReturnValue(
									'Setting up the OpenProject user, group and group folder was not possible. Please check this troubleshooting guide on how to resolve this situation.',
								)
							}
							const completeProjectFolderSetupWithGroupFolderButton = wrapper.find(selectors.completeProjectFolderSetupWithGroupFolderButton)
							await completeProjectFolderSetupWithGroupFolderButton.trigger('click')
							await wrapper.vm.$nextTick()
							expect(getgroupfolderStatus).toBeCalledTimes(1)
							expect(saveOPOptionsSpy).toBeCalledWith(
								'http://localhost/apps/integration_openproject/admin-config',
								{
									values: {
										authorization_method: AUTH_METHOD.OAUTH2,
										setup_app_password: true,
										setup_project_folder: true,
									},
								},
							)
							await wrapper.vm.$nextTick()
							const projectFolderErrorMessage = wrapper.find(selectors.projectFolderErrorMessage)
							const projectFolderErrorMessageDetails = wrapper.find(selectors.projectFolderErrorMessageDetails)
							expect(projectFolderErrorMessage.text()).toBe(expectedErrorDetails.error)
							expect(projectFolderErrorMessageDetails.text()).toBe(expectedErrorDetails.expectedErrorDetailsMessage)
						})
					})

					describe('upon success', () => {
						let wrapper = {}
						let getgroupfolderStatusSpy
						let saveOPOptionsSpy
						beforeEach(async () => {
							axios.put.mockReset()
							axios.get.mockReset()
							wrapper = getMountedWrapper({
								state: {
									openproject_instance_url: 'http://openproject.com',
									authorization_method: AUTH_METHOD.OAUTH2,
									openproject_client_id: 'some-client-id-here',
									openproject_client_secret: 'some-client-secret-here',
									nc_oauth_client: {
										nextcloud_client_id: 'some-nc-client-id-here',
										nextcloud_client_secret: 'some-nc-client-secret-here',
									},
									fresh_project_folder_setup: true,
									app_password_set: false,
									encryption_info: {
										server_side_encryption_enabled: false,
										encryption_enabled_for_groupfolders: false,
									},
								},
								isGroupFolderAlreadySetup: null,
							})
							await wrapper.setData({
								formMode: {
									projectFolderSetUp: F_MODES.EDIT,
								},
							})

							getgroupfolderStatusSpy = jest.spyOn(axios, 'get').mockImplementationOnce(() => Promise.resolve({
								data: {
									result: false,
								},
							}))
							saveOPOptionsSpy = jest.spyOn(axios, 'put')
								.mockImplementationOnce(() => Promise.resolve({
									data: {
										oPUserAppPassword: 'opUserAppPassword',
									},
								}))
							const completeProjectFolderSetupWithGroupFolderButton = wrapper.find(selectors.completeProjectFolderSetupWithGroupFolderButton)
							await completeProjectFolderSetupWithGroupFolderButton.trigger('click')
							await wrapper.vm.$nextTick()
							expect(getgroupfolderStatusSpy).toBeCalledTimes(1)
							expect(saveOPOptionsSpy).toBeCalledWith(
								'http://localhost/apps/integration_openproject/admin-config',
								{
									values: {
										authorization_method: AUTH_METHOD.OAUTH2,
										setup_app_password: true,
										setup_project_folder: true,
									},
								},
							)
							await wrapper.vm.$nextTick()
						})

						it('should set status as "Active"', async () => {
							expect(wrapper.vm.$data.oPUserAppPassword).toBe('opUserAppPassword')
							expect(wrapper.vm.formMode.opUserAppPassword).toBe(F_MODES.EDIT)
							await wrapper.vm.$nextTick()
							const projectFolderStatus = wrapper.find(selectors.projectFolderStatus)
							const actualProjectFolderStatusValue = projectFolderStatus.text()
							expect(actualProjectFolderStatusValue).toContain('Active')
						})

						it('should set user app password form to edit mode', async () => {
							expect(wrapper.vm.formMode.opUserAppPassword).toBe(F_MODES.EDIT)
						})

						it('should set project folder setup form to edit mode', async () => {
							expect(wrapper.vm.formMode.projectFolderSetUp).toBe(F_MODES.VIEW)
						})
						it('should create a new app password', async () => {
							expect(wrapper.vm.$data.oPUserAppPassword).toBe('opUserAppPassword')
						})
					})
				})
			})

			describe('deactivate', function() {
				describe('after complete setup', () => {
					let wrapper = {}
					let saveOPOptionsSpy
					beforeEach(async () => {
						wrapper = getMountedWrapper({
							state: {
								openproject_instance_url: 'http://openproject.com',
								authorization_method: AUTH_METHOD.OAUTH2,
								openproject_client_id: 'some-client-id-here',
								openproject_client_secret: 'some-client-secret-here',
								nc_oauth_client: {
									nextcloud_client_id: 'some-nc-client-id-here',
									nextcloud_client_secret: 'some-nc-client-secret-here',
								},
								fresh_project_folder_setup: false,
								project_folder_info: {
									status: true,
								},
								app_password_set: true,
								encryption_info: {
									server_side_encryption_enabled: false,
									encryption_enabled_for_groupfolders: false,
								},
							},
						})
						await wrapper.setData({
							formMode: {
								projectFolderSetUp: F_MODES.EDIT,
							},
							oPUserAppPassword: 'userAppPassword',
						})
						saveOPOptionsSpy = jest.spyOn(axios, 'put')
							.mockImplementationOnce(() => Promise.resolve({
								data: {
									oPUserAppPassword: null,
								},
							}))
						const projectFolderSetupSwitchButton = wrapper.find(selectors.projectFolderSetupSwitch)
						await projectFolderSetupSwitchButton.trigger('click')
						await wrapper.vm.$nextTick()
						const completeWithoutProjectFolderSetupButton = wrapper.find(selectors.completeWithoutProjectFolderSetupButton)
						await completeWithoutProjectFolderSetupButton.trigger('click')
						await wrapper.vm.$nextTick()
					})

					it('should delete user app password', async () => {
						expect(saveOPOptionsSpy).toBeCalledWith(
							'http://localhost/apps/integration_openproject/admin-config',
							{
								values: {
									authorization_method: AUTH_METHOD.OAUTH2,
									setup_app_password: false,
									setup_project_folder: false,
								},
							},
						)
						expect(wrapper.vm.state.app_password_set).toBe(false)
						expect(wrapper.vm.state.oPUserAppPassword).not.toBe('userAppPassword')
						expect(wrapper.vm.state.oPUserAppPassword).not.toBe(null)
					})

					it('should set project folder status to "Inactive"', async () => {
						expect(saveOPOptionsSpy).toBeCalledWith(
							'http://localhost/apps/integration_openproject/admin-config',
							{
								values: {
									authorization_method: AUTH_METHOD.OAUTH2,
									setup_app_password: false,
									setup_project_folder: false,
								},
							},
						)
						const projectFolderStatus = wrapper.find(selectors.projectFolderStatus)
						const actualProjectFolderStatusValue = projectFolderStatus.text()
						expect(actualProjectFolderStatusValue).toContain('Inactive')
					})
				})
			})

			describe('default deavtivate state', function() {
				let wrapper = {}
				beforeEach(async () => {
					wrapper = getMountedWrapper({
						state: {
							openproject_instance_url: 'http://openproject.com',
							authorization_method: AUTH_METHOD.OAUTH2,
							openproject_client_id: 'some-client-id-here',
							openproject_client_secret: 'some-client-secret-here',
							nc_oauth_client: {
								nextcloud_client_id: 'some-nc-client-id-here',
								nextcloud_client_secret: 'some-nc-client-secret-here',
							},
							fresh_project_folder_setup: false,
							// group folder is already not set up
							project_folder_info: {
								status: false,
							},
							app_password_set: false,
						},
					})
					await wrapper.setData({
						formMode: {
							projectFolderSetUp: F_MODES.EDIT,
						},
					})
				})

				it('should show project folder status as "Inactive"', async () => {
					await wrapper.setData({
						formMode: {
							projectFolderSetUp: F_MODES.VIEW,
						},
					})
					const projectFolderStatus = wrapper.find(selectors.projectFolderStatus)
					const actualProjectFolderStatusValue = projectFolderStatus.text()
					expect(actualProjectFolderStatusValue).toContain('Inactive')
				})

				it('should set the button label to "keep current change"', async () => {
					const completeWithoutProjectFolderSetupButton = wrapper.find(selectors.completeWithoutProjectFolderSetupButton)
					expect(completeWithoutProjectFolderSetupButton.text()).toBe('Keep current setup')
				})

				it('should show button label to "Setup OpenProject user, group and folder" when switch is "On"', async () => {
					const projectFolderSetupSwitchButton = wrapper.find(selectors.projectFolderSetupSwitch)
					await projectFolderSetupSwitchButton.trigger('click')
					await wrapper.vm.$nextTick()
					expect(wrapper.vm.isProjectFolderSwitchEnabled).toBe(true)
					const completeProjectFolderSetupWithGroupFolderButton = wrapper.find(selectors.completeProjectFolderSetupWithGroupFolderButton)
					expect(completeProjectFolderSetupWithGroupFolderButton.text()).toBe('Setup OpenProject user, group and folder')
				})
			})

			describe('complete setup (project folder and app password)', function() {
				describe('edit mode', function() {
					let wrapper = {}
					let getgroupfolderStatusSpy
					beforeEach(async () => {
						axios.put.mockReset()
						axios.get.mockReset()
						wrapper = getMountedWrapper({
							state: {
								openproject_instance_url: 'http://openproject.com',
								authorization_method: AUTH_METHOD.OAUTH2,
								openproject_client_id: 'some-client-id-here',
								openproject_client_secret: 'some-client-secret-here',
								nc_oauth_client: {
									nextcloud_client_id: 'some-nc-client-id-here',
									nextcloud_client_secret: 'some-nc-client-secret-here',
								},
								fresh_project_folder_setup: false,
								project_folder_info: {
									status: true,
								},
								app_password_set: true,
								encryption_info: {
									server_side_encryption_enabled: false,
									encryption_enabled_for_groupfolders: false,
								},
							},
							isGroupFolderAlreadySetup: null,
						})
						await wrapper.setData({
							formMode: {
								projectFolderSetUp: F_MODES.EDIT,
							},
							oPUserAppPassword: 'opUserPassword',
						})
						getgroupfolderStatusSpy = jest.spyOn(axios, 'get').mockImplementationOnce(() => Promise.resolve({
							data: {
								result: true,
							},
						}))
					})

					it('should show button label to "keep current"', async () => {
						const completeProjectFolderSetupWithGroupFolderButton = wrapper.find(selectors.completeProjectFolderSetupWithGroupFolderButton)
						expect(completeProjectFolderSetupWithGroupFolderButton.text()).toBe('Keep current setup')
					})

					it('should not create new user app password on trigger "Keep on current change"', async () => {
						const completeProjectFolderSetupWithGroupFolderButton = wrapper.find(selectors.completeProjectFolderSetupWithGroupFolderButton)
						expect(completeProjectFolderSetupWithGroupFolderButton.text()).toBe('Keep current setup')
						completeProjectFolderSetupWithGroupFolderButton.trigger('click')
						expect(getgroupfolderStatusSpy).toBeCalledTimes(1)
						expect(wrapper.vm.oPUserAppPassword).toBe('opUserPassword')
					})

					it('should show button label as "Complete without group folder setup" when switch is "off" ', async () => {
						const projectFolderSetupSwitchButton = wrapper.find(selectors.projectFolderSetupSwitch)
						await projectFolderSetupSwitchButton.trigger('click')
						const completeWithoutProjectFolderSetupButton = wrapper.find(selectors.completeWithoutProjectFolderSetupButton)
						expect(completeWithoutProjectFolderSetupButton.text()).toBe('Complete without project folders')
					})

					it('should set switch as "on" again (same as fresh set up) when completely reset', async () => {
						const wrapper = getMountedWrapper({
							state: {
								openproject_instance_url: null,
								authorization_method: null,
								openproject_client_id: null,
								openproject_client_secret: null,
								nc_oauth_client: null,
								fresh_project_folder_setup: true,
								project_folder_info: {
									status: true,
								},
								app_password_set: false,
							},
						})
						expect(wrapper.vm.isProjectFolderSwitchEnabled).toBe(true)
					})
				})
			})
		})
	})

	describe('user app password reset', () => {
		let confirmSpy
		let wrapper
		beforeEach(async () => {
			axios.put.mockReset()
			confirmSpy = jest.spyOn(global.OC.dialogs, 'confirmDestructive')
			wrapper = getMountedWrapper({
				state: {
					openproject_instance_url: 'http://openproject.com',
					authorization_method: AUTH_METHOD.OAUTH2,
					openproject_client_id: 'some-client-id-here',
					openproject_client_secret: 'some-client-secret-here',
					nc_oauth_client: {
						nextcloud_client_id: 'some-nc-client-id-here',
						nextcloud_client_secret: 'some-nc-client-secret-here',
					},
					app_password_set: true,
				},
			})
			await wrapper.setData({
				oPUserAppPassword: 'oldUserAppPassword',
			})
		})
		afterEach(() => {
			jest.clearAllMocks()
		})
		it('should trigger a confirm dialog', async () => {
			const expectedConfirmText = 'If you proceed, your old application password for the OpenProject user will be deleted and you will receive a new OpenProject user password.'
			const expectedConfirmOpts = {
				cancel: 'Cancel',
				confirm: 'Yes, replace',
				confirmClasses: 'error',
				type: 70,
			}
			const expectedConfirmTitle = 'Replace user app password'
			const resetUserAppPassword = wrapper.find(selectors.userAppPasswordButton)
			await resetUserAppPassword.trigger('click')
			await wrapper.vm.$nextTick()
			expect(confirmSpy).toBeCalledTimes(1)
			expect(confirmSpy).toBeCalledWith(
				expectedConfirmText,
				expectedConfirmTitle,
				expectedConfirmOpts,
				expect.any(Function),
				true,
			)
			wrapper.destroy()
		})

		it('should replace old password with new password on confirm', async () => {
			const saveOPOptionsSpy = jest.spyOn(axios, 'put')
				.mockImplementationOnce(() => Promise.resolve({
					data: {
						oPUserAppPassword: 'newUserAppPassword',
					},
				}))
			await wrapper.vm.createNewAppPassword()
			expect(saveOPOptionsSpy).toBeCalledWith(
				'http://localhost/apps/integration_openproject/admin-config',
				{
					values: {
						setup_app_password: true,
					},
				},
			)
			expect(wrapper.vm.oPUserAppPassword).toBe('newUserAppPassword')
			expect(wrapper.vm.oPUserAppPassword).not.toBe('oldUserAppPassword')
			expect(wrapper.vm.formMode.opUserAppPassword).toBe(F_MODES.EDIT)
			expect(wrapper.vm.isFormCompleted.opUserAppPassword).toBe(false)
		})
	})

	describe('error after project folder is already setup', () => {
		beforeEach(async () => {
			axios.put.mockReset()
			axios.get.mockReset()
		})
		it.each([
			[
				'should set the project folder error message and error details when group folders app is not enabled',
				{
					error: 'The "Group folders" app is not installed',
					expectedErrorDetailsMessage: 'Please install the "Group folders" app to be able to use automatically managed folders. {htmlLink}',
				},
			],
			[
				'should set the user already exists error message and error details when user already exists',
				{
					error: 'The user "OpenProject" already exists',
					expectedErrorDetailsMessage: 'Setting up the OpenProject user, group and group folder was not possible.',
				},
			],
		])('%s', async (name, expectedErrorDetails) => {
			const wrapper = getMountedWrapper({
				state: {
					openproject_instance_url: 'http://openproject.com',
					authorization_method: AUTH_METHOD.OAUTH2,
					openproject_client_id: 'some-client-id-here',
					openproject_client_secret: 'some-client-secret-here',
					default_enable_unified_search: false,
					default_enable_navigation: false,
					nc_oauth_client: {
						nextcloud_client_id: 'some-nc-client-id-here',
						nextcloud_client_secret: 'some-nc-client-secret-here',
					},
					// status is false
					// with error message when something went wrong after project folder is already setup
					project_folder_info: {
						errorMessage: expectedErrorDetails.error,
						status: false,
					},
					app_password_set: true,
				},
			})
			expect(wrapper.vm.isFormCompleted.opUserAppPassword).toBe(true)
			const projectFolderErrorMessage = wrapper.find(selectors.projectFolderErrorMessage)
			const projectFolderErrorMessageDetails = wrapper.find(selectors.projectFolderErrorMessageDetails)
			expect(projectFolderErrorMessage.text()).toBe(expectedErrorDetails.error)
			if (expectedErrorDetails.error !== 'The "Group folders" app is not installed') {
				expect(projectFolderErrorMessageDetails.text()).toContain(expectedErrorDetails.expectedErrorDetailsMessage)
			} else {
				expect(projectFolderErrorMessageDetails.text()).toBe(expectedErrorDetails.expectedErrorDetailsMessage)
			}
		})
	})

	describe('Encryption warning after project folder setup', () => {
		beforeEach(async () => {
			axios.put.mockReset()
			axios.get.mockReset()
		})

		it.each([
			[
				'should show warning when server side encryption is enabled but encryption for groupfolders is not enabled',
				{
					server_side_encryption_enabled: true,
					encryption_enabled_for_groupfolders: false,
				},
				true,
			],
			[
				'should not show warning when server side encryption and groupfolders encryption is enabled',
				{
					server_side_encryption_enabled: true,
					encryption_enabled_for_groupfolders: true,
				},
				false,
			],
			[
				'should not show warning when server side encryption not enabled but groupfolders encryption is enabled',
				{
					server_side_encryption_enabled: false,
					encryption_enabled_for_groupfolders: true,
				},
				false,
			],
		])('%s', (name, encryptionInfoState, expectedResult) => {
			const wrapper = getMountedWrapper({
				state: {
					openproject_instance_url: 'http://openproject.com',
					authorization_method: AUTH_METHOD.OAUTH2,
					openproject_client_id: 'some-client-id-here',
					openproject_client_secret: 'some-client-secret-here',
					default_enable_unified_search: false,
					default_enable_navigation: false,
					nc_oauth_client: {
						nextcloud_client_id: 'some-nc-client-id-here',
						nextcloud_client_secret: 'some-nc-client-secret-here',
					},
					project_folder_info: {
						status: true,
					},
					app_password_set: true,
					encryption_info: encryptionInfoState,
				},
			})
			const encryptionWarningNoteCard = wrapper.find(selectors.encryptionNoteCardWarningSelector)
			expect(encryptionWarningNoteCard.exists()).toBe(expectedResult)
		})
	})

	describe('reset button', () => {
		describe('reset all app settings', () => {
			let wrapper
			let confirmSpy

			const { location } = window
			delete window.location
			window.location = { reload: jest.fn() }
			beforeEach(() => {
				wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
						authorization_method: AUTH_METHOD.OAUTH2,
						openproject_client_id: 'some-client-id-for-op',
						openproject_client_secret: 'some-client-secret-for-op',
						nc_oauth_client: {
							nextcloud_client_id: 'something',
							nextcloud_client_secret: 'something-else',
						},
					},
				})
				confirmSpy = jest.spyOn(global.OC.dialogs, 'confirmDestructive')
			})
			afterEach(() => {
				jest.clearAllMocks()
			})

			it('should trigger confirm dialog on click', async () => {
				const resetButton = wrapper.find(selectors.resetAllAppSettingsButton)
				await resetButton.trigger('click')
				const expectedConfirmText = 'Are you sure that you want to reset this app '
					+ 'and delete all settings and all connections of all Nextcloud users to OpenProject?'
				const expectedConfirmOpts = {
					cancel: 'Cancel',
					confirm: 'Yes, reset',
					confirmClasses: 'error',
					type: 70,
				}
				const expectedConfirmTitle = 'Reset OpenProject Integration'

				expect(confirmSpy).toBeCalledTimes(1)
				expect(confirmSpy).toBeCalledWith(
					expectedConfirmText,
					expectedConfirmTitle,
					expectedConfirmOpts,
					expect.any(Function),
					true,
				)
			})

			it('should reset all settings on confirm when project folder is not setup', async () => {
				const saveOPOptionsSpy = jest.spyOn(axios, 'put')
					.mockImplementationOnce(() => Promise.resolve({ data: true }))
				await wrapper.vm.resetAllAppValues()

				expect(saveOPOptionsSpy).toBeCalledWith(
					'http://localhost/apps/integration_openproject/admin-config',
					{
						values: {
							openproject_client_id: null,
							openproject_client_secret: null,
							openproject_instance_url: null,
							authorization_method: null,
							default_enable_navigation: false,
							default_enable_unified_search: false,
							setup_project_folder: false,
							setup_app_password: false,
						},
					},
				)
				axios.put.mockReset()
			})

			it('should reset all settings on confirm along with app password when app password is set', async () => {
				wrapper = getMountedWrapper({
					state: {
						openproject_instance_url: 'http://openproject.com',
						authorization_method: AUTH_METHOD.OAUTH2,
						openproject_client_id: 'some-client-id-for-op',
						openproject_client_secret: 'some-client-secret-for-op',
						nc_oauth_client: {
							nextcloud_client_id: 'something',
							nextcloud_client_secret: 'something-else',
						},
						app_password_set: true,
					},
					oPUserAppPassword: 'oPUserAppPassword',
				})

				const saveOPOptionsSpy = jest.spyOn(axios, 'put')
					.mockImplementationOnce(() => Promise.resolve({ data: true }))
				await wrapper.vm.resetAllAppValues()

				expect(saveOPOptionsSpy).toBeCalledWith(
					'http://localhost/apps/integration_openproject/admin-config',
					{
						values: {
							openproject_client_id: null,
							openproject_client_secret: null,
							openproject_instance_url: null,
							authorization_method: null,
							default_enable_navigation: false,
							default_enable_unified_search: false,
							setup_project_folder: false,
							setup_app_password: false,
						},
					},
				)
				// no new app password is received on response
				expect(wrapper.vm.oPUserAppPassword).toBe(null)
				expect(wrapper.vm.oPUserAppPassword).not.toBe('oPUserAppPassword')
				axios.put.mockReset()
			})

			it('should reload the window at the end', async () => {
				await wrapper.vm.resetAllAppValues()
				await wrapper.vm.$nextTick()
				expect(window.location.reload).toBeCalledTimes(1)
				window.location = location
			})
		})

		it.each([
			{
				openproject_instance_url: 'http://openproject.com',
				authorization_method: AUTH_METHOD.OAUTH2,
				openproject_client_id: 'some-client-id-for-op',
				openproject_client_secret: 'some-client-secret-for-op',
			},
			{
				openproject_instance_url: 'http://openproject.com',
				authorization_method: AUTH_METHOD.OAUTH2,
				openproject_client_id: null,
				openproject_client_secret: null,
			},
			{
				openproject_instance_url: null,
				authorization_method: null,
				openproject_client_id: 'some-client-id-for-op',
				openproject_client_secret: 'some-client-secret-for-op',
			},
			{
				openproject_instance_url: null,
				authorization_method: null,
				openproject_client_id: null,
				openproject_client_secret: 'some-client-secret-for-op',
			},
			{
				openproject_instance_url: 'http://openproject.com',
				authorization_method: AUTH_METHOD.OAUTH2,
				openproject_client_id: null,
				openproject_client_secret: 'some-client-secret-for-op',
			},
			{
				openproject_instance_url: null,
				authorization_method: null,
				openproject_client_id: 'some-client-id-for-op',
				openproject_client_secret: null,
			},
		])('should not be disabled when any of the Open Project setting is set', (value) => {
			const wrapper = getMountedWrapper({
				state: value,
			})
			const resetButton = wrapper.find(selectors.resetAllAppSettingsButton)
			expect(resetButton.attributes('disabled')).toBe(undefined)
		})

		it('should be disabled when no Open Project setting is set', async () => {
			const wrapper = getMountedWrapper({
				state: {
					openproject_instance_url: null,
					authorization_method: null,
					openproject_client_id: null,
					openproject_client_secret: null,
				},
			})
			const resetButton = wrapper.find(selectors.resetAllAppSettingsButton)
			expect(resetButton.attributes('disabled')).toBe('disabled')
		})
	})

	describe('default user configurations form', () => {
		it('should be visible when the integration is complete', () => {
			const wrapper = getMountedWrapper({
				state: completeOAUTH2IntegrationState,
			})
			expect(wrapper.find(selectors.defaultUserConfigurationsForm)).toMatchSnapshot()
		})
		it('should not be visible if the integration is not complete', () => {
			const wrapper = getMountedWrapper({
				state: {
					openproject_instance_url: 'http://openproject.com',
					authorization_method: AUTH_METHOD.OAUTH2,
					openproject_client_id: 'some-client-id-for-op',
					openproject_client_secret: 'some-client-secret-for-op',
					nc_oauth_client: null,
				},
			})
			expect(wrapper.find(selectors.defaultUserConfigurationsForm).exists()).toBeFalsy()
		})

		it('should show success message and update the default config on success', async () => {
			dialogs.showSuccess.mockImplementationOnce()
			const saveDefaultsSpy = jest.spyOn(axios, 'put')
				.mockImplementationOnce(() => Promise.resolve({ data: true }))

			const wrapper = getMountedWrapper({
				state: {
					openproject_instance_url: 'http://openproject.com',
					authorization_method: AUTH_METHOD.OAUTH2,
					openproject_client_id: 'some-client-id-for-op',
					openproject_client_secret: 'some-client-secret-for-op',
					nc_oauth_client: {
						nextcloud_client_id: 'something',
						nextcloud_client_secret: 'something-else',
					},
				},
			})

			const $defaultEnableNavigation = wrapper.find(selectors.defaultEnableNavigation)
			await $defaultEnableNavigation.trigger('click')
			expect(saveDefaultsSpy).toBeCalledTimes(1)
			expect(saveDefaultsSpy).toBeCalledWith(
				'http://localhost/apps/integration_openproject/admin-config',
				{
					values: {
						default_enable_navigation: true,
						default_enable_unified_search: false,
					},
				},
			)
			expect(dialogs.showSuccess).toBeCalledTimes(1)
			expect(dialogs.showSuccess).toBeCalledWith('Default user configuration saved')
		})

		it('should show error message on fail response', async () => {
			// mock the dialogs showError method
			dialogs.showError.mockImplementationOnce()

			// mock the axios PUT method for error
			axios.put.mockReset()
			const err = new Error()
			err.message = 'some issue'
			err.response = {}
			err.response.request = {}
			err.response.request.responseText = 'Some message'
			axios.put.mockRejectedValueOnce(err)

			const wrapper = getMountedWrapper({
				state: {
					openproject_instance_url: 'http://openproject.com',
					authorization_method: AUTH_METHOD.OAUTH2,
					openproject_client_id: 'some-client-id-for-op',
					openproject_client_secret: 'some-client-secret-for-op',
					nc_oauth_client: {
						nextcloud_client_id: 'something',
						nextcloud_client_secret: 'something-else',
					},
				},
			})
			const $defaultEnableNavigation = wrapper.find(selectors.defaultEnableNavigation)
			await $defaultEnableNavigation.trigger('click')
			await localVue.nextTick()

			expect(dialogs.showError).toBeCalledTimes(1)
			expect(dialogs.showError).toBeCalledWith('Failed to save default user configuration: Some message')

		})
	})

	describe('revoke OpenProject OAuth token', () => {
		beforeEach(() => {
			axios.put.mockReset()
			dialogs.showSuccess.mockReset()
			dialogs.showError.mockReset()
		})
		it('should show success when revoke status is success', async () => {
			dialogs.showSuccess
				.mockImplementationOnce()
				.mockImplementationOnce()
			const saveOPOptionsSpy = jest.spyOn(axios, 'put')
				.mockImplementationOnce(
					() => Promise.resolve({ data: { status: true, oPOAuthTokenRevokeStatus: 'success' } }),
				)
			const wrapper = getMountedWrapper({
				state: completeOAUTH2IntegrationState,
			})
			await wrapper.vm.saveOPOptions()

			await localVue.nextTick()

			expect(saveOPOptionsSpy).toBeCalledTimes(1)
			expect(dialogs.showSuccess).toBeCalledTimes(2)
			expect(dialogs.showSuccess).toBeCalledWith('OpenProject admin options saved')
			expect(dialogs.showSuccess).toBeCalledWith('Successfully revoked users\' OpenProject OAuth access tokens')

		})
		it.each([
			['connection_error', 'Failed to perform revoke request due to connection error with the OpenProject server'],
			['other_error', 'Failed to revoke some users\' OpenProject OAuth access tokens'],
		])('should show error message on various failure', async (errorCode, errorMessage) => {
			dialogs.showSuccess
				.mockImplementationOnce()
				.mockImplementationOnce()
			const saveOPOptionsSpy = jest.spyOn(axios, 'put')
				.mockImplementationOnce(
					() => Promise.resolve({ data: { status: true, oPOAuthTokenRevokeStatus: errorCode } }),
				)
			const wrapper = getMountedWrapper({
				state: completeOAUTH2IntegrationState,
			})
			await wrapper.vm.saveOPOptions()

			await localVue.nextTick()

			expect(saveOPOptionsSpy).toBeCalledTimes(1)
			expect(dialogs.showSuccess).toBeCalledTimes(1)
			expect(dialogs.showError).toBeCalledTimes(1)
			expect(dialogs.showSuccess).toBeCalledWith('OpenProject admin options saved')
			expect(dialogs.showError).toBeCalledWith(errorMessage)

		})
	})

	describe('terms of service', () => {
		const termsOfServiceComponentStub = 'termsofserviceunsigned-stub'
		const termsOfServiceComponentStubAttribute = 'isalltermsofservicesignedforuseropenproject'
		it('should show modal when terms of services are not signed', () => {
			const wrapper = getWrapper({
				state: {
					all_terms_of_services_signed: true,
				},
			})
			expect(wrapper.find(termsOfServiceComponentStub).attributes(termsOfServiceComponentStubAttribute)).toBe('true')
		})

		it('should not show modal when all terms of services are signed', () => {
			const wrapper = getWrapper({
				state: {
					all_terms_of_services_signed: false,
				},
			})
			expect(wrapper.find(termsOfServiceComponentStub).attributes(termsOfServiceComponentStubAttribute)).toBeFalsy()
		})
	})

	describe('admin audit logging', () => {
		it.each([
			[
				'should show information for admin audit logging configuration',
				{
					admin_audit_configuration_correct: false,
				},
				true,
			],
			[
				'should not show information for admin audit logging configuration',
				{
					admin_audit_configuration_correct: true,
				},
				false,
			],
		])('%s', (name, state, expectedResult) => {
			const wrapper = getWrapper({ state })
			const adminAuditLogNoteCard = wrapper.find(selectors.adminAuditNoteCardInfoSelector)
			expect(adminAuditLogNoteCard.exists()).toBe(expectedResult)
		})
	})
})

function getWrapper(data = {}) {
	return shallowMount(AdminSettings, {
		localVue,
		attachTo: document.body,
		mocks: {
			t: (app, msg) => msg,
			generateUrl() {
				return '/'
			},
		},
		data() {
			return {
				...data,
			}
		},
	})
}

function getMountedWrapper(data = {}) {
	return mount(AdminSettings, {
		localVue,
		attachTo: document.body,
		mocks: {
			t: (app, msg) => msg,
			generateUrl() {
				return '/'
			},
		},
		data() {
			return {
				...data,
			}
		},
	})
}
