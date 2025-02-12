import { createLocalVue, mount } from '@vue/test-utils'
import TextInput from '../../../../src/components/admin/TextInput.vue'

const localVue = createLocalVue()

Object.assign(navigator, {
	clipboard: {
		writeText: () => {},
	},
})

jest.mock('@nextcloud/dialogs', () => ({
	showSuccess: jest.fn(),
}))

const selector = {
	textInputLabel: '.text-input-label',
	copyButton: '.text-input-copy-value',
	copyIcon: '.icon-clippy',
}

global.t = (app, text) => text

const selectors = {
	input: 'input',
	copyButton: 'button.text-input-copy-value',
}

describe('TextInput.vue', () => {
	describe('messages', () => {
		it('should show error message if provided', () => {
			const wrapper = getWrapper({
				hintText: null,
				errorMessage: 'some error message',
			})
			expect(wrapper).toMatchSnapshot()
		})
		it('should show hint text if provided', () => {
			const wrapper = getWrapper({
				hintText: 'some hint message',
				errorMessage: null,
			})
			expect(wrapper).toMatchSnapshot()
		})
		it('should show error message if both error message and hint text are provided', () => {
			const wrapper = getWrapper({
				hintText: 'some hint message',
				errorMessage: 'some error message',
			})
			expect(wrapper).toMatchSnapshot()
		})
		it('should show error message details if both error message and details are provided', () => {
			// the content of the error message details is not tested because the popup is rendered
			// outside the wrapper
			const wrapper = getWrapper({
				errorMessage: 'some error message',
				errorMessageDetails: 'here are some details',
			})
			expect(wrapper).toMatchSnapshot()
		})
		it('should not show error message details if not error message is provided', () => {
			const wrapper = getWrapper({
				errorMessageDetails: 'here are some details',
			})
			expect(wrapper).toMatchSnapshot()
		})
	})
	describe('is required prop', () => {
		it('should add asterik to the label text', () => {
			const wrapper = getWrapper({
				isRequired: true,
			})
			expect(wrapper.find(selector.textInputLabel)).toMatchSnapshot()
		})
		it('should not add asterik to the label text', () => {
			const wrapper = getWrapper({
				isRequired: false,
			})
			expect(wrapper.find(selector.textInputLabel)).toMatchSnapshot()
		})
	})
	describe('with copy button prop', () => {
		let wrapper
		beforeEach(() => {
			wrapper = getWrapper({
				withCopyBtn: true,
			})
		})
		it('should render copy button if set', () => {
			expect(wrapper).toMatchSnapshot()
		})
		it('should be disabled if the input value is empty', () => {
			expect(wrapper.find(selector.copyButton).attributes().disabled).toBe('disabled')
		})
		it('should be enabled if the input value is non empty', async () => {
			wrapper = getWrapper({
				withCopyBtn: true,
				value: 'some-value',
			})
			expect(wrapper.find(selector.copyButton).attributes().disabled).toBe(undefined)
		})
		describe('on click', () => {
			let copyButton
			jest.useFakeTimers()
			const spyWriteToClipboard = jest.spyOn(navigator.clipboard, 'writeText')
				.mockImplementationOnce(() => jest.fn())
			beforeEach(() => {
				wrapper = getWrapper({
					withCopyBtn: true,
					value: 'some-value-to-copy',
				})
				copyButton = wrapper.find(selector.copyButton)
			})
			it('should copy the input value', async () => {
				await copyButton.trigger('click')
				expect(spyWriteToClipboard).toBeCalledTimes(1)
				expect(spyWriteToClipboard).toBeCalledWith('some-value-to-copy')
			})
			it('should change the copy icon with the copied icon', async () => {
				expect(copyButton.attributes().title).toBe('Copy value')
				await copyButton.trigger('click')
				await wrapper.vm.$nextTick()
				copyButton = wrapper.find(selector.copyButton)
				expect(copyButton.attributes().title).toBe('Copied!')
				jest.advanceTimersByTime(5000)
				await wrapper.vm.$nextTick()
				copyButton = wrapper.find(selector.copyButton)
				expect(copyButton.attributes().title).toBe('Copy value')
			})
		})
	})
	describe('readonly prop', () => {
		it('should set the input to readonly', () => {
			const wrapper = getWrapper({
				readOnly: true,
			})
			expect(wrapper).toMatchSnapshot()
		})
	})
	describe('disabled prop', () => {
		it('should disable input elements when disabled is true', () => {
			const wrapper = getWrapper({
				label: 'test label',
				withCopyBtn: true,
				disabled: true,
				value: 'some value',
			})

			expect(wrapper.find(selectors.input).attributes().disabled).toBe('disabled')
			expect(wrapper.find(selectors.copyButton).attributes().disabled).toBe('disabled')
		})
		it('should disable input elements when disabled is false', () => {
			const wrapper = getWrapper({
				label: 'test label',
				withCopyBtn: true,
				disabled: false,
				value: 'some value',
			})

			expect(wrapper.find(selectors.input).attributes().disabled).toBeFalsy()
			expect(wrapper.find(selectors.copyButton).attributes().disabled).toBeFalsy()
		})
	})
})

function getWrapper(props = {}) {
	return mount(TextInput, {
		localVue,
		propsData: {
			value: null,
			id: 'unique-id',
			label: 'some label',
			...props,
		},
		mocks: {
			t: (app, msg) => msg,
		},
	})
}
