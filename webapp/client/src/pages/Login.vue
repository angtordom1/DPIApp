<template>
    <div class="surface-2 flex align-items-center justify-content-center overflow-hidden">
        <div class="grid justify-content-center p-2 lg:p-0" style="min-width:80%">
            <div class="col-12 xl:col-6">
                <div class="h-full w-full m-0 px-4">
                    <div class="text-center mb-5">
                        <div class="text-900 text-3xl font-medium mb-3">¡Bienvenido!</div>
                        <span class="text-600 font-medium">Inicie sesión para continuar</span>
                    </div>
                
                    <!-- a form, so Enter in any field logs in -->
                    <form class="w-full md:w-10 mx-auto" @submit.prevent="login">
                        <label for="username1" class="block text-900 text-xl font-medium mb-2">Usuario</label>
                        <InputText id="username1" ref="username" v-model="user.username" type="text" autocomplete="username" class="w-full mb-3" placeholder="Usuario o email" style="padding:1rem;" />
                
                        <label for="password1" class="block text-900 font-medium text-xl mb-2">Contraseña</label>
                        <Password id="password1" v-model="user.password" placeholder="Contraseña" :feedback="false" :toggleMask="true" class="w-full mb-3" inputClass="w-full" :inputStyle="{ padding: '1rem' }" :inputProps="{ autocomplete: 'current-password' }"></Password>
                
                        <Button id="btLogin" type="submit" label="Iniciar sesión" class="w-full mb-3 p-3 text-xl"/>
                        <Button id="btSignin" type="button" label="Registrarse" class="w-full p-3 text-xl" @click="register"/>
                    </form>
                </div>
            </div>
        </div>
        <Dialog v-model:visible="emailDialog" :modal="true" class="p-fluid" :draggable="false" :dismissableMask="true" :style="{width: '500px'}" :closable="false">
            <div class="grid justify-content-center">
                <div class="field col-10">
                    <div class="formgroup-inline align-content-center justify-content-center">
                        <span class="text-justify">
                            Se ha enviado un correo de confirmación a su cuenta de correo. 
                            Para poder usar su cuenta, debe confirmar el mensaje enviado.
                        </span>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="grid justify-content-center">
                    <Button label="Confirmar" class="p-button-success" icon="pi pi-check" autofocus @click="emailDialog=false"/>
                </div>
            </template>
        </Dialog>
    </div>
    <Toast position="bottom-center"/>
</template>

<script>
import { saveToken } from '@/auth'
import { errorMessage } from '@/http'

export default {
    data() {
        return {
            user: {username: '', password: ''},
            emailDialog: false,
        }
    },
    mounted() {
        this.$refs.username.$el.focus()
        // after mounting: the Toast component has to be listening
        this.showMessage()
    },
    methods: {
        login(){
            if (this.user.username === '' || this.user.password === ''){
                
                this.$toast.add({severity:'error', detail: 'Por favor, introduzca los datos para iniciar sesión', life: 5000, closable: false})

            } else{
                this.axios.post('/api/login', this.user)
                    .then( res => {
                        saveToken(res.data.token)
                        this.$router.push({ name: 'main' })
                    })
                    .catch( err => {
                        this.$toast.add({severity:'error', detail: errorMessage(err), life: 5000, closable: false})
                    })
            }
        },
        register(){
            this.$router.push({ name: 'register'})
        },
        showMessage(){
            // a query, not a param: vue-router >= 4.1.4 drops params that are not part of the path
            if(this.$route.query.emailMessage){
                this.emailDialog = true
            }
            if(this.$route.query.expired){
                this.$toast.add({severity:'info', detail: 'Su sesión ha caducado, inicie sesión de nuevo', life: 6000, closable: false})
            }
        }
    }
}
</script>

<style scoped>
.pi-eye {
    transform:scale(1.6);
    margin-right: 1rem;
}

.pi-eye-slash {
    transform:scale(1.6);
    margin-right: 1rem;
}
</style>