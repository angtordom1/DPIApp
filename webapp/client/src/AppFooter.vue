<template>
	<div class="layout-footer" v-if="$route.name !== 'about'">
		<router-link to="/about">
			<span class="font-medium ml-2">Sobre la página</span>
		</router-link>
	</div>
</template>

<script>
	export default {
		name: "AppFooter",
	}
</script>
