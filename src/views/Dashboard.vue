<template>
	<NcDashboardWidget :items="items"
		:item-menu="itemMenu"
		:show-more-url="showMoreUrl"
		:show-more-text="title"
		:loading="isLoading"
		@markAsRead="onMarkAsRead">
		<template #empty-content>
			<ErrorLabel v-if="OIDCMethodHasError && isOIDCMethodWithNonOIDCUser" :error="errorMessages.featureNotAvailable" />
			<ErrorLabel v-else-if="OIDCMethodHasError && isOIDCMethodWithNoToken" :error="errorMessages.opConnectionUnauthorized" />
			<EmptyContent v-if="!OIDCMethodHasError"
				id="openproject-empty-content"
				:state="state"
				:auth-method="authMethod"
				:dashboard="true"
				:is-admin-config-ok="isAdminConfigOk" />
		</template>
	</NcDashboardWidget>
</template>

<script>
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { NcDashboardWidget } from '@nextcloud/vue'
import { showError, showSuccess } from '@nextcloud/dialogs'
import { loadState } from '@nextcloud/initial-state'
import { AUTH_METHOD, checkOauthConnectionResult, STATE } from '../utils.js'
import { translate as t } from '@nextcloud/l10n'
import EmptyContent from '../components/tab/EmptyContent.vue'
import ErrorLabel from '../components/ErrorLabel.vue'
import { error as errorMessages } from '../constants/messages.js'

export default {
	name: 'Dashboard',

	components: {
		EmptyContent,
		ErrorLabel,
		NcDashboardWidget,
	},
	props: {
		title: {
			type: String,
			required: true,
		},
	},

	data() {
		return {
			openprojectUrl: null,
			notifications: {},
			loop: null,
			state: STATE.LOADING,
			oauthConnectionErrorMessage: loadState('integration_openproject', 'oauth-connection-error-message'),
			oauthConnectionResult: loadState('integration_openproject', 'oauth-connection-result'),
			isAdminConfigOk: loadState('integration_openproject', 'admin_config_ok'),
			userHasOidcToken: loadState('integration_openproject', 'user-has-oidc-token'),
			authMethod: loadState('integration_openproject', 'authorization_method'),
			oidc_user: loadState('integration_openproject', 'oidc_user'),
			settingsUrl: generateUrl('/settings/user/openproject'),
			themingColor: OCA.Theming ? OCA.Theming.color.replace('#', '') : '0082C9',
			windowVisibility: true,
			itemMenu: {
				markAsRead: {
					text: t('integration_openproject', 'Mark as read'),
					icon: 'icon-checkmark',
				},
			},
			authMethods: AUTH_METHOD,
			errorMessages,
		}
	},
	computed: {
		isStateOk() {
			return this.state === STATE.OK
		},
		isLoading() {
			return this.state === STATE.LOADING
		},
		showMoreUrl() {
			return this.openprojectUrl + '/notifications'
		},
		isOAuthAuthMethod() {
			return this.authMethod === AUTH_METHOD.OAUTH2
		},
		isOIDCAuthMethod() {
			return this.authMethod === AUTH_METHOD.OIDC
		},
		isOIDCMethodWithNoToken() {
			return this.isOIDCAuthMethod && this.oidc_user && !this.userHasOidcToken
		},
		isOIDCMethodWithNonOIDCUser() {
			return this.isOIDCAuthMethod && !this.oidc_user
		},
		OIDCMethodHasError() {
			return this.isAdminConfigOk && (this.isOIDCMethodWithNoToken || this.isOIDCMethodWithNonOIDCUser)
		},
		items() {
			const notifications = []
			for (const key in this.notifications) {
				const n = this.notifications[key]
				notifications.push({
					id: n.wpId,
					targetUrl: this.getNotificationTarget(n),
					avatarUrl: this.getAuthorAvatarUrl(n),
					avatarUsername: this.getAuthorShortName(n) + 'z',
					mainText: this.getTargetTitle(n),
					subText: this.getSubline(n),
					overlayIconUrl: '',
				})
			}
			return notifications
		},
		showOauthConnect() {
			return [STATE.NO_TOKEN, STATE.ERROR].includes(this.state)
		},
	},
	watch: {
		windowVisibility(newValue) {
			if (newValue) {
				this.launchLoop()
			} else {
				this.stopLoop()
			}
		},
	},
	mounted() {
		if (this.isOAuthAuthMethod && this.isAdminConfigOk) {
			checkOauthConnectionResult(this.oauthConnectionResult, this.oauthConnectionErrorMessage)
		}
	},

	beforeDestroy() {
		document.removeEventListener('visibilitychange', this.changeWindowVisibility)
	},

	beforeMount() {
		this.launchLoop()
		document.addEventListener('visibilitychange', this.changeWindowVisibility)
	},

	methods: {
		changeWindowVisibility() {
			this.windowVisibility = !document.hidden
		},
		stopLoop() {
			clearInterval(this.loop)
		},
		async launchLoop() {
			if (!this.isAdminConfigOk) {
				this.state = STATE.ERROR
				return
			}
			// get openproject URL first
			try {
				const response = await axios.get(generateUrl('/apps/integration_openproject/url'))
				this.openprojectUrl = response.data.replace(/\/+$/, '')
			} catch (error) {
				console.debug(error)
			}
			// then launch the loop
			this.fetchNotifications()
			this.loop = setInterval(() => this.fetchNotifications(), 60000)
		},
		fetchNotifications() {
			const notificationsUrl = generateUrl('/apps/integration_openproject/notifications')
			axios.get(notificationsUrl).then((response) => {
				const notifications = {}
				if (Array.isArray(response.data)) {
					for (let i = 0; i < response.data.length; i++) {
						const n = response.data[i]
						const wpId = n._links.resource.href.replace(/.*\//, '')
						if (notifications[wpId] === undefined) {
							notifications[wpId] = {
								wpId,
								resourceTitle: n._links.resource.title,
								projectTitle: n._links.project.title,
								count: 1,
							}
						} else {
							notifications[wpId].count++
						}
						if (!(notifications[wpId].reasons instanceof Set)) {
							notifications[wpId].reasons = new Set()
						}
						notifications[wpId].reasons.add(n.reason)

						const userId = n._links?.actor?.href
							? n._links.actor.href.replace(/.*\//, '')
							: null
						const title = n._links?.actor?.title
							? n._links.actor.title
							: null
						if (notifications[wpId].mostRecentActor === undefined && userId !== null) {
							notifications[wpId].mostRecentActor = {
								title,
								id: userId,
								createdAt: n.createdAt,
							}
						} else if (userId !== null && userId !== notifications[wpId].mostRecentActor.id) {
							if (Date.parse(n.createdAt) > Date.parse(notifications[wpId].mostRecentActor.createdAt)) {
								notifications[wpId].mostRecentActor = {
									title,
									id: userId,
									createdAt: n.createdAt,
								}
							}
						}

					}
					this.state = STATE.OK
					this.notifications = notifications
				} else {
					this.state = STATE.ERROR
					console.debug('notifications API returned invalid data')
				}
			}).catch((error) => {
				clearInterval(this.loop)
				if (error.response && (error.response.status === 404 || error.response.status === 503)) {
					this.state = STATE.CONNECTION_ERROR
				} else if (error.response && error.response.status === 401) {
					showError(t('integration_openproject', 'Failed to get OpenProject notifications'))
					this.state = STATE.NO_TOKEN
				} else {
					// there was an error in notif processing
					this.state = STATE.ERROR
					console.debug(error)
				}
			})
		},
		getNotificationTarget(n) {
			return this.openprojectUrl + '/notifications/details/' + n.wpId + '/activity/'
		},
		getAuthorShortName(n) {
			return n.mostRecentActor?.title
				? n.mostRecentActor.title
				: undefined
		},
		getAuthorAvatarUrl(n) {
			const url = generateUrl('/apps/integration_openproject/avatar?')
			return n.mostRecentActor?.id
				? url + 'userId=' + encodeURIComponent(n.mostRecentActor.id) + '&userName=' + encodeURIComponent(n.mostRecentActor.title)
				: url + 'userName='
		},
		getSubline(n) {
			let reasonsString = ''
			n.reasons.forEach((value) => {
				// rewrite the values that come from the API to be displayed
				// the same as they are in OP
				switch (value) {
				case 'dateAlert':
					value = t('integration_openproject', 'Date alert')
					break
				case 'assigned':
					value = t('integration_openproject', 'assignee')
					break
				case 'responsible':
					value = t('integration_openproject', 'accountable')
					break
				case 'watched':
					value = t('integration_openproject', 'watcher')
					break
				case 'commented':
					value = t('integration_openproject', 'commented')
					break
				case 'mentioned':
					value = t('integration_openproject', 'mentioned')
					break
				}
				reasonsString = reasonsString + ', ' + value
			})
			return n.projectTitle + ' - ' + reasonsString.replace(/^, /, '')
		},
		getTargetTitle(n) {
			return '(' + n.count + ') ' + n.resourceTitle
		},
		onMarkAsRead(item) {
			const url = generateUrl(
				'/apps/integration_openproject/work-packages/' + item.id + '/notifications',
			)
			axios.delete(url).then((response) => {
				showSuccess(
					t('integration_openproject', 'Notifications associated with Work package marked as read'),
				)
				this.fetchNotifications()
			}).catch((error) => {
				showError(
					t('integration_openproject', 'Failed to mark notifications as read'),
				)
				console.debug(error)
			})
		},
	},
}
</script>

<style scoped lang="scss">
:deep(.connect-button) {
	margin-top: 10px;
}
</style>
