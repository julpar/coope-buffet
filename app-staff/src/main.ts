import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Register a subset of Naive UI components globally
import { create, NConfigProvider, NLayout, NLayoutHeader, NLayoutSider, NLayoutContent, NMenu, NSwitch, NButton, NIcon, NCard, NDataTable, NInput, NSelect, NTag, NMessageProvider } from 'naive-ui';

const app = createApp(App);

const naive = create({
  components: [
    NConfigProvider,
    NLayout,
    NLayoutHeader,
    NLayoutSider,
    NLayoutContent,
    NMenu,
    NSwitch,
    NButton,
    NIcon,
    NCard,
    NDataTable,
    NInput,
    NSelect,
    NTag,
    NMessageProvider
  ]
});

app.use(naive);
app.use(router);
app.mount('#app');
