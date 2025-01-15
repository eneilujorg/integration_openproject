/* jshint esversion: 6 */

/**
 * Nextcloud - openproject
 *
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Julien Veyssier <eneiluj@posteo.net>
 * @copyright Julien Veyssier 2020
 */

import Vue from 'vue'
import './bootstrap.js'
import AdminSettings from './components/AdminSettings.vue'

// eslint-disable-next-line no-unused-expressions
'use strict'

// eslint-disable-next-line no-new
new Vue({
	el: '#openproject_prefs',
	render: h => h(AdminSettings),
})
