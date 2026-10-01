import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import 'vuetify/styles';
import App from './App.vue';
const vuetify = createVuetify({
  components, directives,
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
  theme: { defaultTheme: 'studio', themes: { studio: { dark: false, colors: {
    primary: '#245e47', secondary: '#a77344', background: '#f7f8f3', surface: '#ffffff', error: '#a93434'
  } } } },
  defaults: { VBtn: { rounded: 'lg', elevation: 0, style: 'text-transform: none; letter-spacing: 0' } }
});
createApp(App).use(vuetify).mount('#app');
