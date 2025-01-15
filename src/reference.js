/**
 * @copyright Copyright (c) 2023 Julien Veyssier <julien-nc@posteo.net>
 *
 * @author Julien Veyssier <julien-nc@posteo.net>
 *
 * @license AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

// this requires @nextcloud/vue >= 7.9.0
import { registerWidget, registerCustomPickerElement, NcCustomPickerRenderResult } from '@nextcloud/vue'

// this is required for lazy loading
__webpack_nonce__ = btoa(OC.requestToken) // eslint-disable-line
__webpack_public_path__ = OC.linkTo('integration_openproject', 'js/') // eslint-disable-line

// this is where we associate our widget component with the richobjects that we return in the reference provider
registerWidget('integration_openproject_work_package', async (el, { richObjectType, richObject, accessible }) => {
	// here we lazy load the components so it does not slow down the initial page load
	const { default: Vue } = await import(/* webpackChunkName: "reference-wp-lazy" */'vue')
	const { default: WorkPackageReferenceWidget } = await import(
		/* webpackChunkName: "reference-wp-lazy" */'./views/WorkPackageReferenceWidget.vue'
	)
	Vue.mixin({ methods: { t, n } })
	const Widget = Vue.extend(WorkPackageReferenceWidget)
	new Widget({
		propsData: {
			richObjectType,
			richObject,
			accessible,
		},
	}).$mount(el)
})

registerCustomPickerElement('openproject-work-package-ref', async (el, { providerId, accessible }) => {
	const { default: Vue } = await import(/* webpackChunkName: "reference-picker-lazy" */'vue')
	const { default: WorkPackagePickerElement } = await import(
		/* webpackChunkName: "reference-picker-lazy" */'./views/WorkPackagePickerElement.vue')
	Vue.mixin({ methods: { t, n } })

	const Element = Vue.extend(WorkPackagePickerElement)
	const vueElement = new Element({
		propsData: {
			providerId,
			accessible,
		},
	}).$mount(el)
	return new NcCustomPickerRenderResult(vueElement.$el, vueElement)
}, (el, renderResult) => {
	renderResult.object.$destroy()
})
