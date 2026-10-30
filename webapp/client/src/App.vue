<template>
    <div class="layout-wrapper">
        <AppTopBar v-if="$route.name === 'main'"/>
        <div class="layout-main-container">
            <div class="layout-main">
                <router-view />
            </div>
            <AppFooter />
        </div>
    </div>
</template>

<script>
import AppTopBar from './AppTopbar.vue';
import AppFooter from './AppFooter.vue';
export default {
    watch: {
        $route() {
            this.$toast.removeAllGroups();
        },
    },
    components: {
        'AppTopBar': AppTopBar,
        'AppFooter': AppFooter,
    }
}
</script>
