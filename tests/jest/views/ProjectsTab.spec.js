/* jshint esversion: 8 */

import { shallowMount, mount, createLocalVue } from '@vue/test-utils'
import ProjectsTab from '../../../src/views/ProjectsTab.vue'
import axios from '@nextcloud/axios'
import { STATE } from '../../../src/utils.js'
import workPackagesSearchResponse from '../fixtures/workPackagesSearchResponse.json'
import { workpackageHelper } from '../../../src/utils/workpackageHelper.js'
import { getCurrentUser } from '@nextcloud/auth'

jest.mock('@nextcloud/axios', () => {
	const originalModule = jest.requireActual('@nextcloud/axios')
	return {
		__esModule: true,
		...originalModule,
		default: {
			get: jest.fn(),
			put: jest.fn(),
			post: jest.fn(),
			delete: jest.fn(),
		},
	}
})

jest.mock('@nextcloud/auth', () => {
	const originalModule = jest.requireActual('@nextcloud/auth')

	return {
		__esModule: true,
		...originalModule,
		default: jest.fn(),
		getCurrentUser: jest.fn().mockReturnValue({ uid: 1234 }),
	}
})
jest.mock('@nextcloud/dialogs', () => ({
	getLanguage: jest.fn(() => ''),
	showError: jest.fn(),
	showSuccess: jest.fn(),
}))
jest.mock('@nextcloud/l10n', () => ({
	translate: jest.fn((app, msg) => msg),
	getLanguage: jest.fn(),
}))

jest.mock('@nextcloud/initial-state', () => {
	const originalModule = jest.requireActual('@nextcloud/initial-state')
	return {
		__esModule: true,
		...originalModule,
		default: jest.fn(),
		loadState: jest.fn(() => true),
	}
})

global.OC = {
	dialogs: {
		confirmDestructive: jest.fn(),
		YES_NO_BUTTONS: 70,
	},
}

window.HTMLElement.prototype.scrollIntoView = jest.fn()
const scrollSpy = jest.spyOn(window.HTMLElement.prototype, 'scrollIntoView')

const localVue = createLocalVue()

describe('ProjectsTab.vue', () => {
	let wrapper
	const loadingIndicatorSelector = '.loading-spinner'
	const emptyContentSelector = '#openproject-empty-content'
	const workPackagesSelector = '#openproject-linked-workpackages'
	const existingRelationSelector = '.existing-relations'
	const searchInputStubSelector = 'searchinput-stub'
	const linkedWorkpackageSelector = '.workpackage'
	const workPackageUnlinkSelector = '.linked-workpackages--workpackage--unlinkactionbutton'

	beforeEach(() => {
		jest.useFakeTimers()
		wrapper = shallowMount(ProjectsTab, { localVue })
	})
	describe('search input existence', () => {
		it('should not exist if admin config is not ok', async () => {
			await wrapper.setData({
				isAdminConfigOk: false,
			})
			expect(wrapper.find(searchInputStubSelector).exists()).toBeFalsy()
		})
		it.each([
			{ state: STATE.NO_TOKEN },
			{ state: STATE.CONNECTION_ERROR },
			{ state: STATE.ERROR },
		])('should not exist if the wrapper is not in "ok" state', async (cases) => {
			await wrapper.setData({
				isAdminConfigOk: true,
				state: cases.STATE,
			})
			expect(wrapper.find(searchInputStubSelector).exists()).toBeFalsy()
		})
		it('should exist if the admin config is ok and the wrapper is in "ok" state', async () => {
			await wrapper.setData({
				isAdminConfigOk: true,
				state: STATE.OK,

			})
			expect(wrapper.find(searchInputStubSelector).exists()).toBeTruthy()
		})
	})
	describe('loading icon', () => {
		it('shows the loading icon during "loading" state', async () => {
			wrapper.setData({ state: STATE.LOADING })
			await localVue.nextTick()
			expect(wrapper.find(loadingIndicatorSelector).exists()).toBeTruthy()
		})
		it('does not show the empty content message during "loading" state', async () => {
			wrapper.setData({ state: STATE.LOADING })
			await localVue.nextTick()
			expect(wrapper.find(emptyContentSelector).exists()).toBeFalsy()
		})
		it.each([STATE.OK, STATE.ERROR])('makes the loading icon disappear on state change', async (state) => {
			wrapper.setData({ state: STATE.LOADING })
			await localVue.nextTick()
			expect(wrapper.find(loadingIndicatorSelector).exists()).toBeTruthy()
			wrapper.setData({ state })
			await localVue.nextTick()
			expect(wrapper.find(loadingIndicatorSelector).exists()).toBeFalsy()
		})
		it('sets the state to "loading" on update', async () => {
			const err = new Error()
			err.response = { status: 404 }
			axios.get.mockRejectedValueOnce(err)
			wrapper.setData({ state: STATE.OK })
			expect(wrapper.vm.state).toBe(STATE.OK)
			wrapper.vm.update({ id: 123 })
			expect(wrapper.vm.state).toBe(STATE.LOADING)
		})
	})
	describe('empty content', () => {
		it.each([STATE.NO_TOKEN, STATE.ERROR, STATE.OK])(
			'shows the empty message when state is other than loading',
			async (state) => {
				wrapper.setData({ state })
				await localVue.nextTick()
				expect(wrapper.find(emptyContentSelector).exists()).toBeTruthy()
			},
		)
		it('should set projects as empty when the list of linked work packages are empty', () => {
			expect(wrapper.classes()).toContain('projects--empty')
		})
	})
	describe('fetchWorkpackages', () => {
		let axiosGetSpy = jest.fn()
		beforeEach(() => {
			axiosGetSpy.mockRestore()
			workpackageHelper.clearCache()
		})
		it.each([
			{ HTTPStatus: 400, AppState: STATE.FAILED_FETCHING_WORKPACKAGES },
			{ HTTPStatus: 401, AppState: STATE.NO_TOKEN },
			{ HTTPStatus: 402, AppState: STATE.FAILED_FETCHING_WORKPACKAGES },
			{ HTTPStatus: 404, AppState: STATE.CONNECTION_ERROR },
			{ HTTPStatus: 500, AppState: STATE.ERROR },
		])('sets states according to HTTP error codes', async (cases) => {
			const err = new Error()
			err.response = { status: cases.HTTPStatus }
			axios.get.mockRejectedValueOnce(err)
			await wrapper.vm.update({ id: 123 })
			expect(wrapper.vm.state).toBe(cases.AppState)
		})
		it.each([
			null,
			'string',
			undefined,
			[{ // missing id
				subject: 'subject',
				_links: {
					status: {
						href: '/api/v3/statuses/12',
						title: 'open',
					},
					type: {
						href: '/api/v3/types/6',
						title: 'Task',
					},
					assignee: {
						href: '/api/v3/users/1',
						title: 'Bal Bahadur Pun',
					},
					project: { title: 'a big project' },
				},
			}],
			[{ // empty subject
				id: 123,
				subject: '',
				_links: {
					status: {
						href: '/api/v3/statuses/12',
						title: 'open',
					},
					type: {
						href: '/api/v3/types/6',
						title: 'Task',
					},
					assignee: {
						href: '/api/v3/users/1',
						title: 'Bal Bahadur Pun',
					},
					project: { title: 'a big project' },
				},
			}],
			[{ // missing subject
				id: 123,
				_links: {
					status: {
						href: '/api/v3/statuses/12',
						title: 'open',
					},
					type: {
						href: '/api/v3/types/6',
						title: 'Task',
					},
					assignee: {
						href: '/api/v3/users/1',
						title: 'Bal Bahadur Pun',
					},
					project: { title: 'a big project' },
				},
			}],
			[{ // missing _links.status.title
				id: 123,
				subject: 'my task',
				_links: {
					status: {
						href: '/api/v3/statuses/12',
					},
					type: {
						href: '/api/v3/types/6',
						title: 'Task',
					},
					assignee: {
						href: '/api/v3/users/1',
						title: 'Bal Bahadur Pun',
					},
					project: { title: 'a big project' },
				},
			}],
			[{ // missing project.title
				id: 123,
				subject: 'my task',
				_links: {
					status: {
						href: '/api/v3/statuses/12',
						title: 'open',
					},
					type: {
						href: '/api/v3/types/6',
						title: 'Task',
					},
					assignee: {
						href: '/api/v3/users/1',
						title: 'Bal Bahadur Pun',
					},
					project: { },
				},
			}],
		])('sets the "failed-fetching-workpackages" state on invalid responses', async (testCase) => {
			axios.get
				.mockImplementationOnce(() => Promise.resolve({
					status: 200,
					data: testCase,
				}))
				// mock for color requests, it should not fail because of the missing mock
				.mockImplementation(() => Promise.resolve({ status: 200, data: [] }))
			await wrapper.vm.update({ id: 123 })
			expect(wrapper.vm.state).toBe(STATE.FAILED_FETCHING_WORKPACKAGES)
		})
		it('sets the "ok" state on empty response', async () => {
			axios.get
				.mockImplementation(() => Promise.resolve({ status: 200, data: [] }))
			await wrapper.vm.update({ id: 123 })
			expect(wrapper.vm.state).toBe(STATE.OK)
		})
		it('sets the "error" state if the admin config is not okay', async () => {
			const returnValue = { isAdmin: false }
			getCurrentUser.mockReturnValue(returnValue)
			const wrapper = mountWrapper()
			axios.get
				.mockImplementation(() => Promise.resolve({ status: 200, data: [] }))
			await wrapper.setData({
				isAdminConfigOk: false,
			})
			await wrapper.vm.update({ id: 123 })
			expect(wrapper.vm.state).toBe(STATE.ERROR)
			expect(wrapper).toMatchSnapshot()
		})
		it.each([
			{ statusColor: { color: '#A5D8FF' }, typeColor: { color: '#00B0F0' } },
			{ statusColor: { }, typeColor: { } },
		])('shows the linked workpackages', async (testCase) => {
			wrapper = mountWrapper()
			axiosGetSpy = jest.spyOn(axios, 'get')
				.mockImplementationOnce(() => Promise.resolve({
					status: 200,
					data: [{
						id: 123,
						subject: 'my task',
						_links: {
							status: {
								href: '/api/v3/statuses/12',
								title: 'open',
							},
							type: {
								href: '/api/v3/types/6',
								title: 'Task',
							},
							assignee: {
								href: '/api/v3/users/1',
								title: 'Bal Bahadur Pun',
							},
							project: { title: 'a big project' },
						},
					},
					{
						id: 589,
						subject: 'नेपालमा IT उद्योग बनाउने',
						_links: {
							status: {
								href: '/api/v3/statuses/2',
								title: 'प्रगति हुदैछ',
							},
							type: {
								href: '/api/v3/types/16',
								title: 'Epic',
							},
							assignee: {
								href: '/api/v3/users/13',
								title: 'कुमारी नेपाली',
							},
							project: { title: 'नेपालको विकास गर्ने' },
						},
					}],
				}))
				// mock for color requests
				.mockImplementationOnce(() => Promise.resolve(
					{ status: 200, data: testCase.statusColor }),
				)
				.mockImplementationOnce(() => Promise.resolve(
					{ status: 200, data: testCase.typeColor }),
				)
				.mockImplementationOnce(() => Promise.resolve(
					{ status: 200, data: testCase.statusColor }),
				)
				.mockImplementationOnce(() => Promise.resolve(
					{ status: 200, data: testCase.typeColor }),
				)
			await wrapper.vm.update({ id: 789 })
			expect(axiosGetSpy).toBeCalledWith(
				'http://localhost/apps/integration_openproject/work-packages?fileId=789',
				{},
			)
			expect(axiosGetSpy).toBeCalledWith(
				'http://localhost/apps/integration_openproject/statuses/12',
			)
			expect(axiosGetSpy).toBeCalledWith(
				'http://localhost/apps/integration_openproject/types/6',
			)
			expect(wrapper.vm.state).toBe(STATE.OK)
			const workPackages = wrapper.find(workPackagesSelector)
			expect(wrapper.find(existingRelationSelector).exists()).toBeTruthy()
			expect(workPackages.exists()).toBeTruthy()
			expect(workPackages).toMatchSnapshot()
		})
		it('adds every work-package only once', async () => {
			// this can happen if multiple replies arrive at the same time
			// when the user switches between files while results still loading
			wrapper = mountWrapper()
			axiosGetSpy = jest.spyOn(axios, 'get')
				.mockImplementationOnce(() => Promise.resolve({
					status: 200,
					data: [{
						id: 123,
						subject: 'my task',
						_links: {
							status: {
								href: '/api/v3/statuses/12',
								title: 'open',
							},
							type: {
								href: '/api/v3/types/6',
								title: 'Task',
							},
							assignee: {
								href: '/api/v3/users/1',
								title: 'Bal Bahadur Pun',
							},
							project: { title: 'a big project' },
						},
					},
					{
						id: 123,
						subject: 'my task',
						_links: {
							status: {
								href: '/api/v3/statuses/12',
								title: 'open',
							},
							type: {
								href: '/api/v3/types/6',
								title: 'Task',
							},
							assignee: {
								href: '/api/v3/users/1',
								title: 'Bal Bahadur Pun',
							},
							project: { title: 'a big project' },
						},
					}],
				}))
				.mockImplementation(() => Promise.resolve({
					status: 200,
					data: [],
				}))
			await wrapper.vm.update({ id: 2222 })
			expect(axiosGetSpy).toBeCalledWith(
				'http://localhost/apps/integration_openproject/work-packages?fileId=2222',
				{},
			)
			expect(wrapper.vm.state).toBe(STATE.OK)
			const workPackages = wrapper.find(workPackagesSelector)
			expect(workPackages).toMatchSnapshot()
		})
		it('caches the results for status and type color', async () => {
			wrapper = mountWrapper()
			axiosGetSpy = jest.spyOn(axios, 'get')
				.mockImplementationOnce(() => Promise.resolve({
					status: 200,
					data: [{
						id: 123,
						subject: 'my task',
						_links: {
							status: {
								href: '/api/v3/statuses/12',
								title: 'open',
							},
							type: {
								href: '/api/v3/types/6',
								title: 'Task',
							},
							assignee: {
								href: '/api/v3/users/1',
								title: 'Bal Bahadur Pun',
							},
							project: { title: 'a big project' },
						},
					},
					{
						id: 456,
						subject: 'your task',
						_links: {
							status: {
								href: '/api/v3/statuses/12',
								title: 'open',
							},
							type: {
								href: '/api/v3/types/6',
								title: 'Task',
							},
							assignee: {
								href: '/api/v3/users/1',
								title: 'Bal Bahadur Pun',
							},
							project: { title: 'a big project' },
						},
					}],
				}))
				.mockImplementation(() => Promise.resolve({
					status: 200,
					data: { color: '#FFFFFF' },
				}))
			await wrapper.vm.update({ id: 2222 })

			// there should be only 3 requests even there are 2 WP
			// one request for the wp itself, one for status color one for type color
			expect(axiosGetSpy).toBeCalledTimes(3)
			expect(axiosGetSpy).toHaveBeenNthCalledWith(
				2,
				'http://localhost/apps/integration_openproject/statuses/12',
			)
			expect(axiosGetSpy).toHaveBeenNthCalledWith(
				3,
				'http://localhost/apps/integration_openproject/types/6',
			)
		})
	})
	describe('onSave', () => {
		it('shows the just linked workpackage', async () => {
			wrapper = mountWrapper()
			await wrapper.setData({
				fileInfo: { id: 1234 },
			})
			await localVue.nextTick()
			await wrapper.vm.onSaved(workPackagesSearchResponse[0])
			const workPackages = wrapper.find(workPackagesSelector)
			expect(wrapper.find(existingRelationSelector).exists()).toBeTruthy()
			expect(workPackages.exists()).toBeTruthy()
			expect(workPackages).toMatchSnapshot()
			expect(scrollSpy).toBeCalledTimes(1)
			expect(wrapper.find(linkedWorkpackageSelector).classes()).toContain('workpackage-transition')
			jest.runAllTimers()
			expect(wrapper.find(linkedWorkpackageSelector).classes()).not.toContain('workpackage-transition')
		})
	})
	describe('when the work package is clicked', () => {
		it('opens work package in open project', async () => {
			window.open = jest.fn()
			wrapper = mountWrapper()
			await wrapper.setData({
				workpackages: workPackagesSearchResponse,
				fileInfo: { id: 1234 },
				openprojectUrl: 'http://openproject',
			})
			await localVue.nextTick()
			await wrapper.find(linkedWorkpackageSelector).trigger('click')
			await localVue.nextTick()
			expect(window.open).toHaveBeenCalledTimes(1)
			expect(window.open).toHaveBeenCalledWith(
				'http://openproject/projects/15/work_packages/1',
			)
		})
	})
	describe('when workpackage unlink button is clicked', () => {
		it('should display a confirmation dialog box', async () => {
			wrapper = mountWrapper()
			await wrapper.setData({
				workpackages: workPackagesSearchResponse,
				fileInfo: { id: 1234 },
			})
			await localVue.nextTick()
			await expect(wrapper.find(workPackageUnlinkSelector).exists()).toBeTruthy()
			await wrapper.find(workPackageUnlinkSelector).trigger('click')
			await localVue.nextTick()
			expect(OC.dialogs.confirmDestructive).toHaveBeenCalledTimes(1)
			expect(OC.dialogs.confirmDestructive).toHaveBeenCalledWith(
				'Are you sure you want to unlink the work package?',
				'Confirm unlink',
				{ cancel: 'Cancel', confirm: 'Unlink', confirmClasses: 'error', type: 70 },
				expect.any(Function),
				true,
			)
		})
	})
	describe('unlinkWorkPackage', () => {
		it('should unlink the work package', async () => {
			const axiosGetSpy = jest.spyOn(axios, 'get')
				.mockImplementationOnce(() => Promise.resolve({
					status: 200,
					data: [{
						_type: 'FileLink',
						id: 66,
						createdAt: '2022-04-06T05:14:24Z',
						updatedAt: '2022-04-06T05:14:24Z',
						originData: {
							id: '6',
							name: 'welcome.txt',
							mimeType: 'text/plain',
							createdAt: '1970-01-01T00:00:00Z',
							lastModifiedAt: '2022-03-30T07:39:56Z',
							createdByName: '',
							lastModifiedByName: '',
						},
						_links: {
							delete: {
								href: '/api/v3/file_links/66',
								method: 'delete',
							},
						},
					}],
				}))
			const axiosDeleteSpy = jest.spyOn(axios, 'delete').mockImplementationOnce(() => Promise.resolve(
				{ status: 200 }),
			)
			wrapper = mountWrapper()
			await wrapper.vm.unlinkWorkPackage(15, 6)
			expect(axiosGetSpy).toBeCalledWith(
				'http://localhost/apps/integration_openproject/work-packages/15/file-links',
			)
			expect(axiosDeleteSpy).toBeCalledWith('http://localhost/apps/integration_openproject/file-links/66')
			axiosGetSpy.mockRestore()
			axiosDeleteSpy.mockRestore()
		})

		it.each([
			{ HTTPStatus: 401, state: 'no-token' },
			{ HTTPStatus: 404, state: 'error' },
			{ HTTPStatus: 500, state: 'error' },
		])('sets states according to HTTP error codes', async (cases) => {
			const err = new Error()
			err.response = { status: cases.HTTPStatus }
			axios.get.mockRejectedValueOnce(err)
			wrapper = mountWrapper()

			try {
				await wrapper.vm.unlinkWorkPackage(15, 6)
			} catch (error) {
				expect(wrapper.vm.state).toBe(cases.state)
				expect(error.message).toBe('could not fetch the delete link of work-package')
			}

		})
	})
})

function mountWrapper() {
	return mount(ProjectsTab, {
		localVue,
		attachTo: document.body,
		mocks: {
			t: (app, msg) => msg,
			generateUrl() {
				return '/'
			},
		},
		stubs: {
			SearchInput: true,
			NcAvatar: true,
		},
		data: () => ({
			error: '',
			state: STATE.OK,
			fileInfo: {},
			workpackages: [],
			isAdminConfigOk: true,
		}),
	})
}
