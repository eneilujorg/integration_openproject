<template>
	<NcNoteCard class="note-card" type="error">
		<p class="note-card--title">
			<b>{{ errorTitle }}</b>
		</p>
		<p class="note-card--error-description">
			<span v-if="errorMessage">{{ errorMessage }}. </span><a v-if="errorLink"
				class="link"
				:href="errorLink"
				target="_blank"
				:title="errorLinkLabel">{{ errorLinkLabel }}</a>
		</p>
	</NcNoteCard>
</template>

<script>
import { NcNoteCard } from '@nextcloud/vue'

export default {
	name: 'ErrorNote',
	components: {
		NcNoteCard,
	},
	props: {
		errorTitle: {
			type: String,
			required: true,
		},
		errorMessage: {
			type: String,
			default: '',
		},
		errorLink: {
			type: String,
			default: '',
		},
		errorLinkLabel: {
			type: String,
			default: '',
		},
	},
}
</script>
