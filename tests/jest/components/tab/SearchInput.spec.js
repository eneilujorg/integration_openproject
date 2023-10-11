/* jshint esversion: 8 */
import axios from '@nextcloud/axios'
import { createLocalVue, mount } from '@vue/test-utils'
import * as dialogs from '@nextcloud/dialogs'

import SearchInput from '../../../../src/components/tab/SearchInput.vue'
import workPackagesSearchResponse from '../../fixtures/workPackagesSearchResponse.json'
import workPackagesSearchResponseNoAssignee from '../../fixtures/workPackagesSearchResponseNoAssignee.json'
import workPackageSearchReqResponse from '../../fixtures/workPackageSearchReqResponse.json'
import workPackageObjectsInSearchResults from '../../fixtures/workPackageObjectsInSearchResults.json'
import { STATE, WORKPACKAGES_SEARCH_ORIGIN } from '../../../../src/utils.js'
import * as initialState from '@nextcloud/initial-state'
import { workpackageHelper } from '../../../../src/utils/workpackageHelper.js'

jest.mock('@nextcloud/axios')
jest.mock('@nextcloud/dialogs')
jest.mock('@nextcloud/l10n', () => ({
	translate: jest.fn((app, msg) => msg),
	getLanguage: jest.fn(() => ''),
}))
jest.mock('lodash/debounce', () =>
	jest.fn(fn => {
		fn.cancel = jest.fn()
		return fn
	})
)

// eslint-disable-next-line no-import-assign,import/namespace
initialState.loadState = jest.fn(() => {
	return {
		openproject_instance_url: null,
	}
})

global.t = (app, text) => text

const localVue = createLocalVue()
const simpleWorkPackageSearchResponse = [{
	id: 1,
	subject: 'some subject',
	_links: {
		assignee: {
			title: 'some assignee',
			href: 'http://href/0/',
		},
		status: {
			title: 'some status',
			href: 'http://href/1/',
		},
		type: {
			title: 'some type',
			href: 'http://href/2/',
		},
		project: {
			title: 'some project',
			href: 'http://href/3/',
		},
	},
}]

describe('SearchInput.vue', () => {
	let wrapper

	const stateSelector = '.stateMsg'
	const workpackagesListSelector = '[role="listbox"]'
	const workPackageStubSelector = 'workpackage-stub'
	const inputSelector = '.searchInput input'
	const assigneeSelector = '.filterAssignee'
	const loadingIconSelector = '.vs__spinner'
	const firstWorkPackageSelector = '.searchInput .vs__dropdown-option'

	afterEach(() => {
		wrapper.destroy()
		jest.clearAllMocks()
		jest.restoreAllMocks()
	})

	describe('state messages', () => {
		it.each([STATE.NO_TOKEN, STATE.ERROR, 'any'])('%s: should display the correct state message', async (state) => {
			wrapper = mountSearchInput()
			await wrapper.setData({ state })
			expect(wrapper.find(stateSelector)).toMatchSnapshot()
		})
	})

	describe('work packages select', () => {
		describe('search input', () => {
			it('should reset the state if search value length becomes lesser than search char limit', async () => {
				const axiosSpy = jest.spyOn(axios, 'get')
					.mockImplementationOnce(() => Promise.resolve({
						status: 200,
						data: [],
					}))
				wrapper = mountSearchInput()
				const inputField = wrapper.find(inputSelector)
				await wrapper.setData({
					searchResults: [{
						someData: 'someData',
					}],
				})
				await wrapper.setData({
					state: STATE.LOADING,
				})
				await inputField.setValue('a')
				await inputField.setValue('')

				expect(wrapper.vm.searchResults).toMatchObject([])
				expect(wrapper.vm.state).toBe(STATE.OK)
				axiosSpy.mockRestore()
			})
			it.each([
				{
					search: '',
					expectedCallCount: 0,
				},
				{
					search: 'o',
					expectedCallCount: 1,
				},
				{
					search: 'or',
					expectedCallCount: 1,
				},
			])('should send search request only if the search text is greater than or equal to the search char limit', async ({
				search,
				expectedCallCount,
			}) => {
				const axiosSpy = jest.spyOn(axios, 'get')
					.mockImplementationOnce(() => Promise.resolve({
						status: 200,
						data: [],
					}))
				wrapper = mountSearchInput()
				await wrapper.setProps({
					searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB,
				})
				const inputField = wrapper.find(inputSelector)
				await inputField.setValue(search)
				expect(axiosSpy).toHaveBeenCalledTimes(expectedCallCount)
				axiosSpy.mockRestore()
			})
			it('should include the search text in the search payload', async () => {
				const axiosSpy = jest.spyOn(axios, 'get')
					.mockImplementationOnce(() => Promise.resolve({
						status: 200,
						data: [],
					}))
				wrapper = mountSearchInput()
				await wrapper.setProps({
					searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB,
				})
				const inputField = wrapper.find(inputSelector)
				await inputField.setValue('orga')

				expect(axiosSpy).toHaveBeenCalledTimes(1)
				expect(axiosSpy).toHaveBeenCalledWith(
					expect.stringContaining('work-packages'),
					{
						params: {
							searchQuery: 'orga',
							isSmartPicker: false,
						},
					},
				)
				axiosSpy.mockRestore()
			})
			it('should log an error on invalid payload', async () => {
				const axiosSpy = jest.spyOn(axios, 'get')
					.mockImplementationOnce(() => Promise.resolve({
						status: 200,
						data: [{
							id: 123,
						}],
					}))
				const consoleMock = jest.spyOn(console, 'error')
					.mockImplementationOnce(() => {})
				wrapper = mountSearchInput()
				await wrapper.setProps({
					searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB,
				})
				const inputField = wrapper.find(inputSelector)
				await inputField.setValue('orga')
				await localVue.nextTick()
				expect(consoleMock).toHaveBeenCalledWith('could not process work package data')
				consoleMock.mockRestore()
				axiosSpy.mockRestore()
			})
		})

		describe('search list', () => {
			beforeEach(async () => {
				wrapper = mountSearchInput()
				await wrapper.setProps({
					searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB,
				})
			})
			it('should not be displayed if the search results is empty', async () => {
				await wrapper.setData({
					searchResults: [],
				})
				const ncSelectContent = wrapper.find(workpackagesListSelector)
				expect(ncSelectContent).toMatchSnapshot()
			})
			it('should display correct options list of search results', async () => {
				jest.spyOn(axios, 'get')
					.mockImplementationOnce(() => Promise.resolve({
						status: 200,
						data: [],
					}))
				wrapper = mountSearchInput({ id: 1234, name: 'file.txt' })
				await wrapper.setProps({
					searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB,
				})
				const inputField = wrapper.find(inputSelector)
				await inputField.setValue(' ')
				await wrapper.setData({
					searchResults: workPackagesSearchResponse,
				})
				const ncSelectContent = wrapper.find(workpackagesListSelector)
				expect(ncSelectContent.exists()).toBeTruthy()
				const workPackages = ncSelectContent.findAll(workPackageStubSelector)
				expect(workPackages).toHaveLength(workPackagesSearchResponse.length)
				for (let i = 0; i < workPackagesSearchResponse.length; i++) {
					expect(workPackages.at(i).props()).toMatchSnapshot()
				}
			})
			it('should not display the "avatar" and "name" if the "assignee" is not present in a work package', async () => {
				await wrapper.setData({
					searchResults: workPackagesSearchResponseNoAssignee,
				})
				const assignee = wrapper.find(assigneeSelector)
				expect(assignee.exists()).toBeFalsy()
			})
			it('should only use the options from the latest search response', async () => {
				jest.spyOn(axios, 'get')
					.mockImplementationOnce(() => Promise.resolve({
						status: 200,
						data: [],
					}))
				wrapper = mountSearchInput({ id: 111, name: 'file.txt' })
				await wrapper.setProps({
					searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB,
				})
				const inputField = wrapper.find(inputSelector)
				await inputField.setValue(' ')
				await wrapper.setData({
					searchResults: workPackageObjectsInSearchResults,
				})
				expect(wrapper.findAll(workPackageStubSelector).length).toBe(3)
				const axiosSpy = jest.spyOn(axios, 'get')
					.mockImplementationOnce(() => Promise.resolve({
						status: 200,
						data: simpleWorkPackageSearchResponse,
					}))
					.mockImplementation(() => Promise.resolve({
						data: [],
						status: 200,
					}))
				await inputField.setValue('orga')
				for (let i = 0; i <= 10; i++) {
					await wrapper.vm.$nextTick()
				}
				const workPackages = wrapper.findAll(workPackageStubSelector)
				expect(workPackages.length).toBe(simpleWorkPackageSearchResponse.length)
				for (let i = 0; i < workPackages.length; i++) {
					expect(workPackages.at(i).props()).toMatchSnapshot()
				}
				axiosSpy.mockRestore()
			})
			it('should not display work packages that are already linked', async () => {
				wrapper = mountSearchInput({ id: 111 },
					[
						{
							fileId: 111,
							id: 1,
							subject: 'One',
						},
						{
							fileId: 111,
							id: 13,
							subject: 'Write a software',
						},
					])
				await wrapper.setProps({
					searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB,
				})
				const axiosSpy = jest.spyOn(axios, 'get')
					.mockImplementationOnce(() => Promise.resolve({
						status: 200,
						data: workPackageObjectsInSearchResults,
					}))
					// any other requests e.g. for types and statuses
					.mockImplementation(() => Promise.resolve(
						{ status: 200, data: [] })
					)

				const inputField = wrapper.find(inputSelector)
				await inputField.setValue('anything longer than 3 char')
				for (let i = 0; i < 9; i++) {
					await localVue.nextTick()
				}

				// id no 13 is already in workpackages and also in the response
				// so it should not be visible in the search results
				expect(wrapper.vm.searchResults).toMatchObject(
					[
						{
							assignee: 'System',
							id: 2,
							picture: 'http://localhost/apps/integration_openproject/avatar?userId=1&userName=System',
							project: 'Demo project',
							statusCol: '',
							statusTitle: 'In progress',
							subject: 'Organize open source conference',
							typeCol: '',
							typeTitle: 'Phase',
						},
						{
							assignee: 'System',
							id: 5,
							picture: 'http://localhost/apps/integration_openproject/avatar?userId=1&userName=System',
							project: 'Demo project',
							statusCol: '',
							statusTitle: 'In progress',
							subject: 'Create a website',
							typeCol: '',
							typeTitle: 'Phase',
						},
					],
				)
				axiosSpy.mockRestore()
			})

			it('should not display work packages that are already in the search results', async () => {
				// this case can happen if multiple search are running in parallel and returning its results
				const axiosSpy = jest.spyOn(axios, 'get')
					.mockImplementationOnce(() => Promise.resolve({
						status: 200,
						data: workPackageSearchReqResponse,
					}))
					.mockImplementation(() => Promise.resolve(
						{ status: 200, data: [] })
					)
				await wrapper.setData({
					fileInfo: { id: 111 },
					searchResults: [{
						fileId: 111,
						id: 2,
						subject: 'Organize open source conference',
					}],
				})
				wrapper.vm.$parent.workpackages = []

				const inputField = wrapper.find(inputSelector)
				await inputField.setValue('anything longer than 3 char')
				for (let i = 0; i < 8; i++) {
					await localVue.nextTick()
				}

				expect(wrapper.vm.searchResults).toMatchObject(
					[
						{
							// this comes from the old search results and not from the response
							id: 2,
							subject: 'Organize open source conference',
						},
						{
							assignee: 'System',
							id: 13,
							picture: 'http://localhost/apps/integration_openproject/avatar?userId=1&userName=System',
							project: 'Demo project',
							statusCol: '',
							statusTitle: 'In progress',
							subject: 'Write a software',
							typeCol: '',
							typeTitle: 'Phase',
						},
						{
							assignee: 'System',
							id: 5,
							picture: 'http://localhost/apps/integration_openproject/avatar?userId=1&userName=System',
							project: 'Demo project',
							statusCol: '',
							statusTitle: 'In progress',
							subject: 'Create a website',
							typeCol: '',
							typeTitle: 'Phase',
						},
					],
				)
				axiosSpy.mockRestore()
			})
			it.each(
				[STATE.NO_TOKEN, STATE.ERROR, STATE.OK]
			)(
				'should only add work packages to the list in loading state',
				async (state) => {
					wrapper = mountSearchInput({})
					const axiosSpy = jest.spyOn(axios, 'get')
						.mockImplementationOnce(() => Promise.resolve({
							status: 200,
							data: workPackageSearchReqResponse,
						}))
					// any other requests e.g. for types and statuses
						.mockImplementation(() => Promise.resolve(
							{ status: 200, data: [] })
						)

					const inputField = wrapper.find(inputSelector)
					await inputField.setValue('anything longer than 3 char')
					await wrapper.setData({ state })
					for (let i = 0; i < 9; i++) {
						await localVue.nextTick()
					}

					expect(wrapper.vm.searchResults).toMatchObject([])
					axiosSpy.mockRestore()
				})
		})

		describe('loading icon', () => {
			it('should be displayed when the wrapper is in "loading" state', async () => {
				wrapper = mountSearchInput()
				const loadingIcon = wrapper.find(loadingIconSelector)
				expect(loadingIcon.attributes().style).toBe('display: none;')
				await wrapper.setData({
					state: STATE.LOADING,
				})
				await localVue.nextTick()
				expect(wrapper.find(loadingIconSelector).exists()).toBeFalsy()
			})
		})

		describe('click on a workpackage option', () => {
			let axiosGetSpy
			beforeEach(async () => {
				axiosGetSpy = jest.spyOn(axios, 'get')
					.mockImplementationOnce(() => Promise.resolve({
						status: 200,
						data: [],
					}))
				wrapper = mountSearchInput({ id: 111, name: 'file.txt' })
				await wrapper.setProps({
					searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB,
				})
				const inputField = wrapper.find(inputSelector)
				await inputField.setValue('orga')
				await wrapper.setData({
					searchResults: [{
						fileId: 111,
						id: 999,
					}],
				})
			})
			afterEach(() => {
				axiosGetSpy.mockRestore()
			})
			it('should emit an action', async () => {
				const ncSelectItem = wrapper.find(firstWorkPackageSelector)
				await ncSelectItem.trigger('click')
				const savedEvent = wrapper.emitted('saved')
				expect(savedEvent).toHaveLength(1)
				expect(savedEvent[0]).toEqual([{ fileId: 111, id: 999 }])
			})
			it('should send a request to link file to workpackage', async () => {
				const postSpy = jest.spyOn(axios, 'post')
					.mockImplementationOnce(() => Promise.resolve({
						status: 200,
					}))
				const ncSelectItem = wrapper.find(firstWorkPackageSelector)
				await ncSelectItem.trigger('click')
				const body = {
					values: {
						workpackageId: 999,
						fileinfo: [
							{
								id: 111,
								name: 'file.txt',
							},
						],
					},
				}
				expect(postSpy).toBeCalledWith(
					'http://localhost/apps/integration_openproject/work-packages',
					body,
					{ headers: { 'Content-Type': 'application/json' } }
				)
				postSpy.mockRestore()
			})
			it('should reset the state of the search input', async () => {
				const ncSelectItem = wrapper.find(firstWorkPackageSelector)
				expect(wrapper.vm.searchResults.length).toBe(1)
				expect(wrapper.find('input').element.value).toBe('orga')
				await ncSelectItem.trigger('click')
				expect(wrapper.vm.searchResults.length).toBe(0)
				expect(wrapper.find('input').element.value).toBe('')

			})
			it('should show an error when linking fails', async () => {
				const err = new Error()
				err.response = { status: 422 }
				axios.post.mockRejectedValueOnce(err)
				const showErrorSpy = jest.spyOn(dialogs, 'showError')
				const ncSelectItem = wrapper.find(firstWorkPackageSelector)
				await ncSelectItem.trigger('click')
				await localVue.nextTick()
				expect(showErrorSpy).toBeCalledTimes(1)
				showErrorSpy.mockRestore()
			})
		})

		describe('fileInfo prop', () => {
			it('should reset the input state when the prop is changed', async () => {
				wrapper = mountSearchInput({ id: 111, name: 'file.txt' }, [], {
					searchResults: [{
						id: 999,
					}],
					selectedId: ['999'],
					state: STATE.LOADING,
				})
				await wrapper.setProps({
					fileInfo: { id: 222, name: 'file2.txt' },
				})
				const inputField = wrapper.find(inputSelector)
				expect(inputField.element.value).toBe('')
				expect(wrapper.vm.searchResults).toMatchObject([])
				expect(wrapper.vm.state).toBe(STATE.OK)
			})
		})
	})

	describe('search with smartpicker', () => {
		let axiosGetSpy
		beforeEach(async () => {
			axiosGetSpy = jest.spyOn(axios, 'get')
				.mockImplementationOnce(() => Promise.resolve({
					status: 200,
					data: [],
				}))
			wrapper = mountSearchInput()
			const inputField = wrapper.find(inputSelector)
			await inputField.setValue('orga')
			await wrapper.setData({
				searchResults: [{
					id: 999,
					projectId: 1,
				}],
				openprojectUrl: 'https://openproject.com',
			})
			await localVue.nextTick()
			await wrapper.setProps({
				isSmartPicker: true,
			})
			await localVue.nextTick()
		})
		afterEach(() => {
			axiosGetSpy.mockRestore()
		})
		it('should emit an action', async () => {
			const ncSelectItem = wrapper.find(firstWorkPackageSelector)
			await ncSelectItem.trigger('click')
			const savedEvent = wrapper.emitted('submit')
			expect(savedEvent).toHaveLength(1)
			expect(savedEvent[0][0]).toEqual('https://openproject.com/wp/999')
		})

		it('should not send a request to link file to workpackage', async () => {
			const postSpy = jest.spyOn(axios, 'post')
				.mockImplementationOnce(() => Promise.resolve({
					status: 200,
				}))
			const ncSelectItem = wrapper.find(firstWorkPackageSelector)
			await ncSelectItem.trigger('click')
			expect(postSpy).not.toBeCalled()
			postSpy.mockRestore()
		})
	})

	describe('search from multiple files link modal', () => {
		const singleFileInfo = [{
			id: 123,
			name: 'logo.png',
		}]

		const multipleFileInfos = [{
			id: 123,
			name: 'logo.png',
		},
		{
			id: 456,
			name: 'pogo.png',
		}]
		describe('single file selected', () => {
			describe('select a work package for linking', () => {
				let axiosGetSpy
				beforeEach(async () => {
					axiosGetSpy = jest.spyOn(axios, 'get')
						.mockImplementationOnce(() => Promise.resolve({
							status: 200,
							data: [],
						}))
					wrapper = mountSearchInput(singleFileInfo)
					await wrapper.setProps({
						searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.LINK_MULTIPLE_FILES_MODAL,
					})
					const inputField = wrapper.find(inputSelector)
					await inputField.setValue('orga')
					await wrapper.setData({
						searchResults: [{
							fileId: 123,
							id: 999,
						}],
					})
				})
				afterEach(() => {
					axiosGetSpy.mockRestore()
				})
				it('should send a request to link file to workpackage', async () => {
					const postSpy = jest.spyOn(axios, 'post')
						.mockImplementationOnce(() => Promise.resolve({
							status: 200,
						}))
					const ncSelectItem = wrapper.find(firstWorkPackageSelector)
					await ncSelectItem.trigger('click')
					const body = {
						values: {
							workpackageId: 999,
							fileinfo: singleFileInfo,
						},
					}
					expect(postSpy).toBeCalledWith(
						'http://localhost/apps/integration_openproject/work-packages',
						body,
						{ headers: { 'Content-Type': 'application/json' } }
					)
					postSpy.mockRestore()
				})

				it('should show an error when linking fails', async () => {
					const err = new Error()
					err.response = { status: 422 }
					axios.post.mockRejectedValueOnce(err)
					const showErrorSpy = jest.spyOn(dialogs, 'showError')
					const ncSelectItem = wrapper.find(firstWorkPackageSelector)
					await ncSelectItem.trigger('click')
					await localVue.nextTick()
					expect(showErrorSpy).toBeCalledTimes(1)
					showErrorSpy.mockRestore()
				})

				it('should not display work packages that are already linked', async () => {
					const axiosSpy = jest.spyOn(axios, 'get')
						.mockImplementationOnce(() => Promise.resolve({
							status: 200,
							data: workPackageSearchReqResponse,
						}))
						.mockImplementation(() => Promise.resolve(
							{ status: 200, data: [] })
						)
					await wrapper.setProps({
						linkedWorkPackages: [{
							fileId: 123,
							id: 2,
							subject: 'Organize open source conference',
						}],
					})

					const inputField = wrapper.find(inputSelector)
					await inputField.setValue('anything longer than 3 char')
					for (let i = 0; i < 8; i++) {
						await localVue.nextTick()
					}
					expect(wrapper.vm.searchResults).toMatchObject(
						[
							{
								assignee: 'System',
								id: 13,
								picture: 'http://localhost/apps/integration_openproject/avatar?userId=1&userName=System',
								project: 'Demo project',
								statusCol: '',
								statusTitle: 'In progress',
								subject: 'Write a software',
								typeCol: '',
								typeTitle: 'Phase',
							},
							{
								assignee: 'System',
								id: 5,
								picture: 'http://localhost/apps/integration_openproject/avatar?userId=1&userName=System',
								project: 'Demo project',
								statusCol: '',
								statusTitle: 'In progress',
								subject: 'Create a website',
								typeCol: '',
								typeTitle: 'Phase',
							},
						],
					)
					axiosSpy.mockRestore()
				})

			})

			describe('multiple files selected', () => {
				describe('less than 20', () => {
					describe('select a work package for linking', () => {
						let axiosGetSpy
						beforeEach(async () => {
							axiosGetSpy = jest.spyOn(axios, 'get')
								.mockImplementationOnce(() => Promise.resolve({
									status: 200,
									data: [],
								}))
							wrapper = mountSearchInput(multipleFileInfos)
							await wrapper.setProps({
								searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.LINK_MULTIPLE_FILES_MODAL,
							})
							const inputField = wrapper.find(inputSelector)
							await inputField.setValue('orga')
							await wrapper.setData({
								searchResults: [{
									fileId: 123,
									id: 999,
								}],
							})
						})
						afterEach(() => {
							axiosGetSpy.mockRestore()
						})
						it('should send a request to link file to workpackage', async () => {
							const postSpy = jest.spyOn(axios, 'post')
								.mockImplementationOnce(() => Promise.resolve({
									status: 200,
								}))
							const ncSelectItem = wrapper.find(firstWorkPackageSelector)
							await ncSelectItem.trigger('click')
							const body = {
								values: {
									workpackageId: 999,
									fileinfo: multipleFileInfos,
								},
							}
							expect(postSpy).toBeCalledWith(
								'http://localhost/apps/integration_openproject/work-packages',
								body,
								{ headers: { 'Content-Type': 'application/json' } }
							)
							postSpy.mockRestore()
						})

						it('should show an error when linking fails', async () => {
							const err = new Error()
							err.response = { status: 422 }
							axios.post.mockRejectedValueOnce(err)
							const showErrorSpy = jest.spyOn(dialogs, 'showError')
							const ncSelectItem = wrapper.find(firstWorkPackageSelector)
							await ncSelectItem.trigger('click')
							await localVue.nextTick()
							expect(showErrorSpy).toBeCalledTimes(1)
							showErrorSpy.mockRestore()
						})

						it('should display work packages that are already linked', async () => {
							const axiosSpy = jest.spyOn(axios, 'get')
								.mockImplementationOnce(() => Promise.resolve({
									status: 200,
									data: workPackageSearchReqResponse,
								}))
								.mockImplementation(() => Promise.resolve(
									{ status: 200, data: [] })
								)
							await wrapper.setProps({
								// here already linked package is empty when the file selected files is more than 1
								linkedWorkPackages: [],
							})

							const inputField = wrapper.find(inputSelector)
							await inputField.setValue('anything longer than 3 char')
							for (let i = 0; i < 8; i++) {
								await localVue.nextTick()
							}
							expect(wrapper.vm.searchResults).toMatchObject(
								[
									{
										assignee: 'System',
										id: 2,
										picture: 'http://localhost/apps/integration_openproject/avatar?userId=1&userName=System',
										project: 'Demo project',
										statusCol: '',
										statusTitle: 'In progress',
										subject: 'Organize open source conference',
										typeCol: '',
										typeTitle: 'Phase',
									},
									{
										assignee: 'System',
										id: 13,
										picture: 'http://localhost/apps/integration_openproject/avatar?userId=1&userName=System',
										project: 'Demo project',
										statusCol: '',
										statusTitle: 'In progress',
										subject: 'Write a software',
										typeCol: '',
										typeTitle: 'Phase',
									},
									{
										assignee: 'System',
										id: 5,
										picture: 'http://localhost/apps/integration_openproject/avatar?userId=1&userName=System',
										project: 'Demo project',
										statusCol: '',
										statusTitle: 'In progress',
										subject: 'Create a website',
										typeCol: '',
										typeTitle: 'Phase',
									},
								],
							)
							axiosSpy.mockRestore()
						})
					})
				})

				describe('more than 20 with chunk', () => {
					/*
						For the test of linking multiple files more than 20
						This test scenario create a file information of 55 which is used through the whole test for the link with chunking
						It means the file will get hchunked as [20, 20, 25]
					 */
					let multipleFilesForChunking = []
					for(let i = 1; i<=55; i++) {
						multipleFilesForChunking.push({
							id: i,
							name: `test${i}.txt`
						})
					}

					it('should chunk file information in 20', async () => {
						wrapper = mountSearchInput()
						const chunkedInformation = workpackageHelper.chunkMultipleSelectedFilesInformation(multipleFilesForChunking)
						expect(chunkedInformation.length).toBe(3)
						for(let i = 0; i < chunkedInformation.length; i ++) {
							if(i === chunkedInformation.length - 1) {
								expect(chunkedInformation[i].length).toBe(15)
							} else {
								expect(chunkedInformation[i].length).toBe(20)
							}
						}
					})

					describe('select a work package for linking', () => {
						let axiosGetSpy
						beforeEach(async () => {
							axiosGetSpy = jest.spyOn(axios, 'get')
								.mockImplementationOnce(() => Promise.resolve({
									status: 200,
									data: [],
								}))
							wrapper = mountSearchInput(multipleFilesForChunking)
							await wrapper.setProps({
								searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.LINK_MULTIPLE_FILES_MODAL,
							})
							const inputField = wrapper.find(inputSelector)
							await inputField.setValue('orga')
							await wrapper.setData({
								searchResults: [{
									fileId: 123,
									id: 999,
								}],
							})
						})
						afterEach(() => {
							axiosGetSpy.mockRestore()
						})
						it('should send request 3 times to link chunked file to workpackage', async () => {
							const postSpy = jest.spyOn(axios, 'post')
								.mockImplementationOnce(() => Promise.resolve({
									status: 200,
								}))
							const ncSelectItem = wrapper.find(firstWorkPackageSelector)
							await ncSelectItem.trigger('click')
							for(let i = 0 ; i < 5; i++) {
								await localVue.nextTick()
							}
							expect(postSpy).toHaveBeenCalledTimes(3)
						})

						it('should emit event "get-chunked-informations" for 3 times', async () => {
							const postSpy = jest.spyOn(axios, 'post')
								.mockImplementationOnce(() => Promise.resolve({
									status: 200,
								}))
							const spyOnEmit = jest.spyOn(wrapper.vm, '$emit');
							const ncSelectItem = wrapper.find(firstWorkPackageSelector)
							await ncSelectItem.trigger('click')
							for(let i = 0 ; i < 5; i++) {
								await localVue.nextTick()
							}
							expect(postSpy).toHaveBeenCalledTimes(3)
							expect(spyOnEmit).toHaveBeenCalledTimes(3)
						})

						it('should emit event "get-chunked-informations" with data', async () => {
							let emittedData;
							const postSpy = jest.spyOn(axios, 'post')
								.mockImplementationOnce(() => Promise.resolve({
									status: 200,
								}))
							const spyOnEmit = jest.spyOn(wrapper.vm, '$emit').mockImplementation((event, data) => {
								emittedData = data;
							});
							const ncSelectItem = wrapper.find(firstWorkPackageSelector)
							await ncSelectItem.trigger('click')
							for(let i = 0 ; i < 5; i++) {
								await localVue.nextTick()
							}
							expect(spyOnEmit).toHaveBeenCalledTimes(3)
							expect(emittedData.totalFilesAlreadyLinked).toBe(multipleFilesForChunking.length)
						})

						it.each([
							[
								'should set chunk error true',
								{
									key: "isChunkingError",
									value: true,
								},
							],
							[
								'should set alreadylinked files to 40',
								{
									key: "totalFilesAlreadyLinked",
									value: 40,
								},
							],
							[
								'should set files not linked to 2',
								{
									key: "totalFilesNotLinked",
									value: 15,
								},
							]
						])('%s when request fails', async (name, expectedData) => {
							/*
							Here the emmited chunking information data will be as
							emittedData = {
							 	totalNoOfFilesSelected: number,
							 	totalFilesAlreadyLinked: number,
							 	totalFilesNotLinked: number,
							 	isChunkingError: bool,
							 	remainingFileInformations: Array,
							 	selectedWorkPackage: Object
							 }
							*/
							let emittedData
							// rejects the 3rd request
							const postSpy = jest.spyOn(axios, 'post')
								.mockImplementationOnce(() => Promise.resolve({
									status: 200,
								}))
								.mockImplementationOnce(() => Promise.resolve({
									status: 200,
								}))
								.mockImplementation(() => Promise.reject({}))
							const spyOnEmit = jest.spyOn(wrapper.vm, '$emit').mockImplementation((event, data) => {
								emittedData = data;
							});
							const ncSelectItem = wrapper.find(firstWorkPackageSelector)
							await ncSelectItem.trigger('click')
							for(let i = 0 ; i < 5; i++) {
								await localVue.nextTick()
							}
							const expectedKey = expectedData.key
							expect(emittedData[expectedKey]).toBe(expectedData.value)
						})

						it('should set length of remaining files to 15', async () => {
							let emittedData;
							// rejects the 3rd request
							const postSpy = jest.spyOn(axios, 'post')
								.mockImplementationOnce(() => Promise.resolve({
									status: 200,
								}))
								.mockImplementationOnce(() => Promise.resolve({
									status: 200,
								}))
								.mockImplementation(() => Promise.reject({}))
							const spyOnEmit = jest.spyOn(wrapper.vm, '$emit').mockImplementation((event, data) => {
								emittedData = data;
							});
							const ncSelectItem = wrapper.find(firstWorkPackageSelector)
							await ncSelectItem.trigger('click')
							for(let i = 0 ; i < 5; i++) {
								await localVue.nextTick()
							}
							expect(emittedData.remainingFileInformations.length).toBe(15)
						})

						it('should retry once if a request to link fails', async () => {
							const postSpy = jest.spyOn(axios, 'post')
								.mockImplementationOnce(() => {
									throw new Error('Throw error to retry once');
								})
								.mockImplementation(() => {
									status: 200
								});
							const ncSelectItem = wrapper.find(firstWorkPackageSelector)
							await ncSelectItem.trigger('click')
							for(let i = 0 ; i < 5; i++) {
								await localVue.nextTick()
							}
							// here 'makeRequestToLinkFilesToWorkPackage' is called 4 times since the chunk is [20,20,15] 3 times and 1 is added for retry since it fails for the first time
							expect(postSpy).toHaveBeenCalledTimes(4)
						})

						it('should not retry again if the retry it self fails', async () => {
							const postSpy = jest.spyOn(axios, 'post')
								.mockImplementation(() => Promise.reject())
							const ncSelectItem = wrapper.find(firstWorkPackageSelector)
							await ncSelectItem.trigger('click')
							for(let i = 0 ; i < 5; i++) {
								await localVue.nextTick()
							}
							// here the post is called 2 times (1 extra for retry)
							expect(postSpy).toHaveBeenCalledTimes(2)
						})
					})
				})
			})
		})
	})
})

function mountSearchInput(fileInfo = {}, linkedWorkPackages = [], data = {}) {
	return mount(SearchInput, {
		localVue,
		mocks: {
			t: (msg) => msg,
			generateUrl() {
				return '/'
			},
		},
		data: () => ({
			...data,
		}),
		stubs: {
			NcAvatar: true,
			WorkPackage: true,
		},
		propsData: {
			fileInfo,
			linkedWorkPackages,
		},
	})
}
