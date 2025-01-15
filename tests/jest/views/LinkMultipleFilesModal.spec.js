/* jshint esversion: 8 */

import { mount, createLocalVue, shallowMount } from '@vue/test-utils'
import LinkMultipleFilesModal from '../../../src/views/LinkMultipleFilesModal.vue'
import { WORKPACKAGES_SEARCH_ORIGIN, STATE } from '../../../src/utils.js'
import { workpackageHelper } from '../../../src/utils/workpackageHelper.js'
import axios from '@nextcloud/axios'
import { getCurrentUser } from '@nextcloud/auth'
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

jest.mock('@nextcloud/initial-state', () => {
	const originalModule = jest.requireActual('@nextcloud/initial-state')
	return {
		__esModule: true,
		...originalModule,
		default: jest.fn(),
		loadState: jest.fn(() => true),
	}
})

const localVue = createLocalVue()

const singleFileInfo = [{
	id: 123,
	name: 'logo.ong',
}]

const multipleFileInfo = [{
	id: 123,
	name: 'logo.ong',
},

{
	id: 456,
	name: 'pogo.ong',
},
{
	id: 789,
	name: 'togo.ong',
}]

describe('LinkMultipleFilesModal.vue', () => {
	const searchInputStubSelector = 'searchinput-stub'
	const ncModalStubSelector = 'ncmodal-stub'
	const loadingIndicatorSelector = '.loading-spinner'
	const emptyContentSelector = '#openproject-empty-content'
	const emptyContentTitleMessageSelector = '.empty-content--message--title'
	const relinkRemainingFilesButtonSelector = '[data-test-id="relink-remaining-files"]'
	beforeEach(() => {
		jest.useFakeTimers()
	})

	describe('modal', () => {
		it('should open when "show" is set to true', async () => {
			const wrapper = shallowMount(LinkMultipleFilesModal, { localVue })
			await wrapper.setData({
				show: false,
			})
			await localVue.nextTick()
			await wrapper.vm.showModal()
			expect(wrapper.find(ncModalStubSelector).exists()).toBeTruthy()
		})

		it('should close when "show" is set to false', async () => {
			const wrapper = shallowMount(LinkMultipleFilesModal, { localVue })
			await localVue.nextTick()
			await wrapper.vm.closeRequestModal()
			expect(wrapper.find(ncModalStubSelector).exists()).toBeFalsy()
		})
	})

	describe('search input existence in modal', () => {
		let wrapper
		beforeEach(() => {
			wrapper = mountWrapper()
		})
		it('should not exist if admin config is not ok', async () => {
			await wrapper.setData({
				state: STATE.OK,
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
		let wrapper
		beforeEach(() => {
			wrapper = mountWrapper()
		})
		it('should show the loading icon during "loading" state', async () => {
			await wrapper.setData({ state: STATE.LOADING })
			await localVue.nextTick()
			expect(wrapper.find(loadingIndicatorSelector).exists()).toBeTruthy()
		})
		it('should not show the empty content message during "loading" state', async () => {
			await wrapper.setData({ state: STATE.LOADING })
			await localVue.nextTick()
			expect(wrapper.find(emptyContentSelector).exists()).toBeFalsy()
		})
		it.each([STATE.OK, STATE.ERROR])('should make the loading icon disappear on state change', async (state) => {
			await wrapper.setData({ state: STATE.LOADING })
			await localVue.nextTick()
			expect(wrapper.find(loadingIndicatorSelector).exists()).toBeTruthy()
			await wrapper.setData({ state })
			await localVue.nextTick()
			expect(wrapper.find(loadingIndicatorSelector).exists()).toBeFalsy()
		})
	})

	describe('empty content', () => {
		let wrapper
		beforeEach(() => {
			wrapper = mountWrapper()
		})
		it.each([STATE.NO_TOKEN, STATE.ERROR, STATE.OK])(
			'shows the empty message when state is other than loading',
			async (state) => {
				await wrapper.setData({ state })
				await localVue.nextTick()
				expect(wrapper.find(emptyContentSelector).exists()).toBeTruthy()
			},
		)

		it('shows message "Add a new link to all selected files" when admin config is okay', async () => {
			wrapper = mount(LinkMultipleFilesModal, {
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
					NcModal: true,
				},
			})
			await wrapper.setData({
				show: true,
				state: STATE.OK,
				isAdminConfigOk: true,
			})
			expect(wrapper.find(emptyContentSelector).exists()).toBeTruthy()
			const titleContent = wrapper.find(emptyContentTitleMessageSelector)
			expect(titleContent.text()).toBe('Add a new link to all selected files')
		})
	})

	describe('fetch workpackages', () => {
		let wrapper
		let axiosGetSpy = jest.fn()
		beforeEach(() => {
			wrapper = mountWrapper()
			axiosGetSpy.mockRestore()
			workpackageHelper.clearCache()
		})
		describe('single file selected', () => {
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
				await wrapper.vm.setFileInfos(singleFileInfo)
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
				await wrapper.vm.setFileInfos(singleFileInfo)
				expect(wrapper.vm.state).toBe(STATE.FAILED_FETCHING_WORKPACKAGES)
			})

			it('sets the "ok" state on empty response', async () => {
				axios.get
					.mockImplementation(() => Promise.resolve({ status: 200, data: [] }))
				await wrapper.vm.setFileInfos(singleFileInfo)
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
				await wrapper.vm.setFileInfos(singleFileInfo)
				expect(wrapper.vm.state).toBe(STATE.ERROR)
				expect(wrapper).toMatchSnapshot()
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
				await wrapper.vm.setFileInfos(singleFileInfo)
				expect(wrapper.vm.state).toBe(STATE.ERROR)
				expect(wrapper).toMatchSnapshot()
			})

			it('should set workpackages to alreadylinked', async () => {
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
				await wrapper.vm.setFileInfos(singleFileInfo)
				expect(axiosGetSpy).toBeCalledWith(
					'http://localhost/apps/integration_openproject/work-packages?fileId=123',
					{},
				)
				expect(wrapper.vm.state).toBe(STATE.OK)
				expect(wrapper.vm.alreadyLinkedWorkPackage.length).toBe(2)
			})
		})

		describe('multiple files selected', () => {
			it('sets the "error" state if the admin config is not okay', async () => {
				const returnValue = { isAdmin: false }
				getCurrentUser.mockReturnValue(returnValue)
				wrapper = mountWrapper()
				axios.get
					.mockImplementation(() => Promise.resolve({ status: 200, data: [] }))
				await wrapper.setData({
					isAdminConfigOk: false,
				})
				await wrapper.vm.setFileInfos(multipleFileInfo)
				expect(wrapper.vm.state).toBe(STATE.ERROR)
				expect(wrapper).toMatchSnapshot()
			})

			it('should not fetch any workpackages', async () => {
				await wrapper.setData({
					isAdminConfigOk: false,
				})
				await wrapper.vm.setFileInfos(multipleFileInfo)
				await expect(axios.get).toBeCalledTimes(0)
			})
		})

		describe('relink remaining multiple selected files', () => {
			const remainingFileInformations = []
			for (let i = 1; i <= 35; i++) {
				remainingFileInformations.push({
					id: i,
					name: `test${i}.txt`,
				})
			}
			// this is the chunking information that get set when there is some error while linking files in chunking
			const chunkingInformations = {
				totalNoOfFilesSelected: 100,
				totalFilesAlreadyLinked: 65,
				totalFilesNotLinked: 35,
				error: true,
				remainingFileInformations,
				selectedWorkPackage: { fileId: 123, id: 999 },
			}
			it('should have a relink remanining files button', async () => {
				const wrapper = mountWrapper()
				await wrapper.setData({
					chunkingInformation: chunkingInformations,
				})
				const relinkRemainingButton = wrapper.find(relinkRemainingFilesButtonSelector)
				expect(relinkRemainingButton.isVisible()).toBe(true)
			})

			describe('on trigger relink remaining files button', () => {
				let postSpy, wrapper
				beforeEach(() => {
					postSpy = jest.spyOn(axios, 'post')
						.mockImplementationOnce(() => Promise.resolve({
							status: 200,
						}))
					wrapper = mountWrapper()
				})
				afterEach(() => {
					axios.post.mockReset()
					dialogs.showSuccess.mockReset()
					dialogs.showError.mockReset()
				})
				it('should send request 2 times to link chunked file to workpackage', async () => {
					await wrapper.setData({
						chunkingInformation: chunkingInformations,
					})
					const relinkRemainingButton = wrapper.find(relinkRemainingFilesButtonSelector)
					await relinkRemainingButton.trigger('click')
					for (let i = 0; i < 5; i++) {
						await localVue.nextTick()
					}
					expect(postSpy).toHaveBeenCalledTimes(2)
				})

				it('should close modal on success', async () => {
					await wrapper.setData({
						chunkingInformation: {
							totalNoOfFilesSelected: 100,
							error: true,
							totalFilesAlreadyLinked: 65,
							totalFilesNotLinked: 35,
							remainingFileInformations,
							selectedWorkPackage: { fileId: 123, id: 999 },
						},
					})
					const relinkRemainingButton = wrapper.find(relinkRemainingFilesButtonSelector)
					await relinkRemainingButton.trigger('click')
					for (let i = 0; i < 5; i++) {
						await localVue.nextTick()
					}
					expect(wrapper.vm.show).toBe(false)
				})

				it('should show error dialog on failure', async () => {
					jest.spyOn(axios, 'post')
						.mockImplementation(() => Promise.reject(new Error('Throw error')))
					dialogs.showError
						.mockImplementationOnce()
					const wrapper = mountWrapper()
					await wrapper.setData({
						chunkingInformation: {
							totalNoOfFilesSelected: 100,
							error: true,
							totalFilesAlreadyLinked: 65,
							totalFilesNotLinked: 35,
							remainingFileInformations,
							selectedWorkPackage: { fileId: 123, id: 999 },
						},
					})
					const relinkRemainingButton = wrapper.find(relinkRemainingFilesButtonSelector)
					await relinkRemainingButton.trigger('click')
					for (let i = 0; i < 5; i++) {
						await localVue.nextTick()
					}
					expect(dialogs.showError).toBeCalledTimes(1)
				})
			})
		})

		describe('close', () => {
			it('should closed the modal', async () => {
				await wrapper.vm.closeRequestModal()
				expect(wrapper.find(ncModalStubSelector).exists()).toBeFalsy()
			})

			it.each([
				[
					'should clean chunkng information',
					null,
				],
				[
					'should clean chunkng information when not empty',
					{},
				],
			])('%s', async (name, chunkingInformation) => {
				await wrapper.setData({
					chunkingInformation,
				})
				await wrapper.vm.closeRequestModal()
				expect(wrapper.vm.chunkingInformation).toBe(null)
			})

			it('should empty "alreadyLinkedWorkPackage", "fileInfos" and close modal', async () => {
				await wrapper.setData({
					fileInfos: singleFileInfo,
					alreadyLinkedWorkPackage: [{
						fileId: 123,
						id: '1',
						subject: 'Organize work-packages',
						project: 'test',
						projectId: '15',
						statusTitle: 'in-progress',
						typeTitle: 'task',
						assignee: 'test',
						statusCol: 'blue',
						typeCol: 'red',
						picture: '/server/index.php/apps/integration_openproject/avatar?userId=1&userName=System',
					}],
				})
				await wrapper.vm.closeRequestModal()
				expect(wrapper.find(ncModalStubSelector).exists()).toBeFalsy()
			})
		})
	})
})
function mountWrapper() {
	return mount(LinkMultipleFilesModal, {
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
			NcModal: true,
			EmptyContent: true,
		},
		data: () => ({
			show: true,
			state: STATE.OK,
			fileInfos: [],
			alreadyLinkedWorkPackage: [],
			isAdminConfigOk: true,
			searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.LINK_MULTIPLE_FILES_MODAL,
			chunkingInformation: null,
		}),
	})
}
