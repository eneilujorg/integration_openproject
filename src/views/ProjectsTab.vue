<!--
  - @copyright Copyright (c) 2022 Kiran Parajuli <kiran@jankaritech.com>
  -
  - @author Kiran Parajuli <kiran@jankaritech.com>
  -
  - @license GNU AGPL version 3 or any later version
  -
  - This program is free software: you can redistribute it and/or modify
  - it under the terms of the GNU Affero General Public License as
  - published by the Free Software Foundation, either version 3 of the
  - License, or (at your option) any later version.
  -
  - This program is distributed in the hope that it will be useful,
  - but WITHOUT ANY WARRANTY; without even the implied warranty of
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program. If not, see <http://www.gnu.org/licenses/>.
  -
  -->

<template>
	<div class="projects"
		:class="{'projects--empty': filterWorkpackagesByFileId.length === 0}">
		<SearchInput v-if="!!isAdminConfigOk && !!isStateOk"
			:file-info="fileInfo"
			:linked-work-packages="filterWorkpackagesByFileId"
			:search-origin="searchOrigin"
			@saved="onSaved" />
		<NcLoadingIcon v-if="isLoading" class="loading-spinner" :size="60" />
		<div v-else-if="filterWorkpackagesByFileId.length > 0" id="openproject-linked-workpackages">
			<div class="existing-relations">
				{{ t('integration_openproject', 'Existing relations:') }}
			</div>
			<div v-for="(workpackage, index) in filterWorkpackagesByFileId"
				:key="workpackage.id"
				class="linked-workpackages">
				<div class="linked-workpackages--workpackage">
					<WorkPackage :id="'workpackage-'+ workpackage.id"
						:workpackage="workpackage"
						class="linked-workpackages--workpackage--item"
						@click.native="routeToTheWorkPackage(workpackage.id, workpackage.projectId)" />
					<NcActions>
						<NcActionButton class="linked-workpackages--workpackage--unlinkactionbutton"
							@click="unlink(workpackage.id, fileInfo.id)">
							{{ t('integration_openproject', 'Unlink Work Package') }}
							<template #icon>
								<LinkOffIcon :size="20" />
							</template>
						</NcActionButton>
					</NcActions>
				</div>
				<div :class="{ 'workpackage-seperator': index !== filterWorkpackagesByFileId.length-1 }" />
			</div>
		</div>
		<EmptyContent v-else
			id="openproject-empty-content"
			:state="state"
			:file-info="fileInfo"
			:auth-method="authMethod"
			:is-admin-config-ok="isAdminConfigOk" />
	</div>
</template>

<script>
import EmptyContent from '../components/tab/EmptyContent.vue'
import WorkPackage from '../components/tab/WorkPackage.vue'
import { NcActions, NcLoadingIcon, NcActionButton } from '@nextcloud/vue'
import SearchInput from '../components/tab/SearchInput.vue'
import LinkOffIcon from 'vue-material-design-icons/LinkOff.vue'

import axios from '@nextcloud/axios'

import { generateOcsUrl } from '@nextcloud/router'
import { showSuccess, showError } from '@nextcloud/dialogs'
import { translate as t } from '@nextcloud/l10n'
import { loadState } from '@nextcloud/initial-state'
import { workpackageHelper } from '../utils/workpackageHelper.js'
import { STATE, WORKPACKAGES_SEARCH_ORIGIN, AUTH_METHOD, checkOauthConnectionResult } from '../utils.js'

export default {
	name: 'ProjectsTab',
	components: {
		EmptyContent,
		SearchInput,
		WorkPackage,
		NcActions,
		NcActionButton,
		NcLoadingIcon,
		LinkOffIcon,
	},
	data: () => ({
		error: '',
		fileInfo: {},
		state: STATE.LOADING,
		workpackages: [],
		oauthConnectionErrorMessage: loadState('integration_openproject', 'oauth-connection-error-message'),
		oauthConnectionResult: loadState('integration_openproject', 'oauth-connection-result'),
		isAdminConfigOk: loadState('integration_openproject', 'admin_config_ok'),
		authMethod: loadState('integration_openproject', 'authorization_method'),
		color: null,
		openprojectUrl: loadState('integration_openproject', 'openproject-url'),
		searchOrigin: WORKPACKAGES_SEARCH_ORIGIN.PROJECT_TAB,
	}),
	computed: {
		isLoading() {
			return this.state === STATE.LOADING
		},
		isStateOk() {
			return this.state === STATE.OK
		},
		filterWorkpackagesByFileId() {
			return this.workpackages.filter(wp => {
				if (wp.fileId === undefined || wp.fileId === '') {
					console.error('work-package data does not contain a fileId')
					return false
				}
				return wp.fileId === this.fileInfo.id
			})
		},
	},
	mounted() {
		if (this.authMethod === AUTH_METHOD.OAUTH2) {
			checkOauthConnectionResult(this.oauthConnectionResult, this.oauthConnectionErrorMessage)
		}
	},
	methods: {
		/**
		 * updates current resource
		 *
		 * @param {object} fileInfo file information
		 */
		async update(fileInfo) {
			this.fileInfo = fileInfo
			this.workpackages = []
			this.state = STATE.LOADING
			if (this.isAdminConfigOk) {
				// only fetch if we have a request url
				await this.fetchWorkpackages(this.fileInfo.id)
			} else {
				this.state = STATE.ERROR
			}
		},
		checkForErrorCode(statusCode) {
			if (statusCode === 200 || statusCode === 204) return
			if (statusCode === 401) {
				this.state = STATE.NO_TOKEN
			} else {
				this.state = STATE.ERROR
			}
		},
		/**
		 * Reset the current view to its default state
		 */
		resetState() {
			this.error = ''
			this.state = STATE.LOADING
		},
		onSaved(data) {
			this.workpackages.unshift(data)
			this.$nextTick(() => {
				const workpackage = document.getElementById('workpackage-' + data.id)
				const topElementToScroll = this.$el.getElementsByClassName('existing-relations')[0]
				workpackage.classList.add('workpackage-transition')
				topElementToScroll.scrollIntoView({
					behavior: 'smooth',
				})
				setTimeout(() => {
					workpackage.classList.remove('workpackage-transition')
				}, 3000)
			})
		},
		async routeToTheWorkPackage(workpackageId, projectId) {
			const openprojectUrl = this.openprojectUrl.replace(/\/+$/, '')
			const workpackageUrl = openprojectUrl + '/projects/' + projectId + '/work_packages/' + workpackageId
			window.open(workpackageUrl)
		},
		unlink(workpackageId, fileId) {
			OC.dialogs.confirmDestructive(
				t('integration_openproject',
					'Are you sure you want to unlink the work package?',
				),
				t('integration_openproject', 'Confirm unlink'),
				{
					type: OC.dialogs.YES_NO_BUTTONS,
					confirm: t('integration_openproject', 'Unlink'),
					confirmClasses: 'error',
					cancel: t('integration_openproject', 'Cancel'),
				},
				(result) => {
					if (result) {
						this.unlinkWorkPackage(workpackageId, fileId).then((response) => {
							this.workpackages = this.workpackages.filter(workpackage => workpackage.id !== workpackageId)
							showSuccess(t('integration_openproject', 'Work package unlinked'))
						}).catch((error) => {
							showError(
								t('integration_openproject', 'Failed to unlink work package'),
							)
							this.checkForErrorCode(error.response.status)
						})
					}
				},
				true,
			)
		},
		async unlinkWorkPackage(workpackageId, fileId) {
			let response
			try {
				response = await axios.get(generateOcsUrl(`/apps/integration_openproject/api/v1/work-packages/${workpackageId}/file-links`))
			} catch (e) {
				response = e.response
			}
			if (response.status === 200) {
				const id = this.processLink(response.data.ocs.data, fileId)
				const url = generateOcsUrl('/apps/integration_openproject/api/v1/file-links/' + id)
				response = await axios.delete(url)
			} else {
				this.checkForErrorCode(response.status)
				throw new Error('could not fetch the delete link of work-package')
			}
			return response
		},
		processLink(data, fileId) {
			let linkId
			for (const element of data) {
				if (parseInt(element.originData.id) === fileId) {
					linkId = element.id
					break
				}
			}
			return linkId
		},
		workpackageAlreadyInList(workPackage) {
			return this.workpackages.some(
				elem => elem.id === workPackage.id && elem.fileId === workPackage.fileId,
			)
		},
		async fetchWorkpackages(fileId) {
			const req = {}
			const url = generateOcsUrl('/apps/integration_openproject/api/v1/work-packages?fileId=' + fileId)
			try {
				const response = await axios.get(url, req)
				const responseData = response.data.ocs.data
				if (!Array.isArray(responseData)) {
					this.state = STATE.FAILED_FETCHING_WORKPACKAGES
				} else {
					// empty data means there are no workpackages linked
					if (responseData.length > 0) {
						for (let workPackage of responseData) {
							if (fileId !== this.fileInfo.id) {
								break
							}
							workPackage.fileId = fileId
							// if the WP is already in the list, because the user switched quickly between files
							// and came back to a file that was selected before and so work-packages are already
							// in the list. In that case don't even try to fetch all the additional meta data
							if (!this.workpackageAlreadyInList(workPackage)) {
								workPackage = await workpackageHelper.getAdditionalMetaData(workPackage, true)
								// check again, the WP might have been added by an outstanding request
								// from another file or the file might have changed while fetching metadata
								if (
									!this.workpackageAlreadyInList(workPackage)
									&& workPackage.fileId === this.fileInfo.id
								) {
									this.workpackages.push(workPackage)
								}
							}
						}
					}
					// if the file was changed in between the state cannot be OK
					if (fileId === this.fileInfo.id) {
						this.state = STATE.OK
					}
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
.projects {
	width: 100%;

	.existing-relations {
		text-align: left;
		font-weight: bold;
		font-size: 0.8rem;
		padding: 12px;
	}

	.center-content {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.title {
		font-size: 2rem;
		font-weight: 600;
		padding-bottom: 0;
	}

	.subtitle {
		padding-top: 0;
		font-size: 1.2rem;
	}

	.linked-workpackages--workpackage {
		display: flex;
		position: relative;
		width: 100%;
		&--item {
			border: none;
		}
		&--unlinkactionbutton {
			position: absolute;
			right: 0;
			top: 0;
			margin: 4px;
			visibility: hidden;
		}
	}

	.linked-workpackages:hover {
		background-color: var(--color-background-dark);
	}

	.linked-workpackages:hover .linked-workpackages--workpackage--unlinkactionbutton {
		visibility: visible;
		cursor: pointer;
	}

	.workpackage-seperator {
		height: 0;
		margin: 0 10px;
		border-bottom: 1px solid var(--color-background-dark);
	}
}

.projects--empty {
	height: 100%;
}

@keyframes fade-in {
	0% {
		opacity: 0;
		background-color: var(--color-background-dark);
	}

	100% {
		opacity: 1;
	}
}

.workpackage-transition {
	animation: fade-in 3s 1;
}
</style>
