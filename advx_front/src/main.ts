import App from './App.vue'
import router from './router'
import './assets/styles/global.css';


import "ant-design-vue/dist/reset.css";
import {createPinia} from "pinia";
import {createApp} from "vue";

// 可拔插：若存在 dev-login-bypass.ts 则自动加载，删除该文件即可禁用
try {
  // 使用相对静态路径导入。若文件不存在会在构建期报错，因此仅用于开发期
  // 通过 Vite 动态导入加 try/catch，在 dev 环境文件不存在时直接忽略
  await import('./dev-login-bypass')
} catch (e) {
  // no-op
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
