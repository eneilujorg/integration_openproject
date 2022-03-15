/* jshint esversion: 8 */

import { shallowMount, createLocalVue } from '@vue/test-utils'
import OAuthConnectButton from '../../../src/components/OAuthConnectButton.vue'
import axios from '@nextcloud/axios'
import * as dialogs from '@nextcloud/dialogs'

jest.mock('@nextcloud/axios')
jest.mock('@nextcloud/dialogs')

const { location } = window
const localVue = createLocalVue()

describe('OAuthConnectButton.vue Test', () => {
	let wrapper
	let generateCodeChallengeSpy
	afterEach(() => {
		window.location = location
		jest.clearAllMocks()
	})
	describe('when admin config status is not ok', () => {
		it('should show message', async () => {
			wrapper = getWrapper({ adminConfigStatus: false })
			expect(wrapper).toMatchSnapshot()
		})
	})
	describe('when admin config status is ok', () => {
		beforeEach(() => {
			delete window.location
			window.location = { replace: jest.fn() }
			OAuthConnectButton.methods.digest = jest.fn(
				() => Promise.resolve(new ArrayBuffer(8))
			)
			generateCodeChallengeSpy = jest.spyOn(
				OAuthConnectButton.methods, 'generateCodeChallenge'
			)
			wrapper = getWrapper({ adminConfigStatus: true })
		})
		describe('on successful saving of the state & challenge', () => {
			beforeEach(() => {
				axios.put.mockImplementationOnce(() =>
					Promise.resolve({}),
				)
			})
			it('saves the state to user config', async () => {
				wrapper.find('button').trigger('click')
				await localVue.nextTick()
				expect(axios.put).toHaveBeenCalledWith(
					'http://localhost/apps/integration_openproject/config',
					{
						values: {
							oauth_state: expect.stringMatching(/[A-Za-z0-9\-._~]{10}/),
							code_verifier: expect.stringMatching(/[A-Za-z0-9\-._~]{128}/),
						},
					},
				)
			})
			it('redirects to the openproject oauth uri', async () => {
				wrapper.find('button').trigger('click')
				await localVue.nextTick()
				expect(generateCodeChallengeSpy).toHaveBeenCalledTimes(1)
				await localVue.nextTick()
				expect(window.location.replace).toHaveBeenCalledWith(
					expect.stringMatching(
						/http:\/\/openproject\/oauth\/&state=[A-Za-z0-9\-._~]{10}&code_challenge=A{11}&code_challenge_method=S256/
					),
				)
			})
		})
		describe('on unsuccessful saving of the state', () => {
			beforeEach(() => {
				const err = new Error()
				err.message = 'some issue'
				axios.put.mockRejectedValueOnce(err)
			})
			it('shows an error', async () => {
				dialogs.showError.mockImplementationOnce()
				wrapper.find('button').trigger('click')
				await localVue.nextTick()
				expect(generateCodeChallengeSpy).toHaveBeenCalledTimes(1)
				await localVue.nextTick()
				expect(dialogs.showError).toHaveBeenCalledWith(
					'Failed to save OpenProject OAuth state: some issue'
				)
				expect(window.location.replace).not.toHaveBeenCalled()
			})
		})
		it('generates a random string', () => {
			const r1 = wrapper.vm.generateRandomString(128)
			const r2 = wrapper.vm.generateRandomString(128)
			expect(r1).not.toEqual(r2)
			expect(r1).toMatch(/[A-Za-z0-9\-._~]{128}/)
			expect(r2).toMatch(/[A-Za-z0-9\-._~]{128}/)
		})
	})
})

function getWrapper(props = {}) {
	return shallowMount(OAuthConnectButton, {
		localVue,
		mocks: {
			t: (app, msg) => msg,
		},
		propsData: {
			requestUrl: 'http://openproject/oauth/',
			adminConfigStatus: false,
			...props,
		},
	})
}
