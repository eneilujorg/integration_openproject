<template>
	<NcModal v-if="openModal"
		class="create-workpackage-modal"
		:can-close="true"
		:out-transition="true"
		@close="closeModal">
		<div>
			<h2 class="create-workpackage-modal--title">
				{{ t('integration_openproject', 'Create and link a new work package') }}
			</h2>
			<div class="create-workpackage-form-wrapper">
				<div class="create-workpackage-form--label">
					{{ t('integration_openproject', 'Project *') }}
				</div>
				<NcSelect ref="createWorkPackageProjectInput"
					class="create-workpackage-form--select"
					input-id="createWorkPackageInput"
					data-test-id="available-projects"
					:placeholder="t('integration_openproject', 'Select a project')"
					:options="mappedNodes"
					:filterable="true"
					:close-on-select="true"
					:clear-search-on-blur="() => false"
					:append-to-body="false"
					:value="getSelectedProject"
					:no-drop="noDropAvailableProjectDropDown"
					:loading="isStateLoading"
					@search="asyncFindProjects"
					@option:selected="onSelectProject">
					<template #option="{ label, relation, counter }">
						<span v-if="relation === 'child'" :style="{paddingLeft: counter + 'em' }" />
						<span>{{ label }}</span>
					</template>
					<template #no-options>
						{{ getNoOptionText }}
					</template>
				</NcSelect>
				<p v-if="error.error && error.attribute === 'project'" class="validation-error">
					{{ error.message }}
				</p>
				<p v-else-if="error.error && error.multipleErrors.project" class="validation-error multiple-error-project">
					{{ error.multipleErrors.project }}
				</p>
				<div class="create-workpackage-form--label">
					{{ t('integration_openproject', 'Subject *') }}
				</div>
				<NcTextField :value.sync="subject"
					class="create-workpackage-form--subject"
					input-class="workpackage-subject"
					:placeholder="t('integration_openproject', 'Work package subject')"
					:class="{'subject-error': error}"
					:label-outside="true"
					type="text"
					@update:value="onSubjectChange" />
				<p v-if="error.error && error.attribute === 'subject'" class="validation-error">
					{{ error.message }}
				</p>
				<p v-else-if="error.error && error.multipleErrors.subject" class="validation-error multiple-error-subject">
					{{ error.multipleErrors.subject }}
				</p>
				<div class="create-workpackage-form--type-status-container">
					<div class="create-workpackage-form--type">
						<div class="create-workpackage-form--label">
							{{ t('integration_openproject', 'Type *') }}
						</div>
						<NcSelect class="create-workpackage-form--select"
							data-test-id="available-types"
							input-id="createWorkPackageTypeInput"
							:options="allowedTypes"
							:filterable="true"
							:close-on-select="true"
							:clear-search-on-blur="() => false"
							:append-to-body="false"
							:placeholder="t('integration_openproject', 'Select project type')"
							:value="getSelectedProjectType"
							@option:selected="onSelectType">
							<template #option="option">
								{{ option.label }}
							</template>
							<template #no-options>
								{{ t('integration_openproject', 'Please select a project') }}
							</template>
						</NcSelect>
						<p v-if="customTypeError" class="validation-error type-error" v-html="sanitizedRequiredCustomTypeValidationErrorMessage" /> <!-- eslint-disable-line vue/no-v-html -->
						<p v-else-if="error.error && error.attribute === 'type'" class="validation-error">
							{{ error.message }}
						</p>
						<p v-else-if="error.error && error.multipleErrors.type" class="validation-error multiple-error-project">
							{{ error.multipleErrors.type }}
						</p>
					</div>
					<div class="create-workpackage-form--status">
						<div class="create-workpackage-form--label">
							{{ t('integration_openproject', 'Status *') }}
						</div>
						<NcSelect class="create-workpackage-form--select"
							data-test-id="available-statuses"
							input-id="createWorkPackageStatusInput"
							:options="allowedStatues"
							:filterable="true"
							:close-on-select="true"
							:clear-search-on-blur="() => false"
							:append-to-body="false"
							:placeholder="t('integration_openproject', 'Select project status')"
							:value="getSelectedProjectStatus"
							@option:selected="onSelectStatus">
							<template #option="option">
								{{ option.label }}
							</template>
							<template #no-options>
								{{ t('integration_openproject', 'Please select a project') }}
							</template>
						</NcSelect>
						<p v-if="error.error && error.attribute === 'status'" class="validation-error">
							{{ error.message }}
						</p>
					</div>
				</div>
				<div class="create-workpackage-form--label">
					{{ t('integration_openproject', 'Assignee') }}
				</div>
				<NcSelect class="create-workpackage-form--select"
					data-test-id="available-assignees"
					input-id="createWorkPackageAssigneeInput"
					:placeholder="t('integration_openproject', 'Select a user or group')"
					:options="availableAssignees"
					:filterable="true"
					:close-on-select="true"
					:clear-search-on-blur="() => false"
					:append-to-body="false"
					:value="getSelectedProjectAssignee"
					@option:selected="onSelectAssignee">
					<template #option="option">
						{{ option.label }}
					</template>
					<template #no-options>
						{{ t('integration_openproject', 'Please select a project') }}
					</template>
				</NcSelect>
				<div class="create-workpackage-form--label">
					{{ t('integration_openproject', 'Description') }}
				</div>
				<textarea v-model="description.raw" class="create-workpackage-form--description" :placeholder="t('integration_openproject', 'Work package description')" />
				<div class="create-workpackage-form--button">
					<NcButton class="create-workpackage-form--button--cancel" @click="closeModal">
						{{ t("integration_openproject", "Cancel") }}
					</NcButton>
					<NcButton class="create-workpackage-form--button--create" :disabled="error.error || customTypeError" @click="createWorkpackage">
						{{ t("integration_openproject", "Create") }}
					</NcButton>
				</div>
			</div>
		</div>
	</NcModal>
</template>
<script>
import { NcModal, NcSelect, NcButton, NcTextField } from '@nextcloud/vue'
import { generateOcsUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import dompurify from 'dompurify'
import { loadState } from '@nextcloud/initial-state'
import { translate as t } from '@nextcloud/l10n'
import { STATE } from '../utils.js'
import debounce from 'lodash/debounce.js'

const SEARCH_CHAR_LIMIT = 1
const DEBOUNCE_THRESHOLD = 500

const DEFAULT_TYPE_VALUE = {
	self: {
		href: '/api/v3/types/1',
		title: 'Task',
	},
	label: '',
}

const DEFAULT_STATUS_VALUE = {
	self: {
		href: '/api/v3/statuses/1',
		title: 'New',
	},
	label: '',
}

const DEFAULT_ASSIGNEE_VALUE = {
	self: {
		href: null,
		title: null,
	},
	label: null,
}

const DEFAULT_PROJECT_VALUE = {
	self: {
		href: null,
		title: null,
	},
	label: null,
	children: [],
}

const DEFAULT_DESCRIPTION_VALUE = {
	format: 'markdown',
	raw: '',
	html: '',
}

const DEFAULT_ERROR_VALUE = {
	error: false,
	attribute: null,
	message: null,
	multipleErrors: {
		project: null,
		subject: '',
	},
}

export default {
	name: 'CreateWorkPackageModal',
	components: {
		NcButton,
		NcSelect,
		NcModal,
		NcTextField,
	},
	props: {
		showModal: {
			type: Boolean,
			default: false,
		},
	},
	data: () => ({
		openProjectUrl: loadState('integration_openproject', 'openproject-url'),
		availableProjects: [],
		allowedTypes: [],
		allowedStatues: [],
		availableAssignees: [],
		// here structuredClone() is used for the all values that are passed during form validation as payload since all the values can be mutated during form validation
		// we need all unmutated values when resetting the form
		project: structuredClone(DEFAULT_PROJECT_VALUE),
		type: structuredClone(DEFAULT_TYPE_VALUE),
		status: structuredClone(DEFAULT_STATUS_VALUE),
		assignee: structuredClone(DEFAULT_ASSIGNEE_VALUE),
		description: structuredClone(DEFAULT_DESCRIPTION_VALUE),
		error: structuredClone(DEFAULT_ERROR_VALUE),
		subject: '',
		projectId: null,
		customTypeError: false,
		// when the modal opens the dropdown for selecting project gains focus automatically
		// this is a workaround to prevent that by setting the dropdown to noDrop at the beginning
		noDropAvailableProjectDropDown: true,
		previousProjectId: null,
		previousDescriptionTemplate: '',
		isDescriptionTemplateChanged: false,
		isFetchingProjectsFromOpenProjectWithQuery: false,
		initialAvailableProjects: [],
		state: STATE.OK,
	}),
	computed: {
		openModal() {
			this.searchForProjects()
			return this.showModal
		},
		getSelectedProject() {
			return this.project.label
		},
		getSelectedProjectType() {
			return this.type.label
		},
		getSelectedProjectStatus() {
			return this.status.label
		},
		getSelectedProjectAssignee() {
			return this.assignee.label
		},
		isStateLoading() {
			return this.state === STATE.LOADING
		},
		getBodyForRequest() {
			return {
				body: {
					_links: {
						type: this.type.self,
						status: this.status.self,
						assignee: this.assignee.self,
						project: this.project.self,
					},
					subject: this.subject,
				},
			}
		},
		mappedNodes() {
			return this.mappedProjects()
		},
		getNoOptionText() {
			if (this.availableProjects.length === 0) {
				return t('integration_openproject', 'No matching work projects found!')
			}
			// while projects are being searched we make the no text option empty
			return ''
		},
		sanitizedRequiredCustomTypeValidationErrorMessage() {
			// get the last number from the href i.e `/api/v3/types/1`, which is the type id
			const typeID = parseInt(this.type.self.href.match(/\d+$/)[0], 10)
			const createWorkpackageFullUrl = this.openProjectUrl.replace(/\/+$/, '') + '/projects/' + this.project.identifier + `/work_packages/new?type=${typeID}`
			const htmlLink = `<a class="openProjectUrl" href=${createWorkpackageFullUrl} target="_blank" title="OpenProject">OpenProject</a>`
			const message = t(
				'integration_openproject',
				'This type has mandatory fields which cannot be filled here. Please, create work packages of this type directly in {htmlLink}.',
				{ htmlLink },
				null,
				{ escape: false, sanitize: false },
			)
			return dompurify.sanitize(message, { ADD_ATTR: ['target'] })
		},
	},
	methods: {
		mappedProjects() {
			const mappedNodes = []
			let counter = 0
			this.availableProjects.sort((projectOne, projectTwo) => projectOne.identifier.localeCompare(projectTwo.identifier))
			function mapNode(node, relation) {
				mappedNodes.push({ ...node, relation, counter })
				if (node.children && node.children.length > 0) {
					counter += 2 // Increment the counter for child elements
					node.children.forEach(child => {
						mapNode(child, 'child')
					})
					counter -= 2 // Decrement the counter after processing children to go back to the parent's counter value
				}
			}
			this.availableProjects.forEach(node => {
				mapNode(node, 'parent')
			})
			// when the modal opens the dropdown for selecting project gains focus automatically
			// this is a workaround to prevent that by bluring the focus and the enabling the dropDown that was
			// disabled initially in data
			if (this.$refs?.createWorkPackageProjectInput && this.isFetchingProjectsFromOpenProjectWithQuery === false) {
				document.getElementById(`${this.$refs?.createWorkPackageProjectInput?.inputId}`).blur()
				this.noDropAvailableProjectDropDown = false
			}
			return mappedNodes
		},
		async asyncFindProjects(query) {
			// before fetching we do some filter search in the default available projects
			let searchedAvailableProjects = []
			searchedAvailableProjects = this.availableProjects.filter(element => element.label.toLowerCase().includes(query.toLowerCase()))
			if (searchedAvailableProjects.length === 0) {
				this.isFetchingProjectsFromOpenProjectWithQuery = true
				await this.debounceMakeSearchRequest(query)
			}
			// After we have searched and we clear the searched query (empty), we list the initial default fetched available projects
			if (query.trim() === '' && this.isFetchingProjectsFromOpenProjectWithQuery === true) {
				this.availableProjects = this.initialAvailableProjects
			}
		},
		debounceMakeSearchRequest: debounce(function(...args) {
			if (args[0].length < SEARCH_CHAR_LIMIT) return
			return this.searchForProjects(...args)
		}, DEBOUNCE_THRESHOLD),
		setToDefaultProjectType() {
			this.type = structuredClone(DEFAULT_TYPE_VALUE)
		},
		setDefaultProjectStatus() {
			this.status = structuredClone(DEFAULT_STATUS_VALUE)
		},
		setToDefaultProject() {
			this.project = structuredClone(DEFAULT_PROJECT_VALUE)
		},
		setToDefaultDescription() {
			this.description = structuredClone(DEFAULT_DESCRIPTION_VALUE)
		},
		setToDefaultProjectAssignee() {
			this.assignee = structuredClone(DEFAULT_ASSIGNEE_VALUE)
		},
		setToDefaultError() {
			this.error = structuredClone(DEFAULT_ERROR_VALUE)
		},
		closeModal() {
			this.$emit('close-create-work-package-modal')
			this.resetData()
		},
		resetData() {
			this.allowedTypes = []
			this.allowedStatues = []
			this.availableAssignees = []
			this.setToDefaultError()
			this.setToDefaultDescription()
			this.setToDefaultProject()
			this.setToDefaultProjectType()
			this.setDefaultProjectStatus()
			this.setToDefaultProjectAssignee()
			this.subject = ''
			this.projectId = null
			this.availableProjects = []
			this.noDropAvailableProjectDropDown = true
			this.customTypeError = false
			this.previousProjectId = null
			this.isDescriptionTemplateChanged = false
			this.previousDescriptionTemplate = ''
			this.isFetchingProjectsFromOpenProjectWithQuery = false
			this.initialAvailableProjects = []
		},
		async searchForProjects(searchQuery = null) {
			const req = {}
			if (searchQuery) {
				this.state = STATE.LOADING
				req.params = {
					searchQuery,
				}
			}
			const url = generateOcsUrl('/apps/integration_openproject/api/v1/projects')
			try {
				const response = await axios.get(url, req)
				await this.processProjects(response.data.ocs.data)
			} catch (e) {
				console.error('Couldn\'t fetch openproject projects')
			}
			if (this.isFetchingProjectsFromOpenProjectWithQuery === false) {
				this.initialAvailableProjects = this.availableProjects
			}
			if (this.isStateLoading) {
				this.state = STATE.OK
			}
		},
		async processProjects(projects) {
			this.availableProjects = []
			for (const index in projects) {
				const project = {}
				project.label = projects[index].name
				project.id = projects[index].id
				project.identifier = projects[index].identifier
				project.self = projects[index]._links.self
				project.parent = projects[index]._links.parent
				project.children = []
				this.availableProjects[index] = project
			}
			this.buildNestedStructure()
		},
		buildNestedStructure() {
			const childId = []

			for (const projectId in this.availableProjects) {
				const project = this.availableProjects[projectId]
				if (project.parent.href !== null) {
					const parentProjectId = project.parent.href.match(/\/(\d+)$/)[1]
					if (project.children.length <= 0) {
						this.availableProjects[parentProjectId].children.push(project)
						childId.push(project.id)
					}
				}
			}
			for (let i = 0; i < childId.length; i++) {
				delete this.availableProjects[childId[i]]
			}
			this.availableProjects = this.availableProjects.filter(item => item !== undefined)
		},
		onSubjectChange(value) {
			if (this.error.error) {
				this.setToDefaultError()
			}
			this.subject = value
		},
		async onSelectProject(selectedOption) {
			this.project = selectedOption
			this.projectId = selectedOption.id
			if (this.previousProjectId === this.projectId) {
				return
			}
			if (this.error.error) {
				this.setToDefaultError()
			}
			// set the allowed values for both type and status when project selection changes
			await this.validateWorkPackageForm(this.projectId, true, true)
		},
		async onSelectType(selectedOption) {
			if (this.error.error) {
				this.setToDefaultError()
			}
			if (this.customTypeError) {
				this.customTypeError = false
			}
			this.type = selectedOption
			// set the allowed values for status when type selection changes
			await this.validateWorkPackageForm(this.projectId, false, true)
		},
		onSelectStatus(selectedOption) {
			if (this.error.error) {
				this.setToDefaultError()
			}
			this.status = selectedOption
		},
		onSelectAssignee(selectedOption) {
			this.assignee = selectedOption
		},
		isTypeOrStatusAlreadyInAllowedList(prevTypeOrStatus, allowedTypesOrStatus) {
			const listTypes = []
			allowedTypesOrStatus.forEach((type) => {
				listTypes.push(type.label)
			})
			return !(!listTypes.includes(prevTypeOrStatus) && prevTypeOrStatus !== '')
		},
		checkIfTheDescriptionTemplateIsChanged() {
			if (this.isDescriptionTemplateChanged === false) {
				if (this.previousDescriptionTemplate !== this.description.raw) {
					this.isDescriptionTemplateChanged = true
				}
			}
		},
		async validateWorkPackageForm(id, setAllowedType = false, setAllowedStatus = false) {
			this.checkIfTheDescriptionTemplateIsChanged()
			const url = generateOcsUrl(`/apps/integration_openproject/api/v1/projects/${id}/work-packages/form`)
			const body = this.getBodyForRequest
			const previousProjectType = this.type.label
			const previousProjectStatus = this.status.label
			this.previousProjectId = id
			try {
				const response = await axios.post(url, body)
				const responseData = response.data.ocs.data
				if (setAllowedType && setAllowedStatus) {
					// when project is changed set all the values to default and
					// set new allowed values for types, status, assignee to display as the option in dropdown
					this.setDefaultProjectStatus()
					this.setToDefaultProjectType()
					this.setToDefaultProjectAssignee()
					this.allowedTypes = []
					this.allowedStatues = []
					this.allowedTypes.push(...this.setAllowedValues(responseData.schema.type._embedded.allowedValues))
					this.allowedStatues.push(...this.setAllowedValues(responseData.schema.status._embedded.allowedValues))
					await this.setAvailableAssigneesForProject(id)
					this.type.label = (this.isTypeOrStatusAlreadyInAllowedList(previousProjectType, this.allowedTypes))
						? responseData.payload._links.type.title
						: ''
					this.status.label = responseData.payload._links.status.title
				} else if (setAllowedStatus) {
					// when only type changes then reset status only
					this.setDefaultProjectStatus()
					this.allowedStatues = []
					this.allowedStatues.push(...this.setAllowedValues(responseData.schema.status._embedded.allowedValues))
					this.status.label = (this.isTypeOrStatusAlreadyInAllowedList(previousProjectStatus, this.allowedStatues))
						? responseData.payload._links.status.title
						: ''
				}
				if (responseData.validationErrors) {
					const validationErrors = responseData.validationErrors
					for (const errors in validationErrors) {
						if (errors.startsWith('customField')) {
							this.customTypeError = true
							return
						}
						if (errors.startsWith('type')) {
							if (validationErrors[errors].message === 'Type is not set to one of the allowed values.') {
								this.setToDefaultProjectType()
							}
						}
					}
				}
				this.type.self = responseData.payload._links.type
				this.status.self = responseData.payload._links.status
				this.subject = responseData.payload.subject
				if (this.isDescriptionTemplateChanged === false) {
					this.description = responseData.payload.description
					this.previousDescriptionTemplate = this.description.raw
				}
			} catch (e) {
				console.error('Form validation failed')
			}
		},
		setAllowedValues(allowedValuesList) {
			const allowedValues = []
			for (const index in allowedValuesList) {
				const values = {}
				values.self = allowedValuesList[index]._links.self
				// set label to title as the NC select looks for label for filtering options
				values.label = values.self.title
				allowedValues.push(values)
			}
			return allowedValues
		},
		async setAvailableAssigneesForProject(projectId) {
			this.availableAssignees = []
			let response
			const url = generateOcsUrl(`/apps/integration_openproject/api/v1/projects/${projectId}/available-assignees`)
			try {
				response = await axios.get(url)
			} catch (e) {
				console.error('Cannot fetch available assignees')
			}
			const assignees = response.data.ocs.data
			for (const index in assignees) {
				const assignee = {}
				assignee.self = assignees[index]._links.self
				// set label to title as the NC select looks for label for filtering options
				assignee.label = assignee.self.title
				this.availableAssignees.push(assignee)
			}
		},
		async createWorkpackage() {
			const url = generateOcsUrl('/apps/integration_openproject/api/v1/create/work-packages')
			const payload = this.getBodyForRequest
			payload.body.description = this.description
			let response = null
			const eventData = {}
			try {
				// the status is not validated by the /from endpoint which when not set is default to in progress
				// we need to validate the status explicitly
				if (this.project.label !== '' && this.type.label !== '' && this.status.label === '') {
					this.error = {
						error: true,
						multipleErrors: {},
						attribute: 'status',
						message: t('integration_openproject', 'Status is not set to one of the allowed values.'),
					}
					return
				}
				response = await axios.post(url, payload)
			} catch (e) {
				response = e.response
			}
			if (response.status === 201) {
				eventData.openProjectEventName = 'work_package_creation_success'
				eventData.openProjectEventPayload = response.data.ocs.data
				this.$emit('create-work-package', eventData)
				this.resetData()
			} else {
				if (response.status === 422) {
					const error = JSON.parse(response.data.ocs.data)
					let attribute = null
					let message = null
					const multipleErrors = {}
					if (error.errorIdentifier === 'urn:openproject-org:api:v3:errors:PropertyConstraintViolation') {
						attribute = error._embedded.details.attribute
						message = error.message
					} else if (error.errorIdentifier === 'urn:openproject-org:api:v3:errors:MultipleErrors') {
						const errors = error._embedded.errors
						for (const err of errors) {
							if ((err._embedded.details.attribute === 'subject')) {
								multipleErrors.subject = err.message
							} else if ((err._embedded.details.attribute === 'project')) {
								multipleErrors.project = err.message
							} else if ((err._embedded.details.attribute === 'type')) {
								multipleErrors.type = err.message
							}
						}
					}
					this.error = {
						error: true,
						multipleErrors,
						attribute,
						message,
					}
				} else {
					eventData.openProjectEventName = 'work_package_creation_cancellation'
					this.$emit('create-work-package', eventData)
					this.resetData()
				}
			}
		},
	},
}
</script>
<style lang="scss">
.create-workpackage-modal {
	&--title {
		margin: 10px;
		text-align: left;
		padding: 10px;
		font-weight: 700;
		font-size: 1.125rem;
		line-height: 1.5rem;
	}
}

.options {
	padding-left: 0;
}

.parent {
	padding-left: 10px;
}

.create-workpackage-form-wrapper {
	margin: 20px;
}

.select {
	width: 100% !important;
}

.validation-error {
	margin-top: 10px;
	color: var(--color-error) !important;
}

.type-error {
	align-self: flex-start;
}

.subject-error {
	border-color: var(--color-error) !important;
}

.create-workpackage-form {
	top: 157px;
	left: 434px;
	gap: 16px;

	&--label {
		margin: 15px 0px 5px 0px;
		font-weight: 400;
		letter-spacing: 0;
		text-align: left;
		font-size: .875rem;
		line-height: 1rem;
	}
	&--select {
		margin: 15px 0;
		width: 100%;
		position: sticky;
		position: -webkit-sticky; /* Safari */
	}
	&--subject {
		width: 100%;
	}
	&--description {
		width: 100%;
		height: 178px;
		border: 0.08rem solid var(--color-border-maxcontrast);
	}
	&--description:focus {
		border: 0.15rem solid var(--color-main-text) !important;
	}
	&--type-status-container {
		display: flex;
		flex-flow: wrap;
		justify-content: space-between;
		width: 100%;
	}
	&--type {
		width: 48%;
	}
	&--status {
		width: 48%;
	}
	&--button {
		width: 100%;
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		gap: 16px;
		margin: 30px 0;

		&--create {
			background-color: var(--color-primary-element) !important;
			color: var(--color-primary-element-text) !important;
		}
		&--cancel {
			background-color: var(--color-background-dark) !important;
			color: var(--color-main-text) !important;
			border: 1px solid var(--color-border-dark) !important;
		}
	}
}

.workpackage-subject {
	border: 0.08rem solid var(--color-border-maxcontrast) !important;
}

.workpackage-subject:focus {
	border: 0.15rem solid var(--color-main-text) !important;
}

.openProjectUrl {
	color: var(--color-primary) !important;
}

.create-workpackage-form--button---create:hover, .create-workpackage-form--button--cancel:hover {
	background-color: var(--color-background-hover) !important;
}

@media (max-width: 800px) {
	.create-workpackage-form--status, .create-workpackage-form--type {
		flex: 100%;
	}
}
</style>
