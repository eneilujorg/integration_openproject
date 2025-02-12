<template>
	<div class="form-heading"
		:class="{'disabled': isDisabled}">
		<div v-if="isProjectFolderSetupHeading && isSetupCompleteWithoutProjectFolders" class="setup-complete-without-project-folders">
			<MinusThickIcon :fill-color="isDarkTheme ? '#000000' : '#FFFFFF'" :size="12" />
		</div>
		<div v-else-if="hasError" class="project-folder-setup-error">
			<ExclamationThickIcon fill-color="#FFFFFF" :size="12" />
		</div>
		<div v-else-if="showEncryptionWarningForGroupFolders" class="project-folder-setup-warning">
			<ExclamationThickIcon fill-color="#FFFFFF" :size="12" />
		</div>
		<div v-else-if="isComplete" class="complete">
			<CheckBoldIcon fill-color="#FFFFFF" :size="12" />
		</div>
		<div v-else
			class="index"
			:class="{
				'index-dark-mode': isDarkTheme,
				'index-light-mode': !isDarkTheme
			}">
			{{ index }}
		</div>
		<div class="title"
			:class="{
				'green-text': isComplete,
				'red-text': hasError,
				'warn-text': showEncryptionWarningForGroupFolders
			}">
			{{ title }}
		</div>
	</div>
</template>
<script>

import CheckBoldIcon from 'vue-material-design-icons/CheckBold.vue'
import MinusThickIcon from 'vue-material-design-icons/MinusThick.vue'
import ExclamationThickIcon from 'vue-material-design-icons/ExclamationThick.vue'
export default {
	name: 'FormHeading',
	components: {
		CheckBoldIcon,
		MinusThickIcon,
		ExclamationThickIcon,
	},
	props: {
		index: {
			type: String,
			required: true,
		},
		title: {
			type: String,
			required: true,
		},
		isDisabled: {
			type: Boolean,
			default: false,
		},
		isComplete: {
			type: Boolean,
			default: false,
		},
		isSetupCompleteWithoutProjectFolders: {
			type: Boolean,
			default: false,
		},
		isProjectFolderSetupHeading: {
			type: Boolean,
			default: false,
		},
		hasError: {
			type: Boolean,
			default: false,
		},
		showEncryptionWarningForGroupFolders: {
			type: Boolean,
			default: false,
		},
		isDarkTheme: {
			type: Boolean,
			default: false,
		},
	},
}
</script>
<style lang="scss" scoped>
.form-heading {
	display: flex;
	justify-content: start;
	align-items: center;
	padding: 15px 0;

	.green-text {
		color: var(--color-success);
	}

	.red-text {
		color: var(--color-error);
	}

	.warn-text {
		color: var(--color-warning);
	}

	.complete {
		height: 16px;
		width: 16px;
		border-radius: 50%;
		background-color: var(--color-success);
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.project-folder-setup-error, .project-folder-setup-warning {
		height: 16px;
		width: 16px;
		border-radius: 50%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.project-folder-setup-error {
		background: var(--color-error);
	}

	.project-folder-setup-warning {
		background: var(--color-warning);
	}

	.setup-complete-without-project-folders {
		height: 16px;
		width: 16px;
		border-radius: 50%;
		background: var(--color-loading-dark);
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.index {
		height: 16px;
		width: 16px;
		font-size: 14px;
		font-weight: 600;
		line-height: 16px;
		text-align: center;
		border-radius: 50%;
		background: var(--color-loading-dark);
	}
	.title {
		font-weight: 700;
		font-size: 14px;
		line-height: 20px;
		padding-left: 6px;
	}
}

.index-dark-mode {
	color: #000000;
}

.index-light-mode {
	color: #FFFFFF;
}

.form-heading.disabled {
	.index {
		background: #CCCCCC !important;
	}
	.title {
		color: #CCCCCC !important;
	}
}
</style>
