import { createApp } from "vue";
import App from "./App.vue";
import "./assets/main.css";
import router from "./router";
import { initializeTheme } from "./composables/useTheme";

initializeTheme();

createApp(App).use(router).mount("#app");
