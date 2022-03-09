/* jshint esversion: 8 */

import { shallowMount, mount, createLocalVue } from '@vue/test-utils'
import ProjectsTab from '../../../src/views/ProjectsTab'
import axios from '@nextcloud/axios'
import * as initialState from '@nextcloud/initial-state'
import workPackagesSearchResponse from '../fixtures/workPackagesSearchResponse.json'

jest.mock('@nextcloud/axios')
const localVue = createLocalVue()

describe('ProjectsTab.vue Test', () => {
	let wrapper
	const loadingIndicatorSelector = '.icon-loading'
	const emptyContentSelector = '#openproject-empty-content'
	const workPackagesSelector = '#openproject-linked-workpackages'
	const existingRelationSelector = '.existing-relations'

	beforeEach(() => {
		// eslint-disable-next-line no-import-assign
		initialState.loadState = jest.fn(() => 'https://openproject/oauth/')
		wrapper = shallowMount(ProjectsTab, { localVue })
	})
	describe('loading icon', () => {
		it('shows the loading icon during "loading" state', async () => {
			wrapper.setData({ state: 'loading' })
			await localVue.nextTick()
			expect(wrapper.find(loadingIndicatorSelector).exists()).toBeTruthy()
		})
		it('does not show the empty content message during "loading" state', async () => {
			wrapper.setData({ state: 'loading' })
			await localVue.nextTick()
			expect(wrapper.find(emptyContentSelector).exists()).toBeFalsy()
		})
		it.each(['ok', 'error'])('makes the loading icon disappear on state change', async (state) => {
			wrapper.setData({ state: 'loading' })
			await localVue.nextTick()
			expect(wrapper.find(loadingIndicatorSelector).exists()).toBeTruthy()
			wrapper.setData({ state })
			await localVue.nextTick()
			expect(wrapper.find(loadingIndicatorSelector).exists()).toBeFalsy()
		})
	})
	describe('empty message', () => {
		it.each(['no-token', 'ok', 'error'])('shows the empty message when state is other than loading', async (state) => {
			wrapper.setData({ state })
			await localVue.nextTick()
			expect(wrapper.find(emptyContentSelector).exists()).toBeTruthy()
		})
	})
	describe('fetchWorkpackages', () => {
		it.each([
			{ HTTPStatus: 400, AppState: 'failed-fetching-workpackages' },
			{ HTTPStatus: 401, AppState: 'no-token' },
			{ HTTPStatus: 402, AppState: 'failed-fetching-workpackages' },
			{ HTTPStatus: 404, AppState: 'connection-error' },
			{ HTTPStatus: 500, AppState: 'error' },
		])('sets states according to HTTP error codes', async (cases) => {
			const err = new Error()
			err.response = { status: cases.HTTPStatus }
			axios.get.mockRejectedValueOnce(err)
			await wrapper.vm.update({ id: 123 })
			expect(wrapper.vm.state).toBe(cases.AppState)
		})
		it('shows the linked work packages ', async () => {
			wrapper = mount(ProjectsTab, {
				localVue,
				mocks: {
					t: (msg) => msg,
					generateUrl() {
						return '/'
					},
				},
				stubs: {
					SearchInput: true,
					Avatar: true,
				},
				data: () => ({
					error: '',
					state: 'ok',
					fileInfo: {},
					workpackages: [],
					requestUrl: 'something',
				}),
			})
			await wrapper.vm.onSaved(workPackagesSearchResponse[0])
			const workPackages = wrapper.find(workPackagesSelector)
			expect(wrapper.find(existingRelationSelector).exists()).toBeTruthy()
			expect(workPackages.exists()).toBeTruthy()
			expect(workPackages).toMatchSnapshot()

		})
	})
})
