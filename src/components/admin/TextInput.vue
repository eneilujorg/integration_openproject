<template>
	<div class="text-input">
		<div class="text-input-label">
			{{ labelText }}
		</div>
		<div class="text-input-input-wrapper">
			<input
				ref="textInput"
				:disabled="disabled"
				:value="value"
				:type="type"
				:readonly="readOnly"
				:class="{
					'text-input-error': !!errorMessage,
					'text-input-readonly': readOnly
				}"
				:placeholder="placeHolder"
				@click="$emit('click', $event)"
				@input="$emit('input', $event.target.value)"
				@change="$emit('change', $event.target.value)"
				@focus="$emit('focus', $event)"
				@blur="$emit('blur', $event)">
			<NcButton v-if="showCopyButton"
				class="text-input-copy-value"
				:disabled="disabled || isInputFieldEmpty"
				:title="copyButtonTooltip"
				@click="copyValue">
				<template #icon>
					<ClippyIcon :size="16" />
				</template>
				{{ t("integration_openproject", "Copy value") }}
			</NcButton>
		</div>
		<div v-if="errorMessage || hintText">
			<div v-if="errorMessage">
				<div class="text-input-error-message"
					v-html="sanitizedErrorMessage" /> <!-- eslint-disable-line vue/no-v-html -->
				<NcPopover v-if="errorMessageDetails">
					<template #trigger>
						<a class="link" href="#">{{ t("integration_openproject", "Details") }}</a>
					</template>
					<div v-html="sanitizedErrorMessageDetails" /> <!-- eslint-disable-line vue/no-v-html -->
				</NcPopover>
			</div>
			<div v-else
				class="text-input-hint"
				v-html="sanitizedHintText" /> <!-- eslint-disable-line vue/no-v-html -->
		</div>
	</div>
</template>
<script>
import { translate as t } from '@nextcloud/l10n'
import { showSuccess } from '@nextcloud/dialogs'
import { NcButton, NcPopover } from '@nextcloud/vue'
import ClippyIcon from '../icons/ClippyIcon.vue'
import dompurify from 'dompurify'

const COPY_TIMEOUT = 5000

export default {
	name: 'TextInput',
	components: {
		NcButton,
		ClippyIcon,
		NcPopover,
	},
	props: {
		value: {
			default: '',
			type: String,
		},
		type: {
			type: String,
			default: 'text',
		},
		placeHolder: {
			default: '',
			type: String,
		},
		label: {
			required: true,
			type: String,
		},
		hintText: {
			default: null,
			type: [String, null],
		},
		errorMessage: {
			default: null,
			type: [String, null],
		},
		errorMessageDetails: {
			default: null,
			type: [String, null],
		},
		isRequired: {
			default: false,
			type: Boolean,
		},
		withCopyBtn: {
			default: false,
			type: Boolean,
		},
		readOnly: {
			default: false,
			type: Boolean,
		},
		disabled: {
			default: false,
			type: Boolean,
		},
	},
	data: () => ({
		isCopied: false,
	}),
	computed: {
		labelText() {
			if (this.isRequired) {
				return `${this.label} *`
			} else return this.label
		},
		isInputFieldEmpty() {
			return !this.value
		},
		showCopyButton() {
			return (this.withCopyBtn && navigator.clipboard)
		},
		copyButtonTooltip() {
			if (this.isCopied) {
				return t('integration_openproject', 'Copied!')
			} else {
				return t('integration_openproject', 'Copy value')
			}
		},
		sanitizedHintText() {
			return dompurify.sanitize(this.hintText, { ADD_ATTR: ['target'] })
		},
		sanitizedErrorMessage() {
			return dompurify.sanitize(this.errorMessage, { ADD_ATTR: ['target'] })
		},
		sanitizedErrorMessageDetails() {
			return dompurify.sanitize(this.errorMessageDetails, { ADD_ATTR: ['target'] })
		},
	},
	methods: {
		copyValue() {
			const that = this
			navigator.clipboard.writeText(this.value)
			showSuccess(t('integration_openproject', 'Copied to the clipboard'), {
				timeout: COPY_TIMEOUT,
			})
			that.isCopied = true
			setTimeout(() => {
				that.isCopied = false
			}, COPY_TIMEOUT)
		},
	},
}
</script>
<style lang="scss" scoped>
.text-input {
	&-input-wrapper {
		display: flex;
		align-items: center;

		input {
			flex-grow: 1;
			max-width: 700px;
		}
	}

	&-wrapper {
		display: flex;
		align-items: center;
	}

	&-label {
		font-weight: 700;
		font-size: .875rem;
		line-height: 1.25rem;
	}

	&-messages {
		font-weight: 400;
		font-size: .75rem;
		line-height: 1rem;
	}

	&-error {
		border: 2px solid var(--color-error) !important;
	}

	&-error-message {
		color: var(--color-error);
		float: left;
		margin-right: 10px;
	}

	&-icon {
		cursor: copy;
		width: 16px;
		height: 16px;
		background-size: 16px;
		background-repeat: no-repeat;
		background-position: center;
	}

	input[data-focus-visible-added].text-input-error {
		outline: none;
		box-shadow: none;
	}

	&-copy-value {
		cursor: copy !important;
		margin-left: .5rem;
	}

	&-readonly {
		cursor: default;
		outline: none;
		box-shadow: none !important;
		border: 1px solid grey !important;
	}
}
</style>
<style>
.text-input .link, .popover .link {
	color: #1a67a3 !important;
	font-style: italic;
}

.text-input-copy-value * {
	cursor: copy !important;
}

.popover__inner {
	padding: 5px !important;
}
</style>
