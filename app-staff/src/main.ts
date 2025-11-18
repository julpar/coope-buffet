import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Element Plus UI framework
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as Icons from '@element-plus/icons-vue';

const app = createApp(App);

// Register Element Plus
app.use(ElementPlus);

// Register all Element Plus icons globally (lightweight tree of SVG components)
for (const [name, component] of Object.entries(Icons)) {
  app.component(name, component as any);
}

app.use(router);
app.mount('#app');
