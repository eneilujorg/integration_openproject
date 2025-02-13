<template>
	<div id="openproject_prefs" class="section">
		<TermsOfServiceUnsigned :is-all-terms-of-service-signed-for-user-open-project="isAllTermsOfServiceSignedForUserOpenProject" />
		<SettingsTitle is-setting="admin" />
		<NcNoteCard v-if="!isAdminAuditConfigurationSetUpCorrectly" class="note-card" type="info">
			<p class="note-card--info-description" v-html="getAdminAuditConfigurationHint" /> <!-- eslint-disable-line vue/no-v-html -->
		</NcNoteCard>
		<div class="openproject-server-host">
			<FormHeading index="1"
				:title="t('integration_openproject', 'OpenProject server')"
				:is-complete="isServerHostFormComplete"
				:is-dark-theme="isDarkTheme" />
			<FieldValue v-if="isServerHostFormInView"
				is-required
				class="pb-1"
				:title="t('integration_openproject', 'OpenProject host')"
				:value="state.openproject_instance_url" />
			<TextInput v-else
				id="openproject-oauth-instance"
				ref="openproject-oauth-instance-input"
				v-model="serverHostUrlForEdit"
				is-required
				:read-only="isServerHostUrlReadOnly"
				class="pb-1"
				:label="t('integration_openproject', 'OpenProject host')"
				place-holder="https://www.my-openproject.com"
				:hint-text="t('integration_openproject', 'Please introduce your OpenProject hostname')"
				:error-message="serverHostErrorMessage"
				:error-message-details="openProjectNotReachableErrorMessageDetails"
				@click="isServerHostUrlReadOnly = false"
				@input="isOpenProjectInstanceValid = null" />
			<div class="form-actions">
				<NcButton v-if="isServerHostFormInView"
					data-test-id="reset-server-host-btn"
					@click="setServerHostFormToEditMode">
					<template #icon>
						<PencilIcon :size="20" />
					</template>
					{{ t('integration_openproject', 'Edit server information') }}
				</NcButton>
				<NcButton v-if="isServerHostFormComplete && isServerHostFormInEdit"
					class="mr-2"
					data-test-id="cancel-edit-server-host-btn"
					@click="setServerHostFormToViewMode">
					{{ t('integration_openproject', 'Cancel') }}
				</NcButton>
				<NcButton v-if="isServerHostFormInEdit"
					type="primary"
					data-test-id="submit-server-host-form-btn"
					:disabled="!serverHostUrlForEdit || serverHostUrlForEdit === state.openproject_instance_url"
					@click="saveOpenProjectHostUrl">
					<template #icon>
						<NcLoadingIcon v-if="loadingServerHostForm" class="loading-spinner" :size="20" />
						<CheckBoldIcon v-else fill-color="#FFFFFF" :size="20" />
					</template>
					{{ t('integration_openproject', 'Save') }}
				</NcButton>
			</div>
		</div>
		<div class="authorization-method">
			<FormHeading index="2"
				:title="t('integration_openproject', 'Authorization method')"
				:is-complete="isAuthorizationMethodFormComplete"
				:is-disabled="isAuthorizationFormInDisabledMode"
				:is-dark-theme="isDarkTheme" />
			<div v-if="isServerHostFormComplete">
				<div v-if="isAuthorizationFormInEditMode" class="authorization-method">
					<div class="authorization-method--description">
						<p class="title">
							{{ t('integration_openproject', 'Need help setting this up?') }}
						</p>
						<p class="description" v-html="getAuthorizationMethodHintText" /> <!-- eslint-disable-line vue/no-v-html -->
					</div>
					<div class="authorization-method--options">
						<NcCheckboxRadioSwitch class="radio-check"
							:checked.sync="authorizationMethod.authorizationMethodSet"
							:value="authMethods.OAUTH2"
							type="radio">
							{{ authMethodsLabel.OAUTH2 }}
						</NcCheckboxRadioSwitch>
						<NcCheckboxRadioSwitch class="radio-check"
							:checked.sync="authorizationMethod.authorizationMethodSet"
							:value="authMethods.OIDC"
							:disabled="!isOIDCAppInstalledAndEnabled || !state.user_oidc_supported"
							type="radio">
							{{ authMethodsLabel.OIDC }}
						</NcCheckboxRadioSwitch>
						<p v-if="!isOIDCAppInstalledAndEnabled" class="oidc-app-check-description" v-html="getOIDCAppNotInstalledHintText" /> <!-- eslint-disable-line vue/no-v-html -->
						<ErrorLabel v-if="isOIDCAppInstalledAndEnabled && !state.user_oidc_supported" :error="errorMessages.appNotSupported('User_Oidc', state.user_oidc_minimum_version)" type="error" />
					</div>
				</div>
				<div v-else>
					<p class="title">
						{{ getSelectedAuthenticatedMethod }}
					</p>
				</div>
				<div class="form-actions">
					<NcButton v-if="isAuthorizationMethodFormInViewMode"
						data-test-id="reset-authorization-method-btn"
						@click="setAuthorizationMethodInEditMode">
						<template #icon>
							<PencilIcon :size="20" />
						</template>
						{{ t('integration_openproject', 'Edit authorization method') }}
					</NcButton>
					<NcButton v-if="isAuthorizationFormInEditMode && authorizationMethod.currentAuthorizationMethodSelected !== null"
						class="mr-2"
						data-test-id="cancel-edit-auth-method-btn"
						@click="setAuthorizationMethodToViewMode">
						{{ t('integration_openproject', 'Cancel') }}
					</NcButton>
					<NcButton v-if="isAuthorizationFormInEditMode"
						data-test-id="submit-auth-method-values-btn"
						type="primary"
						:disabled="isAuthorizationMethodSelected"
						@click="selectAuthorizationMethod">
						<template #icon>
							<NcLoadingIcon v-if="loadingAuthorizationMethodForm" class="loading-spinner" :size="20" />
							<CheckBoldIcon v-else fill-color="#FFFFFF" :size="20" />
						</template>
						{{ t('integration_openproject', 'Save') }}
					</NcButton>
				</div>
			</div>
		</div>
		<div v-if="authorizationMethod.currentAuthorizationMethodSelected === authMethods.OIDC" class="authorization-settings">
			<FormHeading index="3"
				:title="t('integration_openproject', 'Authorization settings')"
				:is-complete="isAuthorizationSettingFormComplete"
				:is-disabled="isAuthorizationSettingFormInDisabledMode"
				:is-dark-theme="isDarkTheme" />
			<div class="authorization-settings--content">
				<FieldValue v-if="isAuthorizationSettingsInViewMode"
					is-required
					class="pb-1"
					:title="t('integration_openproject', 'OIDC Provider')"
					:value="authorizationSetting.oidcProviderSet" />
				<div v-else class="authorization-settings--content--provider">
					<p class="authorization-settings--content--label">
						{{ t('integration_openproject', 'OIDC provider *') }}
					</p>
					<div id="select">
						<NcSelect
							input-id="provider-search-input"
							:placeholder="t('integration_openproject', 'Select an OIDC provider')"
							:options="registeredOidcProviders"
							:value="getCurrentSelectedOIDCProvider"
							:filterable="true"
							:close-on-select="true"
							:clear-search-on-blur="() => false"
							:append-to-body="false"
							:label-outside="true"
							:input-label="t('integration_openproject', 'OIDC provider')"
							@option:selected="onSelectOIDCProvider" />
					</div>
					<p class="description" v-html="getConfigureOIDCHintText" /> <!-- eslint-disable-line vue/no-v-html -->
				</div>
				<FieldValue v-if="isAuthorizationSettingsInViewMode"
					is-required
					class="pb-1"
					:title="t('integration_openproject', 'OpenProject client ID')"
					:value="state.authorization_settings.targeted_audience_client_id" />
				<div v-else class="authorization-settings--content--client">
					<TextInput
						id="authorization-method-target-client-id"
						v-model="state.authorization_settings.targeted_audience_client_id"
						class="py-1"
						is-required
						:label="t('integration_openproject', 'OpenProject client ID')"
						hint-text="You can get this value from Keycloak when you set-up define the client" />
				</div>
			</div>
			<div class="form-actions">
				<NcButton v-if="isAuthorizationSettingsInViewMode"
					data-test-id="reset-auth-settings-btn"
					@click="setAuthorizationSettingInEditMode">
					<template #icon>
						<PencilIcon :size="20" />
					</template>
					{{ t('integration_openproject', 'Edit authorization settings') }}
				</NcButton>
				<NcButton v-if="isAuthorizationSettingInEditMode && authorizationSetting.currentOIDCProviderSelected !== null && authorizationSetting.targetedAudienceClientIdSet !== null"
					class="mr-2"
					data-test-id="cancel-edit-auth-setting-btn"
					@click="setAuthorizationSettingToViewMode">
					{{ t('integration_openproject', 'Cancel') }}
				</NcButton>
				<NcButton v-if="isAuthorizationSettingInEditMode"
					data-test-id="submit-oidc-auth-settings-values-btn"
					type="primary"
					:disabled="isAuthorizationSettingsSelected"
					@click="saveOIDCAuthSetting">
					<template #icon>
						<NcLoadingIcon v-if="loadingAuthorizationMethodForm" class="loading-spinner" :size="20" />
						<CheckBoldIcon v-else fill-color="#FFFFFF" :size="20" />
					</template>
					{{ t('integration_openproject', 'Save') }}
				</NcButton>
			</div>
		</div>
		<div v-if="authorizationMethod.currentAuthorizationMethodSelected === authMethods.OAUTH2 || authorizationMethod.currentAuthorizationMethodSelected === null" class="openproject-oauth-values">
			<FormHeading index="3"
				:title="t('integration_openproject', 'OpenProject OAuth settings')"
				:is-complete="isOPOAuthFormComplete"
				:is-disabled="isOPOAuthFormInDisableMode"
				:is-dark-theme="isDarkTheme" />
			<div v-if="authorizationMethod.currentAuthorizationMethodSelected !== null">
				<FieldValue v-if="isOPOAuthFormInView"
					is-required
					:value="state.openproject_client_id"
					title="OpenProject OAuth client ID" />
				<TextInput v-else
					id="openproject-oauth-client-id"
					v-model="state.openproject_client_id"
					class="py-1"
					is-required
					label="OpenProject OAuth client ID"
					:hint-text="openProjectClientHint" />
				<FieldValue v-if="isOPOAuthFormInView"
					is-required
					class="pb-1"
					encrypt-value
					title="OpenProject OAuth client secret"
					:value="state.openproject_client_secret" />
				<TextInput v-else
					id="openproject-oauth-client-secret"
					v-model="state.openproject_client_secret"
					is-required
					class="py-1"
					label="OpenProject OAuth client secret"
					:hint-text="openProjectClientHint" />
				<div class="form-actions">
					<NcButton v-if="isOPOAuthFormComplete && isOPOAuthFormInView"
						data-test-id="reset-op-oauth-btn"
						@click="resetOPOAuthClientValues">
						<template #icon>
							<AutoRenewIcon :size="20" />
						</template>
						{{ t('integration_openproject', 'Replace OpenProject OAuth values') }}
					</NcButton>
					<NcButton v-else
						data-test-id="submit-op-oauth-btn"
						type="primary"
						:disabled="!state.openproject_client_id || !state.openproject_client_secret"
						@click="saveOPOAuthClientValues">
						<template #icon>
							<NcLoadingIcon v-if="loadingOPOauthForm" class="loading-spinner" :size="20" />
							<CheckBoldIcon v-else fill-color="#FFFFFF" :size="20" />
						</template>
						{{ t('integration_openproject', 'Save') }}
					</NcButton>
				</div>
			</div>
		</div>
		<div v-if="authorizationMethod.currentAuthorizationMethodSelected === authMethods.OAUTH2 || authorizationMethod.currentAuthorizationMethodSelected === null" class="nextcloud-oauth-values">
			<FormHeading index="4"
				:title="t('integration_openproject', 'Nextcloud OAuth client')"
				:is-complete="isNcOAuthFormComplete"
				:is-disabled="isNcOAuthFormInDisableMode"
				:is-dark-theme="isDarkTheme" />
			<div v-if="state.nc_oauth_client">
				<TextInput v-if="isNcOAuthFormInEdit"
					id="nextcloud-oauth-client-id"
					v-model="state.nc_oauth_client.nextcloud_client_id"
					class="py-1"
					read-only
					is-required
					with-copy-btn
					label="Nextcloud OAuth client ID"
					:hint-text="nextcloudClientHint" />
				<FieldValue v-else
					title="Nextcloud OAuth client ID"
					:value="state.nc_oauth_client.nextcloud_client_id"
					is-required />
				<TextInput v-if="isNcOAuthFormInEdit"
					id="nextcloud-oauth-client-secret"
					v-model="state.nc_oauth_client.nextcloud_client_secret"
					class="py-1"
					read-only
					is-required
					with-copy-btn
					label="Nextcloud OAuth client secret"
					:hint-text="nextcloudClientHint" />
				<FieldValue v-else
					title="Nextcloud OAuth client secret"
					is-required
					encrypt-value
					:value="ncClientSecret" />
				<div class="form-actions">
					<NcButton v-if="isNcOAuthFormInEdit"
						type="primary"
						:disabled="!ncClientId"
						data-test-id="submit-nc-oauth-values-form-btn"
						@click="setNCOAuthFormToViewMode">
						<template #icon>
							<CheckBoldIcon fill-color="#FFFFFF" :size="20" />
						</template>
						{{ t('integration_openproject', 'Yes, I have copied these values') }}
					</NcButton>
					<NcButton v-else
						data-test-id="reset-nc-oauth-btn"
						@click="resetNcOauthValues">
						<template #icon>
							<AutoRenewIcon :size="20" />
						</template>
						{{ t('integration_openproject', 'Replace Nextcloud OAuth values') }}
					</NcButton>
				</div>
			</div>
			<div v-if="!state.nc_oauth_client && isOPOAuthFormComplete && isOPOAuthFormInView && showDefaultManagedProjectFolders">
				<NcButton data-test-id="reset-nc-oauth-btn"
					@click="resetNcOauthValues">
					<template #icon>
						<AutoRenewIcon :size="20" />
					</template>
					{{ t('integration_openproject', 'Create Nextcloud OAuth values') }}
				</NcButton>
			</div>
		</div>
		<div class="project-folder-setup">
			<FormHeading :index="authorizationMethod.currentAuthorizationMethodSelected === authMethods.OIDC ? '4' : '5'"
				:is-project-folder-setup-heading="true"
				:title="t('integration_openproject', 'Project folders (recommended)')"
				:is-setup-complete-without-project-folders="isSetupCompleteWithoutProjectFolders"
				:is-there-error-after-project-folder-and-app-password-setup="isThereErrorAfterProjectFolderAndAppPasswordSetup"
				:show-encryption-warning-for-group-folders="showEncryptionWarningForGroupFolders"
				:is-complete="isProjectFolderSetupCompleted"
				:is-disabled="isProjectFolderSetUpInDisableMode"
				:is-dark-theme="isDarkTheme" />
			<div v-if="showDefaultManagedProjectFolders">
				<div v-if="isProjectFolderSetupFormInEdit">
					<NcCheckboxRadioSwitch type="switch" :checked.sync="isProjectFolderSwitchEnabled" @update:checked="changeProjectFolderSetUpState">
						<b>{{ t('integration_openproject', 'Automatically managed folders') }}</b>
					</NcCheckboxRadioSwitch>
					<div v-if="isProjectFolderSwitchEnabled === false" class="complete-without-groupfolders">
						<p class="project-folder-description">
							{{
								t('integration_openproject', 'We recommend using this functionality but it is not mandatory. Please activate it in case you want to use the automatic creation and management of project folders.')
							}}
						</p>
						<div class="form-actions">
							<NcButton type="primary"
								data-test-id="complete-without-project-folder-form-btn"
								@click="completeIntegrationWithoutProjectFolderSetUp">
								<template #icon>
									<CheckBoldIcon fill-color="#FFFFFF" :size="20" />
								</template>
								{{
									textLabelProjectFolderSetupButton
								}}
							</NcButton>
						</div>
					</div>
					<div v-else>
						<p class="project-folder-description">
							{{
								t('integration_openproject', 'Let OpenProject create folders per project automatically. It will ensure that every team member has always the correct access permissions.')
							}}
						</p>
						<br>
						<b>{{ t('integration_openproject', 'OpenProject user, group and folder') }}</b>
						<p class="project-folder-description">
							{{
								t('integration_openproject', 'For automatically managing project folders, this app needs to setup a special group folder, assigned to a group and managed by a user, each called "OpenProject".')
							}} <br>
							{{
								t('integration_openproject', 'The app will never delete files or folders, even if you deactivate this later.')
							}}
						</p>
						<NcNoteCard v-if="projectFolderSetupError !== null" class="note-card" type="error">
							<p class="note-card--title">
								<b>{{ projectFolderSetupError }}</b>
							</p>
							<p class="note-card--error-description" v-html="projectFolderSetUpErrorMessageDescription(projectFolderSetupError)" /> <!-- eslint-disable-line vue/no-v-html -->
						</NcNoteCard>
						<div class="form-actions">
							<NcButton v-if="projectFolderSetupError === null"
								type="primary"
								data-test-id="complete-with-project-folders-form-btn"
								@click="setUpProjectGroupFolders">
								<template #icon>
									<NcLoadingIcon v-if="loadingProjectFolderSetup" class="loading-spinner" :size="20" />
									<CheckBoldIcon v-else fill-color="#FFFFFF" :size="20" />
								</template>
								{{ textLabelProjectFolderSetupButton }}
							</NcButton>
							<NcButton v-else-if="projectFolderSetupError"
								type="primary"
								data-test-id="complete-with-project-folders-form-btn"
								@click="setUpProjectGroupFolders">
								<template #icon>
									<NcLoadingIcon v-if="loadingProjectFolderSetup" class="loading-spinner" :size="20" />
									<RestoreIcon v-else fill-color="#FFFFFF" :size="20" />
								</template>
								{{ t('integration_openproject', 'Retry setup OpenProject user, group and folder') }}
							</NcButton>
						</div>
					</div>
				</div>
				<div v-else class="project-folder-status">
					<div class="project-folder-status-value">
						<b>{{ t('integration_openproject','Automatically managed folders:') }}</b> {{ opUserAppPassword ? t('integration_openproject', 'Active') : t('integration_openproject', 'Inactive') }}
					</div>
					<NcNoteCard v-if="state.app_password_set && !isProjectFolderSetupCorrect" class="note-card" type="error">
						<p class="note-card--title">
							<b>{{ state.project_folder_info.errorMessage }}</b>
						</p>
						<p class="note-card--error-description" v-html="projectFolderSetUpErrorMessageDescription(state.project_folder_info.errorMessage)" /> <!-- eslint-disable-line vue/no-v-html -->
					</NcNoteCard>
					<NcNoteCard v-else-if="showEncryptionWarningForGroupFolders" class="note-card" type="warning">
						<p class="note-card--title">
							<b>{{ t('integration_openproject', 'Encryption for the Group Folders App is not enabled.') }}</b>
						</p>
						<p class="note-card--warning-description" v-html="getGroupFoldersEncryptionWarningHint" /> <!-- eslint-disable-line vue/no-v-html -->
					</NcNoteCard>
					<div class="form-actions">
						<NcButton
							data-test-id="edit-project-folder-setup"
							@click="setProjectFolderSetUpToEditMode">
							<template #icon>
								<PencilIcon :size="20" />
							</template>
							{{ t('integration_openproject', 'Edit project folders') }}
						</NcButton>
					</div>
				</div>
			</div>
		</div>
		<div v-if="state.app_password_set">
			<FormHeading index="6"
				:title="t('integration_openproject', 'Project folders application connection')"
				:is-complete="isOPUserAppPasswordFormComplete"
				:is-disabled="isOPUserAppPasswordInDisableMode"
				:is-dark-theme="isDarkTheme" />
			<div v-if="state.app_password_set">
				<TextInput v-if="isOPUserAppPasswordFormInEdit"
					id="openproject-system-password"
					v-model="oPUserAppPassword"
					class="py-1"
					read-only
					is-required
					with-copy-btn
					:label="t('integration_openproject', 'Application Password')"
					:hint-text="userAppPasswordHint" />
				<FieldValue v-else
					:title="t('integration_openproject', 'Application Password')"
					is-required
					hide-value
					with-inspection
					value="" />
				<div class="form-actions">
					<NcButton v-if="isOPUserAppPasswordFormInEdit"
						type="primary"
						:disabled="!opUserAppPassword"
						data-test-id="submit-op-system-password-form-btn"
						@click="setOPUserAppPasswordToViewMode">
						<template #icon>
							<CheckBoldIcon fill-color="#FFFFFF" :size="20" />
						</template>
						{{ t('integration_openproject', 'Done, complete setup') }}
					</NcButton>
					<NcButton v-else
						data-test-id="reset-user-app-password"
						@click="resetOPUserAppPassword">
						<template #icon>
							<AutoRenewIcon :size="20" />
						</template>
						{{ t('integration_openproject', 'Replace application password') }}
					</NcButton>
				</div>
			</div>
		</div>
		<NcButton id="reset-all-app-settings-btn"
			type="error"
			:disabled="isResetButtonDisabled"
			@click="resetAllAppValuesConfirmation">
			<template #icon>
				<RestoreIcon :size="20" />
			</template>
			{{ t('integration_openproject', 'Reset') }}
		</NcButton>
		<div v-if="isIntegrationCompleteWithOauth2 || isIntegrationCompleteWithOIDC" class="default-prefs">
			<h2>{{ t('integration_openproject', 'Default user settings') }}</h2>
			<p>
				{{ t('integration_openproject', 'A new user will receive these defaults and they will be applied to the integration app till the user changes them.') }}
			</p>
			<br>
			<CheckBox v-model="state.default_enable_navigation"
				input-id="default-prefs--link"
				:label="t('integration_openproject', 'Enable navigation link')"
				@input="setDefaultConfig">
				<template #hint>
					<p class="user-setting-description" v-html="userSettingDescription.NAVIGATION_LINK_DESCRIPTION" /> <!-- eslint-disable-line vue/no-v-html -->
				</template>
			</CheckBox>
			<CheckBox v-model="state.default_enable_unified_search"
				input-id="default-prefs--u-search"
				:label="t('integration_openproject', 'Enable unified search for tickets')"
				@input="setDefaultConfig">
				<template #hint>
					<p class="user-setting-description" v-html="userSettingDescription.UNIFIED_SEARCH_DESCRIPTION" /> <!-- eslint-disable-line vue/no-v-html -->
				</template>
			</CheckBox>
		</div>
	</div>
</template>

<script>
import util from 'util'
import axios from '@nextcloud/axios'
import { loadState } from '@nextcloud/initial-state'
import { generateUrl } from '@nextcloud/router'
import { showSuccess, showError } from '@nextcloud/dialogs'
import CheckBoldIcon from 'vue-material-design-icons/CheckBold.vue'
import PencilIcon from 'vue-material-design-icons/Pencil.vue'
import {
	NcLoadingIcon,
	NcCheckboxRadioSwitch,
	NcButton,
	NcNoteCard,
	NcSelect,
} from '@nextcloud/vue'
import RestoreIcon from 'vue-material-design-icons/Restore.vue'
import AutoRenewIcon from 'vue-material-design-icons/Autorenew.vue'
import TextInput from './admin/TextInput.vue'
import FieldValue from './admin/FieldValue.vue'
import FormHeading from './admin/FormHeading.vue'
import CheckBox from '../components/settings/CheckBox.vue'
import SettingsTitle from '../components/settings/SettingsTitle.vue'
import { F_MODES, FORM, USER_SETTINGS, AUTH_METHOD, AUTH_METHOD_LABEL } from '../utils.js'
import TermsOfServiceUnsigned from './admin/TermsOfServiceUnsigned.vue'
import dompurify from 'dompurify'
import { messagesFmt as errorMessages } from '../constants/messages.js'
import ErrorLabel from './ErrorLabel.vue'
export default {
	name: 'AdminSettings',
	components: {
		NcSelect,
		NcButton,
		FieldValue,
		FormHeading,
		TextInput,
		SettingsTitle,
		CheckBoldIcon,
		PencilIcon,
		NcLoadingIcon,
		AutoRenewIcon,
		RestoreIcon,
		CheckBox,
		NcCheckboxRadioSwitch,
		TermsOfServiceUnsigned,
		NcNoteCard,
		ErrorLabel,
	},
	data() {
		return {
			formMode: {
				// server host form is never disabled.
				// it's either editable or view only
				server: F_MODES.EDIT,
				authorizationMethod: F_MODES.DISABLE,
				authorizationSetting: F_MODES.DISABLE,
				opOauth: F_MODES.DISABLE,
				ncOauth: F_MODES.DISABLE,
				opUserAppPassword: F_MODES.DISABLE,
				projectFolderSetUp: F_MODES.DISABLE,
			},
			isFormCompleted: {
				server: false, authorizationMethod: false, authorizationSetting: false, opOauth: false, ncOauth: false, opUserAppPassword: false, projectFolderSetUp: false,
			},
			buttonTextLabel: {
				keepCurrentChange: t('integration_openproject', 'Keep current setup'),
				completeWithoutProjectFolderSetup: t('integration_openproject', 'Complete without project folders'),
				completeWithProjectFolderSetup: t('integration_openproject', 'Setup OpenProject user, group and folder'),
			},
			loadingServerHostForm: false,
			loadingProjectFolderSetup: false,
			loadingOPOauthForm: false,
			loadingAuthorizationMethodForm: false,
			loadingAuthorizationSettingForm: false,
			isOpenProjectInstanceValid: null,
			openProjectNotReachableErrorMessage: null,
			openProjectNotReachableErrorMessageDetails: null,
			state: loadState('integration_openproject', 'admin-config'),
			isAdminConfigOk: loadState('integration_openproject', 'admin-config-status'),
			serverHostUrlForEdit: null,
			isServerHostUrlReadOnly: true,
			oPOAuthTokenRevokeStatus: null,
			oPUserAppPassword: null,
			isProjectFolderSwitchEnabled: null,
			projectFolderSetupError: null,
			isProjectFolderAlreadySetup: null,
			// we assume this value as true and without error, it is set false when something goes wrong after the project folder setup is already completed
			isProjectFolderSetupCorrect: true,
			showDefaultManagedProjectFolders: false,
			// this keeps track of the state of project folder when user has done some setup (with or without)
			currentProjectFolderState: false,
			textLabelProjectFolderSetupButton: null,
			// pointer for which form the request is coming
			isFormStep: null,
			isDarkTheme: null,
			isAllTermsOfServiceSignedForUserOpenProject: true,
			userSettingDescription: USER_SETTINGS,
			authMethods: AUTH_METHOD,
			authMethodsLabel: AUTH_METHOD_LABEL,
			// here 'Set' defines that the method is selected and saved in database (e.g authorizationMethodSet)
			// whereas 'Selected' defines that it is the current selection (e.g currentAuthorizationMethodSelected)
			authorizationMethod: {
				// default authorization method is set to 'oauth2'
				authorizationMethodSet: AUTH_METHOD.OAUTH2,
				currentAuthorizationMethodSelected: null,
			},
			authorizationSetting: {
				oidcProviderSet: null,
				targetedAudienceClientIdSet: null,
				currentOIDCProviderSelected: null,
				currentTargetedAudienceClientIdSelected: null,
			},
			registeredOidcProviders: [],
			errorMessages,
		}
	},
	computed: {
		ncClientId() {
			return this.state.nc_oauth_client?.nextcloud_client_id
		},
		ncClientSecret() {
			return '*******'

		},
		opUserAppPassword() {
			return this.state.app_password_set
		},
		isAdminAuditConfigurationSetUpCorrectly() {
			return this.state.admin_audit_configuration_correct
		},
		serverHostErrorMessage() {
			if (
				this.serverHostUrlForEdit === ''
				|| this.isOpenProjectInstanceValid === null
				|| this.isOpenProjectInstanceValid
			) return null
			return this.openProjectNotReachableErrorMessage
		},
		isServerHostFormComplete() {
			return this.isFormCompleted.server
		},
		isAuthorizationMethodFormComplete() {
			return this.isFormCompleted.authorizationMethod
		},
		isAuthorizationSettingFormComplete() {
			return this.isFormCompleted.authorizationSetting
		},
		isOPOAuthFormComplete() {
			return this.isFormCompleted.opOauth
		},
		isManagedGroupFolderSetUpComplete() {
			return this.isFormCompleted.projectFolderSetUp
		},
		isOPUserAppPasswordFormComplete() {
			return this.isFormCompleted.opUserAppPassword
		},
		isNcOAuthFormComplete() {
			return this.isFormCompleted.ncOauth
		},
		isServerHostFormInView() {
			return this.formMode.server === F_MODES.VIEW
		},
		isAuthorizationMethodFormInViewMode() {
			return this.formMode.authorizationMethod === F_MODES.VIEW
		},
		isAuthorizationSettingsInViewMode() {
			return this.formMode.authorizationSetting === F_MODES.VIEW
		},
		isOPOAuthFormInView() {
			return this.formMode.opOauth === F_MODES.VIEW
		},
		isServerHostFormInEdit() {
			return this.formMode.server === F_MODES.EDIT
		},
		isNcOAuthFormInEdit() {
			return this.formMode.ncOauth === F_MODES.EDIT
		},
		isOPOAuthFormInDisableMode() {
			return this.formMode.opOauth === F_MODES.DISABLE
		},
		isAuthorizationFormInDisabledMode() {
			return this.formMode.authorizationMethod === F_MODES.DISABLE
		},
		isAuthorizationSettingFormInDisabledMode() {
			return this.formMode.authorizationSetting === F_MODES.DISABLE
		},
		isOPUserAppPasswordFormInEdit() {
			return this.formMode.opUserAppPassword === F_MODES.EDIT
		},
		isProjectFolderSetupFormInEdit() {
			return this.formMode.projectFolderSetUp === F_MODES.EDIT
		},
		isAuthorizationFormInEditMode() {
			return this.formMode.authorizationMethod === F_MODES.EDIT
		},
		isAuthorizationSettingInEditMode() {
			return this.formMode.authorizationSetting === F_MODES.EDIT
		},
		isNcOAuthFormInDisableMode() {
			return this.formMode.ncOauth === F_MODES.DISABLE
		},
		isProjectFolderSetUpInDisableMode() {
			return this.formMode.projectFolderSetUp === F_MODES.DISABLE
		},
		isOPUserAppPasswordInDisableMode() {
			return this.formMode.opUserAppPassword === F_MODES.DISABLE
		},
		isThereErrorAfterProjectFolderAndAppPasswordSetup() {
			return (this.opUserAppPassword && this.formMode.projectFolderSetUp !== F_MODES.EDIT && this.isProjectFolderSetupCorrect === false)
		},
		isProjectFolderSetupCompleted() {
			return this.isProjectFolderSetupFormInEdit ? false : this.opUserAppPassword
		},
		adminFileStorageHref() {
			let hostPart = ''
			const urlPart = '%sadmin/settings/storages'
			if (this.state?.openproject_instance_url.endsWith('/')) {
				hostPart = this.state.openproject_instance_url
			} else hostPart = this.state.openproject_instance_url + '/'
			return util.format(urlPart, hostPart)
		},
		openProjectClientHint() {
			const linkText = t('integration_openproject', 'Administration > File storages')
			const htmlLink = `<a class="link" href="${this.adminFileStorageHref}" target="_blank" title="${linkText}">${linkText}</a>`
			return t('integration_openproject', 'Go to your OpenProject {htmlLink} as an Administrator and start the setup and copy the values here.', { htmlLink }, null, { escape: false, sanitize: false })
		},
		nextcloudClientHint() {
			const linkText = t('integration_openproject', 'Administration > File storages')
			const htmlLink = `<a class="link" href="${this.adminFileStorageHref}" target="_blank" title="${linkText}">${linkText}</a>`
			return t('integration_openproject', 'Copy the following values back into the OpenProject {htmlLink} as an Administrator.', { htmlLink }, null, { escape: false, sanitize: false })
		},
		userAppPasswordHint() {
			const linkText = t('integration_openproject', 'Administration > File storages')
			const htmlLink = `<a class="link" href="${this.adminFileStorageHref}" target="_blank" title="${linkText}">${linkText}</a>`
			return t('integration_openproject', 'This value will only be accessible once. Now, as an administrator copy this password to OpenProject {htmlLink}.', { htmlLink }, null, { escape: false, sanitize: false })
		},
		errorHintForProjectFolderConfigAlreadyExists() {
			const linkText = t('integration_openproject', 'troubleshooting guide')
			const htmlLink = `<a class="link" href="https://www.openproject.org/docs/system-admin-guide/integrations/nextcloud/#troubleshooting" target="_blank" title="${linkText}">${linkText}</a>`
			return t('integration_openproject', 'Setting up the OpenProject user, group and group folder was not possible. Please check this {htmlLink} on how to resolve this situation.', { htmlLink }, null, { escape: false, sanitize: false })
		},
		getAdminAuditConfigurationHint() {
			const linkTextForAdminAudit = t('integration_openproject', 'Admin Audit')
			const adminAuditAppUrlForDownload = generateUrl('settings/apps/featured/admin_audit')
			const linkTextForDocumentation = t('integration_openproject', 'documentation')
			const htmlLinkForAdminAudit = `<a class="link" href="${adminAuditAppUrlForDownload}" target="_blank" title="${linkTextForAdminAudit}">${linkTextForAdminAudit}</a>`
			const htmlLinkForDocumentaion = `<a class="link" href="https://docs.nextcloud.com/server/latest/admin_manual/configuration_server/logging_configuration.html#admin-audit-log-optional" target="_blank" title="${linkTextForDocumentation}">${linkTextForDocumentation}</a>`
			const hintTextForAdminAudit = t('integration_openproject', 'To activate audit logs for the OpenProject integration, please enable the {htmlLinkForAdminAudit} app and follow the configuration steps outlined in the {htmlLinkForDocumentaion}.', { htmlLinkForAdminAudit, htmlLinkForDocumentaion }, null, { escape: false, sanitize: false })
			return dompurify.sanitize(hintTextForAdminAudit, { ADD_ATTR: ['target'] })
		},
		getGroupFoldersEncryptionWarningHint() {
			const linkText = t('integration_openproject', 'documentation')
			const htmlLink = `<a class="link" href="https://www.openproject.org/docs/system-admin-guide/integrations/nextcloud/#files-are-not-encrypted-when-using-nextcloud-server-side-encryption" target="_blank" title="${linkText}">${linkText}</a>`
			return t('integration_openproject', 'Server-side encryption is active, but encryption for Group Folders is not yet enabled. To ensure secure storage of files in project folders, please follow the configuration steps in the {htmlLink}.', { htmlLink }, null, { escape: false, sanitize: false })
		},
		getAuthorizationMethodHintText() {
			const linkText = t('integration_openproject', 'authorization methods you can use with OpenProject')
			const htmlLink = `<a class="link" href="https://www.openproject.org/docs/system-admin-guide/integrations/nextcloud/#files-are-not-encrypted-when-using-nextcloud-server-side-encryption" target="_blank" title="${linkText}">${linkText}</a>`
			return t('integration_openproject', 'Please read our guide on {htmlLink}.', { htmlLink }, null, { escape: false, sanitize: false })
		},
		getOIDCAppNotInstalledHintText() {
			const linkText = t('integration_openproject', 'User OIDC')
			const url = generateUrl('settings/apps/files/user_oidc')
			const htmlLink = `<a class="link" href="${url}" target="_blank" title="${linkText}">${linkText}</a>`
			return t('integration_openproject', 'Please install the {htmlLink} app to be able to use Keycloak for authorization with OpenProject.', { htmlLink }, null, { escape: false, sanitize: false })
		},
		getConfigureOIDCHintText() {
			const linkText = t('integration_openproject', 'User OIDC app')
			const htmlLink = `<a class="link" href="" target="_blank" title="${linkText}">${linkText}</a>`
			return t('integration_openproject', 'You can configure OIDC providers in the {htmlLink}.', { htmlLink }, null, { escape: false, sanitize: false })
		},
		isIntegrationCompleteWithOauth2() {
			return (this.isServerHostFormComplete
				&& this.isAuthorizationMethodFormComplete
				 && this.isOPOAuthFormComplete
				 && this.isNcOAuthFormComplete
				 && this.isManagedGroupFolderSetUpComplete
				 && !this.isOPUserAppPasswordFormInEdit
			)
		},
		isIntegrationCompleteWithOIDC() {
			return (this.isServerHostFormComplete
				&& this.isAuthorizationMethodFormComplete
				&& this.isAuthorizationSettingFormComplete
				&& this.isManagedGroupFolderSetUpComplete
				&& !this.isOPUserAppPasswordFormInEdit
			)
		},
		isSetupCompleteWithoutProjectFolders() {
			if (this.isProjectFolderSetupFormInEdit) {
				return false
			}
			if (this.isFormCompleted.projectFolderSetUp === false && !this.opUserAppPassword) {
				return false
			}
			return !this.opUserAppPassword
		},
		isResetButtonDisabled() {
			return !(this.state.openproject_client_id || this.state.openproject_client_secret || this.state.openproject_instance_url)
		},
		showEncryptionWarningForGroupFolders() {
			if (!this.isProjectFolderAlreadySetup || !this.state.app_password_set || this.isProjectFolderSetupFormInEdit) {
				return false
			}
			return this.state.encryption_info.server_side_encryption_enabled
				&& !this.state.encryption_info.encryption_enabled_for_groupfolders
		},
		getSelectedAuthenticatedMethod() {
			return this.authorizationMethod.authorizationMethodSet === this.authMethods.OIDC
				? this.authMethodsLabel.OIDC
				: this.authMethodsLabel.OAUTH2
		},
		isAuthorizationMethodSelected() {
			return this.authorizationMethod.currentAuthorizationMethodSelected === this.authorizationMethod.authorizationMethodSet
		},
		isAuthorizationSettingsSelected() {
			const { oidcProviderSet, currentOIDCProviderSelected } = this.authorizationSetting
			return currentOIDCProviderSelected === null
				|| !this.getCurrentSelectedTargetedClientId
				|| (oidcProviderSet === currentOIDCProviderSelected && this.authorizationSetting.targetedAudienceClientIdSet === this.getCurrentSelectedTargetedClientId)
				|| (this.authorizationSetting.targetedAudienceClientIdSet === this.getCurrentSelectedTargetedClientId && oidcProviderSet === currentOIDCProviderSelected)
		},
		getCurrentSelectedOIDCProvider() {
			return this.authorizationSetting.currentOIDCProviderSelected
		},
		getCurrentSelectedTargetedClientId() {
			return this.state.authorization_settings.targeted_audience_client_id
		},
		isOIDCAppInstalledAndEnabled() {
			return this.state.user_oidc_enabled
		},
	},
	created() {
		this.init()
	},
	mounted() {
		this.isDarkTheme = window.getComputedStyle(this.$el).getPropertyValue('--background-invert-if-dark') === 'invert(100%)'
	},
	methods: {
		init() {
			if (this.state) {
				if (this.state.all_terms_of_services_signed === false) {
					this.isAllTermsOfServiceSignedForUserOpenProject = false
				}
				if (this.state.project_folder_info) {
					this.isProjectFolderSetupCorrect = this.state.project_folder_info.status
					if (this.state.project_folder_info.status === true) {
						this.isProjectFolderAlreadySetup = true
					}
				}
				if (this.state.fresh_project_folder_setup === true) {
					this.currentProjectFolderState = true
					this.textLabelProjectFolderSetupButton = this.buttonTextLabel.completeWithProjectFolderSetup
				} else {
					this.textLabelProjectFolderSetupButton = this.buttonTextLabel.keepCurrentChange
				}
				// for oauth2 authorization
				if (this.state.openproject_instance_url
					&& this.state.openproject_client_id
					&& this.state.openproject_client_secret
					&& this.state.nc_oauth_client
				) {
					this.showDefaultManagedProjectFolders = true
				}
				// for oidc authorization
				if (this.state.authorization_method === AUTH_METHOD.OIDC
					&& this.state.openproject_instance_url
					&& this.state.authorization_settings.oidc_provider
					&& this.state.authorization_settings.targeted_audience_client_id
				) {
					this.showDefaultManagedProjectFolders = true
				}
				if (this.state.fresh_project_folder_setup === false) {
					this.showDefaultManagedProjectFolders = true
				}
				if (this.state.openproject_instance_url) {
					this.formMode.server = F_MODES.VIEW
					this.isFormCompleted.server = true
				}
				if (this.state.authorization_method) {
					this.formMode.authorizationMethod = F_MODES.VIEW
					this.isFormCompleted.authorizationMethod = true
					this.authorizationMethod.authorizationMethodSet = this.authorizationMethod.currentAuthorizationMethodSelected = this.state.authorization_method
				}
				if (this.state.openproject_instance_url && this.state.authorization_method) {
					if (this.state.authorization_method === AUTH_METHOD.OAUTH2) {
						if (!this.state.openproject_client_id || !this.state.openproject_client_secret) {
							this.formMode.authorizationSetting = F_MODES.EDIT
						}
					}
					if (this.state.authorization_method === AUTH_METHOD.OIDC) {
						if (!this.state.authorization_settings.oidc_provider || !this.state.authorization_settings.targeted_audience_client_id) {
							this.formMode.authorizationSetting = F_MODES.EDIT
						}
					}
				}
				if (this.state.authorization_method === AUTH_METHOD.OIDC
					&& this.state.authorization_settings.oidc_provider
					&& this.state.authorization_settings.targeted_audience_client_id
				) {
					this.formMode.authorizationSetting = F_MODES.VIEW
					this.isFormCompleted.authorizationSetting = true
					this.authorizationSetting.oidcProviderSet = this.authorizationSetting.currentOIDCProviderSelected = this.state.authorization_settings.oidc_provider
					this.authorizationSetting.targetedAudienceClientIdSet = this.authorizationSetting.currentTargetedAudienceClientIdSelected = this.state.authorization_settings.targeted_audience_client_id
				}
				if (!!this.state.openproject_client_id && !!this.state.openproject_client_secret) {
					this.formMode.opOauth = F_MODES.VIEW
					this.isFormCompleted.opOauth = true
				}
				if (this.state.openproject_instance_url) {
					if (!this.state.authorization_method) {
						this.formMode.authorizationMethod = F_MODES.EDIT
					}
				}
				if (this.state.openproject_instance_url && this.state.authorization_method) {
					if (!this.state.openproject_client_id && !this.state.openproject_client_secret) {
						this.formMode.opOauth = F_MODES.EDIT
					}
				}

				if (this.state.nc_oauth_client) {
					this.formMode.ncOauth = F_MODES.VIEW
					this.isFormCompleted.ncOauth = true
				}
				if (!this.state.nc_oauth_client
					&& this.state.openproject_instance_url
					&& this.state.openproject_client_id
					&& this.state.openproject_client_secret
				    && this.textLabelProjectFolderSetupButton === 'Keep current setup') {
					this.showDefaultManagedProjectFolders = true
					this.formMode.projectFolderSetUp = F_MODES.VIEW
					this.isFormCompleted.projectFolderSetUp = true
				}
				if (this.formMode.ncOauth === F_MODES.VIEW || this.formMode.authorizationSetting === F_MODES.VIEW) {
					this.showDefaultManagedProjectFolders = true
				}
				if (this.showDefaultManagedProjectFolders) {
					this.formMode.projectFolderSetUp = F_MODES.VIEW
					this.isFormCompleted.projectFolderSetUp = true
				}
				if (this.state.app_password_set) {
					this.formMode.opUserAppPassword = F_MODES.VIEW
					this.isFormCompleted.opUserAppPassword = true
					this.currentProjectFolderState = true
					this.isProjectFolderSwitchEnabled = true
					this.textLabelProjectFolderSetupButton = this.buttonTextLabel.keepCurrentChange
				}
				this.isProjectFolderSwitchEnabled = this.currentProjectFolderState === true

				if (this.state.oidc_provider) {
					this.registeredOidcProviders = this.state.oidc_provider
				}
			}
		},
		projectFolderSetUpErrorMessageDescription(errorKey) {
			const linkText = t('integration_openproject', 'Download and enable it here')
			const url = generateUrl('settings/apps/files/groupfolders')
			const htmlLink = `<a class="link" href="${url}" target="_blank" title="${linkText}">${linkText}</a>`
			switch (errorKey) {
			case 'The "Group folders" app is not installed' :
				return t('integration_openproject', 'Please install the "Group folders" app to be able to use automatically managed folders. {htmlLink}', { htmlLink }, null, { escape: false, sanitize: false })
			default:
				return this.errorHintForProjectFolderConfigAlreadyExists
			}
		},
		closeRequestModal() {
			this.show = false
		},
		setServerHostFormToViewMode() {
			this.formMode.server = F_MODES.VIEW
		},
		setAuthorizationMethodToViewMode() {
			this.formMode.authorizationMethod = F_MODES.VIEW
			this.isFormCompleted.authorizationMethod = true
			this.authorizationMethod.authorizationMethodSet = this.authorizationMethod.currentAuthorizationMethodSelected
		},
		setAuthorizationSettingToViewMode() {
			this.formMode.authorizationSetting = F_MODES.VIEW
			this.isFormCompleted.authorizationSetting = true
			this.state.authorization_settings.targeted_audience_client_id = this.authorizationSetting.currentTargetedAudienceClientIdSelected
		},
		setServerHostFormToEditMode() {
			this.formMode.server = F_MODES.EDIT
			// set the edit variable to the current saved value
			this.serverHostUrlForEdit = this.state.openproject_instance_url
			this.isOpenProjectInstanceValid = null
		},
		setAuthorizationMethodInEditMode() {
			this.formMode.authorizationMethod = F_MODES.EDIT
			this.isFormCompleted.authorizationMethod = false
		},
		setAuthorizationSettingInEditMode() {
			this.formMode.authorizationSetting = F_MODES.EDIT
			this.isFormCompleted.authorizationSetting = false
		},
		setProjectFolderSetUpToEditMode() {
			this.formMode.projectFolderSetUp = F_MODES.EDIT
			this.isFormCompleted.projectFolderSetUp = false
			this.isProjectFolderSwitchEnabled = this.currentProjectFolderState
		},
		setProjectFolderSetupToViewMode() {
			this.currentProjectFolderState = true
			this.textLabelProjectFolderSetupButton = this.buttonTextLabel.keepCurrentChange
			this.isFormCompleted.projectFolderSetUp = true
			this.formMode.projectFolderSetUp = F_MODES.VIEW
			this.isProjectFolderSetupCorrect = true
		},
		async setNCOAuthFormToViewMode() {
			this.formMode.ncOauth = F_MODES.VIEW
			this.isFormCompleted.ncOauth = true
			if (!this.isIntegrationCompleteWithOauth2 && this.formMode.projectFolderSetUp !== F_MODES.EDIT && this.formMode.opUserAppPassword !== F_MODES.EDIT) {
				this.formMode.projectFolderSetUp = F_MODES.EDIT
				this.showDefaultManagedProjectFolders = true
				this.isProjectFolderSwitchEnabled = true
				this.textLabelProjectFolderSetupButton = this.buttonTextLabel.completeWithProjectFolderSetup
			}
		},
		setOPUserAppPasswordToViewMode() {
			this.formMode.opUserAppPassword = F_MODES.VIEW
			this.isFormCompleted.opUserAppPassword = true
		},
		changeProjectFolderSetUpState() {
			if (this.opUserAppPassword === false) {
				if (this.currentProjectFolderState === true && this.isProjectFolderSwitchEnabled === true) {
					this.textLabelProjectFolderSetupButton = this.buttonTextLabel.completeWithProjectFolderSetup
				} else if (this.currentProjectFolderState === true && this.isProjectFolderSwitchEnabled === false) {
					this.textLabelProjectFolderSetupButton = this.buttonTextLabel.completeWithoutProjectFolderSetup
				} else if (this.currentProjectFolderState === false && this.isProjectFolderSwitchEnabled === false) {
					this.textLabelProjectFolderSetupButton = this.buttonTextLabel.keepCurrentChange
				} else if (this.currentProjectFolderState === false && this.isProjectFolderSwitchEnabled === true) {
					this.textLabelProjectFolderSetupButton = this.buttonTextLabel.completeWithProjectFolderSetup
				}
			} else if (this.currentProjectFolderState === true && this.isProjectFolderSwitchEnabled === true) {
				this.textLabelProjectFolderSetupButton = this.buttonTextLabel.keepCurrentChange
			} else if (this.currentProjectFolderState === true && this.isProjectFolderSwitchEnabled === false) {
				this.textLabelProjectFolderSetupButton = this.buttonTextLabel.completeWithoutProjectFolderSetup
			}
		},
		async setUpProjectGroupFolders() {
			this.isFormStep = FORM.GROUP_FOLDER
			this.loadingProjectFolderSetup = true
			this.isProjectFolderAlreadySetup = await this.checkIfProjectFolderIsAlreadyReadyForSetup()
			if (this.isProjectFolderAlreadySetup) {
				if (!this.opUserAppPassword) {
					const success = await this.saveOPOptions()
					if (success) {
						this.formMode.opUserAppPassword = F_MODES.EDIT
						this.setProjectFolderSetupToViewMode()
					}
				} else {
					this.setProjectFolderSetupToViewMode()
				}
			} else {
				// we will check for the error making the setup_project_folder === true
				const success = await this.saveOPOptions()
				if (success) {
					this.setProjectFolderSetupToViewMode()
					this.isProjectFolderAlreadySetup = true
					if ((this.formMode.opUserAppPassword === F_MODES.DISABLE && !this.opUserAppPassword) || this.formMode.opUserAppPassword === F_MODES.DISABLE) {
						this.formMode.opUserAppPassword = F_MODES.EDIT
					}
				}
			}
			this.loadingProjectFolderSetup = false
			if (this.formMode.projectFolderSetUp === F_MODES.VIEW) {
				this.projectFolderSetupError = null
			}
		},
		async saveOpenProjectHostUrl() {
			this.isFormStep = FORM.SERVER
			this.loadingServerHostForm = true
			await this.validateOpenProjectInstance()
			if (this.isOpenProjectInstanceValid) {
				const saved = await this.saveOPOptions()
				if (saved) {
					this.state.openproject_instance_url = this.serverHostUrlForEdit
					this.formMode.server = F_MODES.VIEW
					this.isFormCompleted.server = true
					if (!this.isFormCompleted.authorizationMethod) {
						this.formMode.authorizationMethod = F_MODES.EDIT
					}
				}
			}
			this.loadingServerHostForm = false
		},
		async saveOPOAuthClientValues() {
			this.isFormStep = FORM.OP_OAUTH
			await this.saveOPOptions()
			if (this.isAdminConfigOk) {
				this.formMode.opOauth = F_MODES.VIEW
				this.isFormCompleted.opOauth = true

				// if we do not have Nextcloud OAuth client yet, a new client is created
				if (!this.state.nc_oauth_client) {
					this.createNCOAuthClient()
				}
			}
		},
		async saveAuthorizationMethodValue() {
			this.isFormStep = FORM.AUTHORIZATION_METHOD
			this.loadingAuthorizationMethodForm = true
			const success = await this.saveOPOptions()
			if (success) {
				this.authorizationMethod.currentAuthorizationMethodSelected = this.authorizationMethod.authorizationMethodSet
				this.formMode.authorizationMethod = F_MODES.VIEW
				this.isFormCompleted.authorizationMethod = true
				if (this.authorizationMethod.authorizationMethodSet === this.authMethods.OIDC && !this.isFormCompleted.authorizationSetting) {
					this.formMode.authorizationSetting = F_MODES.EDIT
				} else {
					if (!this.isFormCompleted.opOauth) {
						this.formMode.opOauth = F_MODES.EDIT
					}
				}
			}
			this.loadingAuthorizationMethodForm = false
		},
		async saveOIDCAuthSetting() {
			this.isFormStep = FORM.AUTHORIZATION_SETTING
			this.loadingAuthorizationMethodForm = true
			this.authorizationSetting.oidcProviderSet = this.getCurrentSelectedOIDCProvider
			this.authorizationSetting.targetedAudienceClientIdSet = this.state.authorization_settings.targeted_audience_client_id
			const success = await this.saveOPOptions()
			if (success) {
				this.formMode.authorizationSetting = F_MODES.VIEW
				this.isFormCompleted.authorizationSetting = true
				if (!this.isIntegrationCompleteWithOIDC && this.formMode.projectFolderSetUp !== F_MODES.EDIT && this.formMode.opUserAppPassword !== F_MODES.EDIT) {
					this.formMode.projectFolderSetUp = F_MODES.EDIT
					this.showDefaultManagedProjectFolders = true
					this.isProjectFolderSwitchEnabled = true
					this.textLabelProjectFolderSetupButton = this.buttonTextLabel.completeWithProjectFolderSetup
				}
			}
			this.loadingAuthorizationMethodForm = false
		},
		resetOPOAuthClientValues() {
			OC.dialogs.confirmDestructive(
				t('integration_openproject', 'If you proceed you will need to update these settings with the new OpenProject OAuth credentials. Also, all users will need to reauthorize access to their OpenProject account.'),
				t('integration_openproject', 'Replace OpenProject OAuth values'),
				{
					type: OC.dialogs.YES_NO_BUTTONS,
					confirm: t('integration_openproject', 'Yes, replace'),
					confirmClasses: 'error',
					cancel: t('integration_openproject', 'Cancel'),
				},
				async (result) => {
					if (result) {
						await this.clearOPOAuthClientValues()
					}
				},
				true,
			)
		},
		async selectAuthorizationMethod() {
			// open the confirmation dialog when only swithing back and forth between two authorization method
			if (this.isAuthorizationFormInEditMode && this.authorizationMethod.currentAuthorizationMethodSelected !== null) {
				await OC.dialogs.confirmDestructive(
					t('integration_openproject', `If you proceed this method, you will have an ${this.authorizationMethod.authorizationMethodSet.toUpperCase()} based authorization configuration which will delete all the configuration setting for current ${this.authorizationMethod.currentAuthorizationMethodSelected.toUpperCase()} based authorization. You can switch back to it anytime.`),
					t('integration_openproject', 'Switch Authorization Method'),
					{
						type: OC.dialogs.YES_NO_BUTTONS,
						confirm: t('integration_openproject', 'Yes, switch'),
						confirmClasses: 'error',
						cancel: t('integration_openproject', 'Cancel'),
					},
					async (result) => {
						if (result) {
							// here we switch either to oidc or oauth2 configuration
							const authMethod = this.authorizationMethod.authorizationMethodSet
							if (authMethod === AUTH_METHOD.OAUTH2) {
								this.state.authorization_settings.targeted_audience_client_id = null
								this.authorizationSetting.currentOIDCProviderSelected = null
							} else {
								this.state.openproject_client_id = ''
								this.state.openproject_client_secret = ''
							}
							await this.saveAuthorizationMethodValue()
						}
						window.location.reload()
					},
					true,
				)
				return ''
			}
			await this.saveAuthorizationMethodValue()
		},
		async clearOPOAuthClientValues() {
			this.isFormStep = FORM.OP_OAUTH
			this.formMode.opOauth = F_MODES.EDIT
			this.isFormCompleted.opOauth = false
			this.state.openproject_client_id = null
			this.state.openproject_client_secret = null
			const saved = await this.saveOPOptions()
			if (!saved) {
				this.formMode.opOauth = F_MODES.VIEW
				this.isFormCompleted.opOauth = true
			}
		},
		resetAllAppValuesConfirmation() {
			OC.dialogs.confirmDestructive(
				t('integration_openproject', 'Are you sure that you want to reset this app and delete all settings and all connections of all Nextcloud users to OpenProject?'),
				t('integration_openproject', 'Reset OpenProject Integration'),
				{
					type: OC.dialogs.YES_NO_BUTTONS,
					confirm: t('integration_openproject', 'Yes, reset'),
					confirmClasses: 'error',
					cancel: t('integration_openproject', 'Cancel'),
				},
				async (result) => {
					if (result) {
						const authMethod = this.authorizationMethod.authorizationMethodSet
						await this.resetAllAppValues(authMethod)
					}
				},
				true,
			)
		},
		async resetAllAppValues(authMethod) {
			// to avoid general console errors, we need to set the form to
			// editor mode so that we can update the form fields with null values
			// also, form completeness should be set to false
			this.formMode.opOauth = F_MODES.EDIT
			this.isFormCompleted.opOauth = false
			this.formMode.server = F_MODES.EDIT
			this.isFormCompleted.server = false
			this.state.default_enable_navigation = false
			this.state.default_enable_unified_search = false
			this.oPUserAppPassword = null
			this.authorizationMethod.authorizationMethodSet = null
			this.state.openproject_client_id = null
			this.state.openproject_client_secret = null
			this.state.openproject_instance_url = null
			// if the authorization method is "oidc"
			if (authMethod === AUTH_METHOD.OIDC) {
				this.state.authorization_settings.targeted_audience_client_id = null
				this.authorizationSetting.currentOIDCProviderSelected = null
			}
			await this.saveOPOptions()
			window.location.reload()
		},
		async validateOpenProjectInstance() {
			const url = generateUrl('/apps/integration_openproject/is-valid-op-instance')
			const response = await axios.post(url, { url: this.serverHostUrlForEdit })
			this.openProjectNotReachableErrorMessageDetails = null
			this.openProjectNotReachableErrorMessage = t(
				'integration_openproject',
				'Please introduce a valid OpenProject hostname',
			)
			if (response.data.result === true) {
				this.isOpenProjectInstanceValid = true
				this.state.openproject_instance_url = this.serverHostUrlForEdit
			} else {
				switch (response.data.result) {
				case 'invalid':
					this.openProjectNotReachableErrorMessage = t(
						'integration_openproject',
						'URL is invalid',
					)
					this.openProjectNotReachableErrorMessageDetails = t(
						'integration_openproject',
						'The URL should have the form "https://openproject.org"',
					)
					break
				case 'not_valid_body':
					this.openProjectNotReachableErrorMessage = t(
						'integration_openproject',
						'There is no valid OpenProject instance listening at that URL, please check the Nextcloud logs',
					)
					break
				case 'client_exception': {
					this.openProjectNotReachableErrorMessage = t(
						'integration_openproject',
						'There is no valid OpenProject instance listening at that URL, please check the Nextcloud logs',
					)
					this.openProjectNotReachableErrorMessageDetails = t(
						'integration_openproject',
						'Response:',
					) + ' "' + response.data.details + '"'
					break
				}
				case 'server_exception': {
					this.openProjectNotReachableErrorMessage = t(
						'integration_openproject',
						'Server replied with an error message, please check the Nextcloud logs',
					)
					this.openProjectNotReachableErrorMessageDetails = response.data.details
					break
				}
				case 'local_remote_servers_not_allowed': {
					const linkText = t('integration_openproject', 'Documentation')
					const htmlLink = `<a class="link" href="https://www.openproject.org/docs/system-admin-guide/integrations/nextcloud/" target="_blank" title="${linkText}">${linkText}</a>`

					this.openProjectNotReachableErrorMessage = t(
						'integration_openproject',
						'Accessing OpenProject servers with local addresses is not allowed.',
					)
					this.openProjectNotReachableErrorMessageDetails = t(
						'integration_openproject',
						'To be able to use an OpenProject server with a local address, enable the `allow_local_remote_servers` setting. {htmlLink}.',
						{ htmlLink },
						null,
						{ escape: false, sanitize: false },
					)
					break
				}
				case 'redirected':
				{
					const location = response.data.details
					this.openProjectNotReachableErrorMessage = t(
						'integration_openproject',
						'The given URL redirects to \'{location}\'. Please do not use a URL that leads to a redirect.',
						{ location },
					)
					break
				}
				case 'unexpected_error':
				case 'network_error':
				case 'request_exception':
				default: {
					this.openProjectNotReachableErrorMessage = t(
						'integration_openproject',
						'Could not connect to the given URL, please check the Nextcloud logs',
					)
					this.openProjectNotReachableErrorMessageDetails = response.data.details
					break
				}
				}
				this.isOpenProjectInstanceValid = false
				await this.$nextTick()
				await this.$refs['openproject-oauth-instance-input']?.$refs?.textInput?.focus()
			}
		},
		getPayloadForSavingOPOptions() {
			let values = {
				openproject_client_id: this.state.openproject_client_id,
				openproject_client_secret: this.state.openproject_client_secret,
				openproject_instance_url: this.state.openproject_instance_url,
				default_enable_navigation: this.state.default_enable_navigation,
				default_enable_unified_search: this.state.default_enable_unified_search,
			}
			if (this.state.openproject_instance_url === null && this.authorizationMethod.authorizationMethodSet === null) {
				// by default, it will be an oauth2 reset
				values = {
					...values,
					authorization_method: this.authorizationMethod.authorizationMethodSet,
					setup_project_folder: false,
					setup_app_password: false,
				}
				if (this.authorizationMethod.currentAuthorizationMethodSelected === AUTH_METHOD.OIDC
					&& this.authorizationSetting.currentOIDCProviderSelected === null
					&& this.state.authorization_settings.targeted_audience_client_id === null) {
					// when reset is oidc
					values = {
						...values,
						oidc_provider: this.getCurrentSelectedOIDCProvider,
						targeted_audience_client_id: this.getCurrentSelectedTargetedClientId,
					}
				}
			} else if (this.isFormStep === FORM.AUTHORIZATION_SETTING) {
				values = {
					oidc_provider: this.getCurrentSelectedOIDCProvider,
					targeted_audience_client_id: this.getCurrentSelectedTargetedClientId,
				}
			} else if (this.isFormStep === FORM.AUTHORIZATION_METHOD) {
				values = {
					...values,
					authorization_method: this.authorizationMethod.authorizationMethodSet,
					oidc_provider: this.isIntegrationCompleteWithOIDC ? this.getCurrentSelectedOIDCProvider : null,
					targeted_audience_client_id: this.isIntegrationCompleteWithOIDC ? this.getCurrentSelectedTargetedClientId : null,
				}
			} else if (this.isFormStep === FORM.GROUP_FOLDER) {
				if (!this.isProjectFolderSwitchEnabled) {
					values = {
						authorization_method: this.authorizationMethod.authorizationMethodSet,
						setup_project_folder: false,
						setup_app_password: false,
					}
				} else if (this.isProjectFolderSwitchEnabled === true) {
					values = {
						authorization_method: this.authorizationMethod.authorizationMethodSet,
						setup_project_folder: !this.isProjectFolderAlreadySetup,
						setup_app_password: this.opUserAppPassword !== true,
					}
				}
			} else if (this.isFormStep === FORM.APP_PASSWORD) {
				values = {
					setup_app_password: true,
				}
			}
			return values
		},
		async saveOPOptions() {
			let success = false
			const url = generateUrl('/apps/integration_openproject/admin-config')
			const req = {
				values: this.getPayloadForSavingOPOptions(),
			}
			try {
				const response = await axios.put(url, req)
				// after successfully saving the admin credentials, the admin config status needs to be updated
				this.isAdminConfigOk = response?.data?.status === true
				if (response?.data?.oPUserAppPassword) {
					this.state.app_password_set = true
					this.oPUserAppPassword = response?.data?.oPUserAppPassword
				}
				this.oPOAuthTokenRevokeStatus = response?.data?.oPOAuthTokenRevokeStatus
				showSuccess(t('integration_openproject', 'OpenProject admin options saved'))
				success = true
			} catch (error) {
				console.error()
				this.isAdminConfigOk = null
				this.oPOAuthTokenRevokeStatus = null
				if (error.response.data.error) {
					this.projectFolderSetupError = error.response.data.error
				}
				showError(
					t('integration_openproject', 'Failed to save OpenProject admin options'),
				)
			}
			this.notifyAboutOPOAuthTokenRevoke()
			return success
		},
		async checkIfProjectFolderIsAlreadyReadyForSetup() {
			let success = false
			try {
				const url = generateUrl('/apps/integration_openproject/project-folder-status')
				const response = await axios.get(url)
				success = response?.data?.result
			} catch (error) {
				console.error(error)
			}
			return success
		},
		notifyAboutOPOAuthTokenRevoke() {
			switch (this.oPOAuthTokenRevokeStatus) {
			case 'connection_error':
				showError(
					t('integration_openproject', 'Failed to perform revoke request due to connection error with the OpenProject server'),
				)
				break
			case 'other_error':
				showError(
					t('integration_openproject', 'Failed to revoke some users\' OpenProject OAuth access tokens'),
				)
				break
			case 'success':
				showSuccess(
					t('integration_openproject', 'Successfully revoked users\' OpenProject OAuth access tokens'),
				)
				break
			default:
				break
			}
		},
		resetNcOauthValues() {
			OC.dialogs.confirmDestructive(
				t('integration_openproject', 'If you proceed you will need to update the settings in your OpenProject with the new Nextcloud OAuth credentials. Also, all users in OpenProject will need to reauthorize access to their Nextcloud account.'),
				t('integration_openproject', 'Replace Nextcloud OAuth values'),
				{
					type: OC.dialogs.YES_NO_BUTTONS,
					confirm: t('integration_openproject', 'Yes, replace'),
					confirmClasses: 'error',
					cancel: t('integration_openproject', 'Cancel'),
				},
				async (result) => {
					if (result) {
						this.state.nc_oauth_client = null
						this.createNCOAuthClient()
					}
				},
				true,
			)
		},
		async completeIntegrationWithoutProjectFolderSetUp() {
			this.isFormStep = FORM.GROUP_FOLDER
			this.textLabelProjectFolderSetupButton = this.buttonTextLabel.keepCurrentChange
			const success = await this.saveOPOptions()
			if (success) {
				// also make password form disable and complete as false
				if (this.opUserAppPassword) {
					this.isFormCompleted.opUserAppPassword = false
					this.formMode.opUserAppPassword = F_MODES.DISABLE
				}
				this.state.app_password_set = false
				this.currentProjectFolderState = this.isProjectFolderSwitchEnabled
				this.isFormCompleted.projectFolderSetUp = true
				this.formMode.projectFolderSetUp = F_MODES.VIEW
			}
			// we want to show the error only when project folder form is in edit mode
			if (this.formMode.projectFolderSetUp === F_MODES.VIEW) {
				this.projectFolderSetupError = null
			}
		},
		resetOPUserAppPassword() {
			OC.dialogs.confirmDestructive(
				t('integration_openproject', 'If you proceed, your old application password for the OpenProject user will be deleted and you will receive a new OpenProject user password.'),
				t('integration_openproject', 'Replace user app password'),
				{
					type: OC.dialogs.YES_NO_BUTTONS,
					confirm: t('integration_openproject', 'Yes, replace'),
					confirmClasses: 'error',
					cancel: t('integration_openproject', 'Cancel'),
				},
				async (result) => {
					if (result) {
						await this.createNewAppPassword()
					}
				},
				true,
			)
		},
		async createNewAppPassword() {
			this.isFormStep = FORM.APP_PASSWORD
			this.formMode.opUserAppPassword = F_MODES.EDIT
			this.isFormCompleted.opUserAppPassword = false
			await this.saveOPOptions()
		},
		createNCOAuthClient() {
			const url = generateUrl('/apps/integration_openproject/nc-oauth')
			axios.post(url).then((response) => {
				this.state.nc_oauth_client = response.data
				// generate part is complete but still the NC OAuth form is set to
				// edit mode and not completed state so that copy buttons will be available for the user
				this.formMode.ncOauth = F_MODES.EDIT
				this.isFormCompleted.ncOauth = false
			}).catch((error) => {
				showError(
					t('integration_openproject', 'Failed to create Nextcloud OAuth client')
					+ ': ' + error.response.request.responseText,
				)
			})
		},
		setDefaultConfig() {
			const url = generateUrl('/apps/integration_openproject/admin-config')
			const req = {
				values: {
					default_enable_navigation: !!this.state.default_enable_navigation,
					default_enable_unified_search: !!this.state.default_enable_unified_search,
				},
			}
			axios.put(url, req).then((res) => {
				showSuccess(t('integration_openproject', 'Default user configuration saved'))
			}).catch(error => {
				showError(
					t('integration_openproject', 'Failed to save default user configuration')
					+ ': ' + error.response.request.responseText,
				)
			})
		},
		onSelectOIDCProvider(selectedOption) {
			this.authorizationSetting.currentOIDCProviderSelected = selectedOption
		},
	},
}
</script>

<style scoped lang="scss">
@import '../../css/tab.css';

#reset-all-app-settings-btn {
	position: absolute;
	top: 30px;
	right: 22px;
}

.project-folder-description {
	font-weight: 400;
}

.project-folder-status-value {
	padding: 6px 0;

}

#openproject_prefs {
	div {
		width: 100%;
	}
	.d-flex {
		display: flex;
		align-items: center;
	}
	.pb-1 {
		padding-bottom: .5rem;
	}
	.py-1 {
		padding: .3rem 0;
	}
	.mr-2 {
		margin-right: .5rem;
	}
	.default-prefs {
		padding-top: 1.2rem;
	}
}
</style>
<style lang="scss">
#openproject_prefs {
	.button-vue {
		height: 32px !important;
		min-height: 32px !important;

		&--vue-primary {
			.button-vue__text {
				color: #fff !important;
			}
		}

		&--vue-error {
			.button-vue__text {
				color: #fff !important;
			}
		}

		&__text {
			font-weight: 400 !important;
			font-size: 14px !important;
			line-height: 20px !important;
		}
	}
	.form-actions {
		display: flex;
		align-items: center;
		padding: 15px 0;
	}
	.default-prefs {
		.user-setting-description {
			opacity: .7;
			margin-top: 0.2rem;
			padding-left: 5px;
		}
	}
	.note-card {
		max-width: 900px;
	}
	.link {
		color: #1a67a3 !important;
		font-style: normal;
	}
	.authorization-method {
		&--description {
			font-size: 14px;
			.title {
				font-weight: 700;
			}
			.description {
				margin-top: 0.1rem;
			}
		}
		&--options {
			margin-top: 1rem;
			.radio-check {
				font-weight: 500;
			}
			.oidc-app-check-description {
				margin-left: 2.4rem;
				font-size: 14px;
			}
		}
	}
	.authorization-settings {
		&--content {
			max-width: 550px;
			&--label {
				font-weight: 700;
				font-size: .875rem;
			}
			&--client {
				margin-top: 0.7rem;
			}
		}
		.description {
			margin-top: 0.1rem;
		}
	}
}
</style>
