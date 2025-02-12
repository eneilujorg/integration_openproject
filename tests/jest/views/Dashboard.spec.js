/* jshint esversion: 8 */

import { shallowMount, mount, createLocalVue } from '@vue/test-utils'
import * as dialogs from '@nextcloud/dialogs'
import axios from '@nextcloud/axios'
import Dashboard from '../../../src/views/Dashboard.vue'
import { STATE, AUTH_METHOD, checkOauthConnectionResult } from '../../../src/utils.js'
import notificationsResponse from '../fixtures/notificationsResponse.json'
import { messages } from '../../../src/constants/messages.js'

jest.mock('@nextcloud/axios')
jest.mock('@nextcloud/l10n', () => ({
	translate: jest.fn((app, msg) => msg),
	getLanguage: jest.fn(),
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
		loadState: jest.fn(() => ''),
	}
})
jest.mock('../../../src/utils.js', () => ({
	...jest.requireActual('../../../src/utils.js'),
	checkOauthConnectionResult: jest.fn(),
}))

global.OCA = {}
global.OC = {}
const localVue = createLocalVue()

describe('Dashboard.vue', () => {
	const dashboardTriggerButtonSelector = '.action-item--default-popover .v-popper'
	const markAsReadButtonSelector = '.action-item__popperr .v-popper__wrapper .v-popper__inner div.open'
	const errorLabelSelector = '.demo-error-oidc'
	const emptyContentSelector = 'emptycontent-stub'

	const defaultState = {
		authMethods: AUTH_METHOD,
	}

	let axiosSpy, spyLaunchLoop

	beforeEach(async () => {
		axiosSpy = jest.spyOn(axios, 'get')
			.mockImplementationOnce(() => Promise.resolve({ data: 'http://openproject.org' }))
			.mockImplementationOnce(() => Promise.resolve({ data: notificationsResponse }))
		spyLaunchLoop = jest.spyOn(Dashboard.methods, 'launchLoop')
	})
	afterEach(() => {
		jest.clearAllMocks()
		jest.restoreAllMocks()
	})

	describe('auth method: OAUTH2', () => {
		it('should show the notification items in the Dashboard', async () => {
			const wrapper = getWrapper({
				...defaultState,
				oauthConnectionErrorMessage: '',
				oauthConnectionResult: '',
				isAdminConfigOk: true,
				userHasOidcToken: false,
				authMethod: 'oauth2',
			})

			await localVue.nextTick()

			expect(spyLaunchLoop).toHaveBeenCalledTimes(1)
			expect(axiosSpy).toBeCalledWith(
				'http://localhost/apps/integration_openproject/url',
			)
			expect(axiosSpy).toBeCalledWith(
				'http://localhost/apps/integration_openproject/notifications',
			)
			expect(wrapper.vm.state).toBe(STATE.OK)
			expect(checkOauthConnectionResult).toHaveBeenCalledTimes(1)
			expect(wrapper.vm.items).toMatchSnapshot()
		})

	})

	describe('auth method: OIDC', () => {
		const state = {
			...defaultState,
			oauthConnectionErrorMessage: '',
			oauthConnectionResult: '',
			isAdminConfigOk: true,
			authMethod: 'oidc',
		}

		describe('OIDC user', () => {
			it('should show error message if token is not available', async () => {
				const wrapper = getWrapper({ ...state, userHasOidcToken: false })

				expect(wrapper.find(errorLabelSelector).text()).toBe(messages.featureNotAvailable)
				expect(spyLaunchLoop).toHaveBeenCalledTimes(1)
				expect(wrapper.find(emptyContentSelector).exists()).toBe(false)
			})
			it('should show the notification items in the Dashboard', async () => {
				const wrapper = getWrapper({ ...state, userHasOidcToken: true })

				await localVue.nextTick()

				expect(spyLaunchLoop).toHaveBeenCalledTimes(1)
				expect(axiosSpy).toBeCalledWith(
					'http://localhost/apps/integration_openproject/url',
				)
				expect(axiosSpy).toBeCalledWith(
					'http://localhost/apps/integration_openproject/notifications',
				)
				expect(wrapper.vm.state).toBe(STATE.OK)
				expect(wrapper.find(errorLabelSelector).exists()).toBe(false)
				expect(checkOauthConnectionResult).not.toBeCalled()
				expect(wrapper.vm.items).toMatchSnapshot()
			})
		})

		describe('non OIDC user', () => {
			const localState = { ...state, userHasOidcToken: false }
			it('should show error message', async () => {
				const wrapper = getWrapper(localState)
				expect(wrapper.find(errorLabelSelector).text()).toBe(messages.featureNotAvailable)
				expect(wrapper.find(emptyContentSelector).exists()).toBe(false)
			})
			it('should not call "checkOauthConnectionResult" method', () => {
				getWrapper(localState)
				expect(checkOauthConnectionResult).not.toBeCalled()
			})
		})
	})

	describe.skip('mark as read', () => {
		let axiosSpyGet, wrapper
		beforeEach(() => {
			wrapper = mount(
				Dashboard,
				{
					localVue,
					attachTo: document.body,
					mocks: {
						t: (app, msg) => msg,
						generateUrl() {
							return '/'
						},
					},
					stubs: {
						NcAvatar: true,
					},
					propsData: {
						title: 'dashboard',
					},
				})
			axiosSpyGet = jest.spyOn(axios, 'get')
				.mockImplementation(() => Promise.resolve({
					data: [
						notificationsResponse[0],
					],
				}))
		})
		afterEach(() => {
			axiosSpyGet.mockRestore()
		})
		it('should mark notifications as read', async () => {
			const axiosSpyDelete = jest.spyOn(axios, 'delete')
				.mockImplementationOnce(() => Promise.resolve({}),
				)
			dialogs.showSuccess.mockImplementationOnce()
			await wrapper.vm.fetchNotifications()
			await localVue.nextTick()
			await wrapper.find(dashboardTriggerButtonSelector).trigger('click')
			await localVue.nextTick()
			await wrapper.find(markAsReadButtonSelector).trigger('click')
			await localVue.nextTick()
			expect(axiosSpyDelete).toHaveBeenCalledWith(
				'http://localhost/apps/integration_openproject/work-packages/36/notifications',
			)
			expect(dialogs.showSuccess).toHaveBeenCalledWith(
				'Notifications associated with Work package marked as read',
			)
			wrapper.destroy()
			axiosSpyDelete.mockRestore()
		})
		it('should show an error message if marking as read failed', async () => {
			const axiosSpyDelete = jest.spyOn(axios, 'delete')
				.mockRejectedValueOnce()
			dialogs.showError.mockImplementationOnce()
			await wrapper.vm.fetchNotifications()
			await localVue.nextTick()
			await wrapper.find(dashboardTriggerButtonSelector).trigger('click')
			await localVue.nextTick()
			await wrapper.find(markAsReadButtonSelector).trigger('click')
			await localVue.nextTick()
			expect(dialogs.showError).toHaveBeenCalledWith(
				'Failed to mark notifications as read',
			)
			wrapper.destroy()
			axiosSpyDelete.mockRestore()
		})
	})
})

function getWrapper(data = {}) {
	return shallowMount(
		Dashboard,
		{
			localVue,
			mocks: {
				t: (app, msg) => msg,
				generateUrl() {
					return '/'
				},
			},
			propsData: {
				title: 'dashboard',
			},
			data: () => data,
		})
}
