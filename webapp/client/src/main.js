import 'primevue/resources/themes/lara-light-indigo/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeflex/primeflex.min.css';
import 'primeicons/primeicons.css';
import './assets/styles/layout.scss';

import { createApp } from 'vue';
import router from './router';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import es from './locale-es';
import VueAxios from 'vue-axios'
import http from './http'


import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import FileUpload from 'primevue/fileupload';
import Image from 'primevue/image';
import InputText from 'primevue/inputtext';
import Menu from 'primevue/menu';
import Password from 'primevue/password';
import SelectButton from 'primevue/selectbutton';
import Toast from 'primevue/toast';
import ToastService from 'primevue/toastservice';
import Toolbar from 'primevue/toolbar';

const app = createApp(App);

app.use(PrimeVue, { inputStyle: 'outlined', locale: es });
app.use(VueAxios, http);
app.use(ToastService);
app.use(router);

app.component('Button', Button);
app.component('Dialog', Dialog);
app.component('Dropdown', Dropdown);
app.component('FileUpload', FileUpload);
app.component('Image', Image);
app.component('InputText', InputText);
app.component('Menu', Menu);
app.component('Password', Password);
app.component('SelectButton', SelectButton);
app.component('Toast', Toast);
app.component('Toolbar', Toolbar);

app.mount('#app');
