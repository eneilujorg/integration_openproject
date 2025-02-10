<template>
	<div class="multiple-link-modal-container">
		<NcModal
			v-if="show"
			:can-close="isError"
			@close="closeRequestModal">
			<div class="multiple-link-modal-content">
				<NcLoadingIcon v-if="isLoading" class="loading-spinner" :size="60" />
				<div v-else-if="chunkingInformation !== null" class="link-progress-information-wrapper">
					<div v-if="getError" class="link-progress-information-failed">
						<div class="link-progress-information-failed--details">
							<div class="link-progress-information-failed--details--info">
								<AlertCircleOutline fill-color="var(--color-error)" :size="70" />
							</div>
							<div class="link-progress-information-failed--details--info">
								<p>{{ t('integration_openproject', `Files selected: ${getTotalNoOfFilesSelectedInChunking}`) }}</p>
								<p>{{ t('integration_openproject', `Files successfully linked: ${getTotalNoOfFilesAlreadyLinkedInChunking}`) }}</p>
								<p class="link-progress-information-failed--details--info--error">
									{{ t('integration_openproject', `Files failed to be linked: ${getTotalNoOfFilesNotLinkedInChunking}`) }}
								</p>
							</div>
							<div class="link-progress-information-failed--details--info">
								<NcButton
									data-test-id="relink-remaining-files"
									@click="relinkRemainingFilesToWorkPackage">
									<template #icon>
										<AutoRenewIcon :size="20" />
									</template>
									{{ t('integration_openproject', 'Retry linking remaining files') }}
								</NcButton>
							</div>
						</div>
					</div>
					<div v-else class="link-progress-information-success">
						<FileLinkIcon :size="50" />
						<div class="success-progress-information">
							<div class="success-progress-information--title">
								<p>{{ t('integration_openproject', `${getTotalNoOfFilesAlreadyLinkedInChunking} of ${getTotalNoOfFilesSelectedInChunking} files linked`) }}</p>
								<p>{{ t('integration_openproject', `${getProgressValueOfMultipleFilesLinked}%`) }}</p>
							</div>
							<div class="success-progress-information--progress-bar">
								<NcProgressBar :value="getProgressValueOfMultipleFilesLinked" size="medium" />
							</div>
						</div>
					</div>
				</div>
				<div v-else class="multiple-link-modal-inside-content">
					<h2>
						{{ t('integration-openproject', 'Link to work package') }}
					</h2>
					<SearchInput v-if="!!isAdminConfigOk && !!isStateOk"
						:linked-work-packages="alreadyLinkedWorkPackage"
						:file-info="fileInfos"
						:search-origin="searchOrigin"
						@set-chunked-informations="setChunkedInformations"
						@close="closeRequestModal" />
					<EmptyContent
						id="openproject-empty-content"
						:state="state"
						:auth-method="authMethod"
						:is-multiple-workpackage-linking="true"
						:is-admin-config-ok="isAdminConfigOk" />
				</div>
			</div>
		</NcModal>
	</div>
</template>

<script>
import { NcModal, NcLoadingIcon, NcButton, NcProgressBar } from '@nextcloud/vue'
import SearchInput from '../components/tab/SearchInput.vue'
import EmptyContent from '../components/tab/EmptyContent.vue'
import { generateOcsUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import { loadState } from '@nextcloud/initial-state'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import AutoRenewIcon from 'vue-material-design-icons/Autorenew.vue'
import FileLinkIcon from 'vue-material-design-icons/FileLink.vue'
import { translate as t } from '@nextcloud/l10n'

import {
	checkOauthConnectionResult,
	STATE,
	WORKPACKAGES_SEARCH_ORIGIN,
} from '../utils.js'
import { showSuccess, showError } from '@nextcloud/dialogs'

import { workpackageHelper } from '../utils/workpackageHelper.js'

export default {
	name: 'LinkMultipleFilesModal',
	components: {
		EmptyContent,
		SearchInput,
		NcModal,
		NcLoadingIcon,
		NcProgressBar,
		AlertCircleOutline,
		NcButton,
		AutoRenewIcon,
		FileLinkIcon,
	},
	data() {
		return {
			show: false,
			state: STATE.LOADING,
			fileInfos: [],
			alreadyLinkedWorkPackage: [],
			isAdminConfigOk: loadState('integration_openproject', 'admin_config_ok'),
			authMethod: loadState('integration_openproject', 'authorization_method'),
			oauthConnectionErrorMessage: loadState('integration_openproject', 'oauth-connection-error-message'),
			oauthConnectionResult: loadState('integration_openproject', 'oauth-connection-result'),
			searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.LINK_MULTIPLE_FILES_MODAL,
			chunkingInformation: null,
		}
	},

	computed: {
		isStateOk() {
			return this.state === STATE.OK
		},
		isLoading() {
			return this.state === STATE.LOADING
		},
		getTotalNoOfFilesSelectedInChunking() {
			return this.chunkingInformation?.totalNoOfFilesSelected
		},
		getTotalNoOfFilesAlreadyLinkedInChunking() {
			return this.chunkingInformation?.totalFilesAlreadyLinked
		},
		getTotalNoOfFilesNotLinkedInChunking() {
			return this.chunkingInformation?.totalFilesNotLinked
		},
		getProgressValueOfMultipleFilesLinked() {
			const progressPercentage = parseInt((this.getTotalNoOfFilesAlreadyLinkedInChunking / this.getTotalNoOfFilesSelectedInChunking) * 100)
			if (progressPercentage === 100) {
				this.closeRequestModal()
				showSuccess(
					t('integration_openproject', 'Links to work package created successfully for selected files!'),
				)
			}
			return progressPercentage
		},
		getError() {
			return this.chunkingInformation?.error
		},
		isError() {
			return this.chunkingInformation?.error !== false
		},
	},

	mounted() {
		if (this.authMethod === 'oauth2') {
			checkOauthConnectionResult(this.oauthConnectionResult, this.oauthConnectionErrorMessage)
		}
	},
	methods: {
		async relinkRemainingFilesToWorkPackage() {
			this.chunkingInformation.error = false
			const remainingFilesToChunk = this.chunkingInformation.remainingFileInformations
			const selectedWorkPackage = this.chunkingInformation.selectedWorkPackage
			await workpackageHelper.linkMultipleFilesToWorkPackageWithChunking(remainingFilesToChunk, selectedWorkPackage, true, this)
			if (this.getTotalNoOfFilesAlreadyLinkedInChunking !== remainingFilesToChunk.length) {
				showError(
					t('integration_openproject', 'Failed to link selected files to work package'),
				)
			}
		},
		setChunkedInformations(data) {
			this.chunkingInformation = data
		},
		showModal() {
			this.show = true
		},
		async setFileInfos(fileInfos) {
			this.fileInfos = fileInfos
			if (this.isAdminConfigOk) {
				await this.fetchWorkpackagesForSingleFileSelected(this.fileInfos[0].id)
			} else {
				this.state = STATE.ERROR
			}
		},
		closeRequestModal() {
			this.fileInfos = []
			this.alreadyLinkedWorkPackage = []
			this.show = false
			this.chunkingInformation = null
		},
		async fetchWorkpackagesForSingleFileSelected(fileId) {
			this.state = STATE.LOADING
			const req = {}
			const url = generateOcsUrl('/apps/integration_openproject/api/v1/work-packages?fileId=' + fileId)
			try {
				const response = await axios.get(url, req)
				const responseData = response.data.ocs.data
				if (!Array.isArray(responseData)) {
					this.state = STATE.FAILED_FETCHING_WORKPACKAGES
				} else {
					if (this.fileInfos.length === 1 && responseData.length > 0) {
						for (let workPackage of responseData) {
							workPackage.fileId = fileId
							workPackage = await workpackageHelper.getAdditionalMetaData(workPackage, true)
							this.alreadyLinkedWorkPackage.push(workPackage)
						}
					}
					this.state = STATE.OK
				}
			} catch (error) {
				if (error.response && error.response.status === 401) {
					this.state = STATE.NO_TOKEN
				} else if (error.response && (error.response.status === 404 || error.response.status === 503)) {
					this.state = STATE.CONNECTION_ERROR
				} else if (error.response && error.response.status === 500) {
					this.state = STATE.ERROR
				} else {
					this.state = STATE.FAILED_FETCHING_WORKPACKAGES
				}
			}
		},
	},
}
</script>

<style scoped lang="scss">
h2 {
	padding-left: 15px;
}

.multiple-link-modal-content {
	padding: 20px 30px;
	height: 450px;
	display: flex;
	justify-content: center;
	align-items: center;
}

.multiple-link-modal-inside-content {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	flex-direction: column;
}

.link-progress-information-wrapper {
	width: 75%;
}

.link-progress-information-success {
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
}

.success-progress-information {
	width: 100%;
	height: 45px;
	margin-right: 10px;
	margin-left: 10px;
	&--title {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	&--progress-bar {
		margin-top: 11px;
	}
}

.link-progress-information-failed {
	width: 100%;
	height: 250px;
	display: flex;
	justify-content: center;
	align-items: center;

	&--details {
		text-align: center;
		&--info {
			padding: 13px;
			&--error {
				color: var(--color-error);
			}
		}
	}
}
</style>
