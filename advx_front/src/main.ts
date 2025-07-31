import App from './App.vue'
import router from './router'
import './assets/styles/global.css';


import "ant-design-vue/dist/reset.css";
import {createPinia} from "pinia";
import {createApp} from "vue";

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
