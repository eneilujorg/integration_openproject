<!--
  - @copyright Copyright (c) 2023 Swikriti Tripathi <swikriti@jakaritech.com>
  -
  - @author 2023 Swikriti Tripathi <swikriti@jakaritech.com>
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
  - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  - GNU Affero General Public License for more details.
  -
  - You should have received a copy of the GNU Affero General Public License
  - along with this program. If not, see <http://www.gnu.org/licenses/>.
  -->

<template>
	<div id="work-package-smart-picker" class="work-package-picker">
		<h2 class="work-package-picker__header">
			{{ t('integration_openproject', 'OpenProject work package picker') }}
		</h2>
		<SearchInput
			ref="linkPicker"
			:is-smart-picker="true"
			:file-info="fileInfo"
			:is-disabled="isLoading || !enableSearchInput || !isStateOk"
			:linked-work-packages="linkedWorkPackages"
			@submit="onSubmit" />
		<div id="openproject-empty-content">
			<NcLoadingIcon v-if="isLoading" class="loading-spinner" :size="90" />
			<EmptyContent
				v-else
				:state="state"
				:auth-method="adminConfigState.authMethod"
				:file-info="fileInfo"
				:is-smart-picker="true"
				:is-admin-config-ok="adminConfigState.isAdminConfigOk" />
		</div>
	</div>
</template>

<script>
import SearchInput from '../components/tab/SearchInput.vue'
import EmptyContent from '../components/tab/EmptyContent.vue'
import { AUTH_METHOD, STATE } from '../utils.js'
import { loadState } from '@nextcloud/initial-state'
import { generateOcsUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import { NcLoadingIcon } from '@nextcloud/vue'

export default {
	name: 'WorkPackagePickerElement',

	components: {
		EmptyContent,
		SearchInput,
		NcLoadingIcon,
	},

	props: {
		providerId: {
			type: String,
			required: true,
		},
		accessible: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			fileInfo: {},
			linkedWorkPackages: [],
			state: STATE.LOADING,
			adminConfigState: loadState('integration_openproject', 'admin-config'),
		}
	},
	computed: {
		isStateOk() {
			return this.state === STATE.OK
		},
		isLoading() {
			return this.state === STATE.LOADING
		},
		enableSearchInput() {
			if (this.adminConfigState.authMethod === AUTH_METHOD.OAUTH2 && this.adminConfigState.isAdminConfigOk) {
				return true
			}
			if (this.adminConfigState.authMethod === AUTH_METHOD.OIDC && this.adminConfigState.isAdminConfigOk) {
				return true
			}
			return false
		},
	},
	mounted() {
		this.checkIfOpenProjectIsAvailable()
	},
	methods: {
		onSubmit(data) {
			this.$emit('submit', data)
		},
		async checkIfOpenProjectIsAvailable() {
			if (!this.adminConfigState.isAdminConfigOk) {
				this.state = STATE.ERROR
				return
			}
			const configurationUrl = generateOcsUrl('/apps/integration_openproject/api/v1/configuration')
			let response = null
			try {
				// send an axios request to fetch configuration to see if the connection is there
				response = await axios.get(configurationUrl)
				if (response.data.ocs.data) {
					this.state = STATE.OK
					if (this.$refs.linkPicker?.$refs?.workPackageSelect) {
						this.$nextTick(() => {
							document.getElementById(`${this.$refs.linkPicker?.$refs?.workPackageSelect?.inputId}`).focus()
						})
					}
				} else {
					this.state = STATE.ERROR
				}
			} catch (error) {
				document.activeElement?.blur()
				if (error.response && (error.response.status === 404 || error.response.status === 503)) {
					this.state = STATE.CONNECTION_ERROR
				} else if (error.response && error.response.status === 401) {
					this.state = STATE.NO_TOKEN
				} else {
					this.state = STATE.ERROR
				}
			}
		},
	},
}
</script>

<style scoped lang="scss">
.work-package-picker {
	width: 100%;
	display: flex;
	flex-direction: column;
	margin-top: 44px;
	h2 {
		display: flex;
		align-items: center;
		align-self: center;
	}
	#openproject-empty-content {
		height: 400px !important;
	}
	.loading-spinner {
		margin-top: 150px;
	}
}

</style>
