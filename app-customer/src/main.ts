import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Register a subset of Naive UI components globally (keep bundle small)
import { create, NConfigProvider, NLayout, NLayoutHeader, NLayoutContent, NButton, NIcon, NCard, NGrid, NGridItem, NTag, NBadge, NInputNumber, NDrawer, NDrawerContent, NDivider, NSpace, NForm, NFormItem, NRadioGroup, NRadioButton, NInput, NMessageProvider, NModal, NRate, NAlert } from 'naive-ui';

const app = createApp(App);

const naive = create({
  components: [
    NConfigProvider,
    NLayout,
    NLayoutHeader,
    NLayoutContent,
    NButton,
    NIcon,
    NCard,
    NGrid,
    NGridItem,
    NTag,
    NBadge,
    NInputNumber,
    NDrawer,
    NDrawerContent,
    NDivider,
    NSpace,
    NForm,
    NFormItem,
    NRadioGroup,
    NRadioButton,
    NInput,
    NMessageProvider,
    NModal,
    NRate,
    NAlert,
  ]
});

app.use(naive);
app.use(router);
app.mount('#app');
