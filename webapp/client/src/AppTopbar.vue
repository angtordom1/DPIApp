<template>
	<div class="layout-topbar">
		<router-link to="/" class="layout-topbar-logo">
			<span>DPIAPP</span>
		</router-link>
		<div class="col-10 flex justify-content-end">
			<span class="flex font-bold align-self-center">{{ username }}&nbsp;</span>
			<button class="p-link layout-topbar-button mr-3" @click="toggleMenu" id="btUsuario" aria-label="Menú de usuario" aria-haspopup="true">
				<i class="pi pi-user"></i>
			</button>
			<Menu ref="menu" :model="overlayMenuItems" :popup="true"/>
		</div>
		<Dialog v-model:visible="displayConfirmation" :style="{width: '350px'}" :modal="true" :draggable="false" :closable="false">
			<div class="flex align-items-center justify-content-center">
				<i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem" />
				<span>¿Seguro que desea salir?</span>
			</div>
			<template #footer>
				<Button label="No" icon="pi pi-times" @click="displayConfirmation = false" class="p-button-text p-button-danger" autofocus />
				<Button label="Sí" icon="pi pi-check" @click="logout" class="p-button-text p-button-success"/>
			</template>
		</Dialog>
	</div>
</template>

<script>
import { currentUser, clearSession } from './auth'

export default {
	data() {
		return {
			displayConfirmation: false,
			overlayMenuItems: [],
			username: '',
		}
	},
	mounted() {
		const user = currentUser()
		if (!user) return
		this.username = user.username
		// shown from the token; the API checks the role again on every admin request
		if (user.isAdmin) {
			this.overlayMenuItems.push({
				label: 'Administración',
				icon: 'pi pi-cog',
				command: () => { this.$router.push({ name: 'admin' }) }
			})
		}
		this.overlayMenuItems.push({
			label: 'Cerrar sesión',
			icon: 'pi pi-sign-out',
			command: () => { this.displayConfirmation = true }
		})
	},
	methods: {
		toggleMenu(event) {
			this.$refs.menu.toggle(event);
		},
		logout() {
			this.displayConfirmation = false
			clearSession()
			this.$router.push({ name: 'login' })
		}
	}
}
</script>
