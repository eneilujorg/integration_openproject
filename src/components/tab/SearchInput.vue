<template>
	<div id="searchBar">
		<NcSelect ref="workPackageSelect"
			class="searchInput"
			input-id="searchInput"
			:placeholder="placeholder"
			:options="setOptionForSearch"
			:user-select="true"
			:append-to-body="false"
			label="displayName"
			:loading="isStateLoading"
			:filterable="false"
			:clear-search-on-blur="() => false"
			:disabled="isDisabled"
			@search="asyncFind"
			@option:selected="linkWorkPackageToFile">
			<template #option="option">
				<WorkPackage :key="option.id"
					:workpackage="option"
					:is-smart-picker="isSmartPicker" />
			</template>
			<template #no-options>
				{{ getNoOptionText }}
			</template>
			<template v-if="!isSmartPicker" #list-footer>
				<li class="create-workpackage-footer-option" @click="openCreateWorkpackageModal()">
					<Plus :size="20" fill-color="var(--color-primary-element)" />
					<span class="create-workpackage-footer-option--label">{{ t('integration_openproject', 'Create and link a new work package') }}</span>
				</li>
			</template>
		</NcSelect>
		<div v-if="!isStateOk"
			class="stateMsg text-center">
			{{ stateMessages }}
		</div>
		<div v-if="!!isStateOk && !isSmartPicker" class="create-workpackage">
			<NcButton class="create-workpackage--button" @click="openCreateWorkpackageModal()">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ t('integration_openproject', 'Create and link a new work package') }}
			</NcButton>
		</div>
		<CreateWorkPackageModal
			v-if="!isSmartPicker"
			ref="testRef"
			:show-modal="isCreateWorkpackageModalVisible"
			data-test-id="create-workpackage-modal"
			@create-work-package="onCreateWorkPackageEvent"
			@close-create-work-package-modal="onCloseCreateWorkPackageModalEvent" />
	</div>
</template>

<script>
import { loadState } from '@nextcloud/initial-state'
import debounce from 'lodash/debounce.js'
import axios from '@nextcloud/axios'
import { generateOcsUrl } from '@nextcloud/router'
import { NcSelect, NcButton } from '@nextcloud/vue'
import WorkPackage from './WorkPackage.vue'
import { showError, showSuccess } from '@nextcloud/dialogs'
import { workpackageHelper } from '../../utils/workpackageHelper.js'
import { NO_OPTION_TEXT_STATE, STATE, WORKPACKAGES_SEARCH_ORIGIN } from '../../utils.js'
import { translate as t } from '@nextcloud/l10n'
import Plus from 'vue-material-design-icons/Plus.vue'
import CreateWorkPackageModal from '../../views/CreateWorkPackageModal.vue'

const SEARCH_CHAR_LIMIT = 1
const DEBOUNCE_THRESHOLD = 500

export default {
	name: 'SearchInput',
	components: {
		NcButton,
		CreateWorkPackageModal,
		Plus,
		WorkPackage,
		NcSelect,
	},
	props: {
		fileInfo: {
			type: [Object, Array],
			default: null,
		},
		linkedWorkPackages: {
			type: Array,
			default: null,
		},
		isSmartPicker: {
			type: Boolean,
			default: false,
		},
		searchOrigin: {
			type: String,
			required: false,
			default: null,
		},
		isDisabled: {
			type: Boolean,
			default: false,
		},
	},
	data: () => ({
		state: STATE.OK,
		searchResults: [],
		openprojectUrl: loadState('integration_openproject', 'openproject-url'),
		isCreateWorkpackageModalVisible: false,
		newWorkpackageCreated: false,
		workpackageData: [], // only for newly created workpackages
		noOptionTextState: NO_OPTION_TEXT_STATE.START_TYPING,
	}),
	computed: {
		isStateOk() {
			return this.state === STATE.OK
		},
		isStateLoading() {
			return this.state === STATE.LOADING
		},
		stateMessages() {
			if (this.state === STATE.NO_TOKEN) {
				return t('integration_openproject', 'No OpenProject account connected')
			} else if (this.state === STATE.ERROR) {
				return t('integration_openproject', 'Error connecting to OpenProject')
			}
			return ''
		},
		getNoOptionText() {
			switch (this.noOptionTextState) {
			case NO_OPTION_TEXT_STATE.START_TYPING :
				return t('integration_openproject', 'Start typing to search')
			case NO_OPTION_TEXT_STATE.RESULT :
				if (this.searchResults.length === 0) {
					return t('integration_openproject', 'No matching work packages found')
				}
				break
			}
			// while workpackages are being searched we make the no text option empty
			return ''
		},
		setOptionForSearch() {
			if (this.searchOrigin === WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB || this.isSmartPicker) {
				return this.filterSearchResultsByFileId
			}
			return this.searchResults
		},
		placeholder() {
			if (this.isSmartPicker) {
				return t('integration_openproject', 'Search for work packages')
			} else {
				return t('integration_openproject', 'Search for a work package to create a relation')
			}
		},
		filterSearchResultsByFileId() {
			return this.searchResults.filter(wp => {
				if (this.isSmartPicker) {
					return wp.id
				}
				if (wp.fileId === undefined || wp.fileId === '') {
					console.error('work-package data does not contain a fileId')
					return false
				}
				return wp.fileId === this.fileInfo.id
			})
		},
	},
	watch: {
		fileInfo(oldFile, newFile) {
			if (oldFile.id !== newFile.id) {
				this.resetState()
			}
		},
	},
	methods: {
		async onCreateWorkPackageEvent(data) {
			this.isCreateWorkpackageModalVisible = false
			if (
				data.openProjectEventName === 'work_package_creation_cancellation'
			) {
				showError(t('integration_openproject', 'Work package creation was not successful.'))
			}
			if (data.openProjectEventName === 'work_package_creation_success') {
				showSuccess(t('integration_openproject', 'Work package created successfully.'))
				this.newWorkpackageCreated = true
				await this.linkWorkPackageToFile(data.openProjectEventPayload)
			}
		},
		onCloseCreateWorkPackageModalEvent() {
			this.isCreateWorkpackageModalVisible = false
		},
		async openCreateWorkpackageModal() {
			this.isCreateWorkpackageModalVisible = true
		},
		resetState() {
			this.searchResults = []
			this.state = STATE.OK
			this.newWorkpackageCreated = false
		},
		checkForErrorCode(statusCode) {
			if (statusCode === 200) return
			if (statusCode === 401) {
				this.state = STATE.NO_TOKEN
			} else {
				this.state = STATE.ERROR
			}
		},
		async asyncFind(query) {
			this.noOptionTextState = (query.trim() === '') ? NO_OPTION_TEXT_STATE.START_TYPING : NO_OPTION_TEXT_STATE.SEARCHING
			this.resetState()
			if (this.searchOrigin === WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB) {
				await this.debounceMakeSearchRequest(query, this.fileInfo.id)
			} else {
				// we do not need to provide a file id in case of searching through link multiple files to work package and through smart picker
				await this.debounceMakeSearchRequest(query, null)
			}
		},
		async getWorkPackageLink(selectedOption) {
			return this.openprojectUrl.replace(/^\/+|\/+$/g, '') + '/wp/' + selectedOption.id
		},
		debounceMakeSearchRequest: debounce(function(...args) {
			if (args[0].length < SEARCH_CHAR_LIMIT) return
			return this.makeSearchRequest(...args)
		}, DEBOUNCE_THRESHOLD),
		async linkWorkPackageToFile(selectedOption) {
			if (this.isSmartPicker) {
				const link = await this.getWorkPackageLink(selectedOption)
				this.$emit('submit', link)
				return
			}
			// since we can link multiple files now we send file information required in an array (whether it's only one value or multiple)
			if (this.searchOrigin === WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB) {
				if (this.newWorkpackageCreated && this.searchOrigin === WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB) {
					// after creating the new work package from the project tab process the work package
					// to display the existing linked work package automatically in the UI
					selectedOption.fileId = this.fileInfo.id
					selectedOption = await workpackageHelper.getAdditionalMetaData(selectedOption)
				}
				await workpackageHelper.linkFileToWorkPackageWithSingleRequest([this.fileInfo], selectedOption, t('integration_openproject', 'Link to work package created successfully!'), this)
				this.resetState()
			} else if (this.searchOrigin === WORKPACKAGES_SEARCH_ORIGIN.LINK_MULTIPLE_FILES_MODAL) {
				if (this.fileInfo.length <= 20) {
					await workpackageHelper.linkFileToWorkPackageWithSingleRequest(this.fileInfo, selectedOption, t('integration_openproject', 'Links to work package created successfully for selected files!'), this)
					this.$emit('close', selectedOption)
					this.resetState()
				} else {
					// the selected files will be linked in chunks
					await workpackageHelper.linkMultipleFilesToWorkPackageWithChunking(this.fileInfo, selectedOption, false, this)
					this.resetState()
				}
			}
		},
		async makeSearchRequest(search, fileId) {
			this.state = STATE.LOADING
			const url = generateOcsUrl('/apps/integration_openproject/api/v1/work-packages')
			const isSmartPicker = this.isSmartPicker
			const req = {}
			req.params = {
				searchQuery: search,
				isSmartPicker,
			}
			let response
			try {
				response = await axios.get(url, req)
			} catch (e) {
				response = e.response
			}
			this.checkForErrorCode(response.status)
			if (response.status === 200) {
				await this.processWorkPackages(response.data.ocs.data, fileId)
			}
			if (this.isStateLoading) {
				this.state = STATE.OK
			}
			if (search.trim() !== '') {
				this.noOptionTextState = NO_OPTION_TEXT_STATE.RESULT
			}
		},
		async processWorkPackages(workPackages, fileId) {
			for (let workPackage of workPackages) {
				try {
					if (this.isStateLoading) {
						if (this.isSmartPicker) {
						   workPackage = await workpackageHelper.getAdditionalMetaData(workPackage)
							this.searchResults.push(workPackage)
						} else {
							workPackage.fileId = fileId
							workPackage = await workpackageHelper.getAdditionalMetaData(workPackage)
							if (this.newWorkpackageCreated) {
								// don't check if it's already linked or not because we know it's already linked
								// we need the processed data to display in the UI
								this.searchResults.push(workPackage)
								return
							}
							const alreadyLinked = this.linkedWorkPackages.some(el => el.id === workPackage.id)
							const alreadyInSearchResults = this.searchResults.some(el => el.id === workPackage.id)
							// check the state again, it might have changed in between
							if (!alreadyInSearchResults && !alreadyLinked && this.isStateLoading) {
								this.searchResults.push(workPackage)
							}
						}
					}
				} catch (e) {
					console.error('could not process work package data')
				}
			}
		},
	},
}
</script>
<style lang="scss">
#searchBar {
	padding: 10px;
	position: sticky;
	position: -webkit-sticky; /* Safari */
	z-index: 1;
	top: 0;
	background: var(--color-main-background);
	.searchInput {
		width: 100%;
	}
	.stateMsg {
		padding: 30px;
		text-align: center;
	}
	.vs__dropdown-option {
		padding: 0 !important;
	}

	.create-workpackage-footer-option {
		margin-top: 5px;
		width: 100%;
		border-top: 1px solid var(--color-background-dark);
		padding: 20px 10px 20px 10px;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		position: sticky;
		position: -webkit-sticky; /* Safari */
		z-index: 1;
		bottom: 0;
		background: var(--color-main-background);
		overflow-y: hidden;
		&--label {
			color: var(--color-primary-element);
			padding-left: 5px;
			font-size: 14px;
			font-weight: 400;
			line-height: 16px;
			letter-spacing: 0;
			text-align: left;

		}
	}
	.create-workpackage {
		margin-top: 10px;
		display: flex;
		align-items: center;
		&--button {
			&--label {
				padding-left: 15px;
				font-size: 1rem;
				line-height: 1.4rem;
				font-weight: 400;
				text-align: left;
			}
		}}
	.create-workpackage--label {
		margin-left: 10px;
	}
	.create-workpackage-footer-option:hover {
		background-color: var(--color-background-dark);
		cursor: pointer;
	}
}
</style>
