<template>
    <div class="surface-2 flex align-items-center justify-content-center overflow-hidden">
        <div class="grid justify-content-center p-2 lg:p-0" style="min-width:80%">
            <div class="col-12 xl:col-6">
                <div class="h-full w-full m-0 px-4">
                    <div class="text-center mb-3">
                        <div class="text-900 text-3xl font-medium mb-3">Registro</div>
                    </div>

                    <!-- a form, so Enter in any field registers; novalidate: the page checks the fields
                         itself, with the same rules and messages as the API -->
                    <form class="w-full md:w-10 mx-auto formgrid grid" novalidate @submit.prevent="register">
                        <div class="field col-12 md:col-6">
                            <label for="username1" class="block text-900 text-xl font-medium mb-2">Usuario</label>
                            <InputText id="username1" ref="username" v-model="user.username" type="text" autocomplete="username" class="w-full mb-3" placeholder="Usuario" style="padding:1rem;" />
                        </div>

                        <div class="field col-12 md:col-6">
                            <label for="email1" class="block text-900 font-medium text-xl mb-2">Email</label>
                            <InputText id="email1" v-model="user.email" type="email" autocomplete="email" placeholder="Email" class="w-full mb-3" style="padding:1rem"/>
                        </div>

                        <div class="field col-12 md:col-6">
                            <label for="password1" class="block text-900 font-medium text-xl mb-2">Contraseña</label>
                            <Password id="password1" v-model="user.password" placeholder="Contraseña" :toggleMask="true" class="w-full mb-3" inputClass="w-full" :inputStyle="{ padding: '1rem' }" :inputProps="{ autocomplete: 'new-password' }"></Password>
                        </div>

                        <div class="field col-12 md:col-6">
                            <label for="password2" class="block text-900 font-medium text-xl mb-2">Verificar contraseña</label>
                            <Password id="password2" v-model="passwordConfirm" placeholder="Verificar contraseña" :feedback="false" :toggleMask="true" class="w-full mb-3" inputClass="w-full" :inputStyle="{ padding: '1rem' }" :inputProps="{ autocomplete: 'new-password' }"></Password>
                        </div>

                        <Button type="submit" label="Registrarse" class="w-full mb-3 p-3 text-xl"/>
                        <Button type="button" label="Volver" class="w-full p-3 text-xl" @click="back"/>
                    </form>
                </div>
            </div>
        </div>
    </div>
    <Toast position="bottom-center"/>
</template>

<script>
import { errorMessage } from '@/http'

// Same rules as the API (server/validation.js), checked here to answer without a round trip
const USERNAME_RE = /^(?=.*[A-Za-z])[A-Za-z0-9_.-]{4,20}$/
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>".]+$/
const PASSWORD_MIN = 8
const PASSWORD_MAX = 72
const RESERVED_USERNAMES = ['admin', 'administrator', 'root', 'test']

export default {
    data() {
        return {
            user: {username: '', password: '', email: ''},
            passwordConfirm: ''
        }
    },
    mounted() {
        this.$refs.username.$el.focus()
    },
    methods: {
        error(detail) {
            this.$toast.add({severity:'error', detail, life: 5000, closable: false})
        },
        register() {
            const { username, email, password } = this.user

            if (!username || !email || !password || !this.passwordConfirm) {
                return this.error('Por favor, introduzca los datos para registrarse')
            }
            if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
                return this.error('Nombre de usuario no permitido')
            }

            let valid = true
            if (!EMAIL_RE.test(email)) {
                valid = false
                this.error('Debe ser un correo válido')
            }
            if (!USERNAME_RE.test(username)) {
                valid = false
                this.error('El usuario debe tener entre 4 y 20 caracteres (letras, números, punto, guion o guion bajo) y al menos una letra')
            }
            // bcrypt's limit is in bytes (an accented letter takes 2)
            if (password.length < PASSWORD_MIN || new TextEncoder().encode(password).length > PASSWORD_MAX) {
                valid = false
                this.error(`La contraseña debe tener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres (las letras con tilde cuentan doble)`)
            }
            if (password !== this.passwordConfirm) {
                valid = false
                this.error('Las contraseñas deben coincidir')
            }
            if (!valid) return

            this.axios.post('/api/users', this.user)
                .then(() => {
                    this.$router.push({ name: 'login', query: {emailMessage: 'emailEnviado'} })
                })
                .catch(err => this.error(errorMessage(err)))
        },
        back(){
            this.$router.push({ name: 'login'})
        },
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
