// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

import '@mdi/font/css/materialdesignicons.css'

// ✅ Import Vuetify setup
import vuetify from './plugins/vuetify'

// ✅ Import global styles
import './styles/style.css'

// ✅ Create app instance
const app = createApp(App)

// ✅ Use plugins
app.use(createPinia())
app.use(router)
app.use(vuetify)

// ✅ Mount
app.mount('#app')
