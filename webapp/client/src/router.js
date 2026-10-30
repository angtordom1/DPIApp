import { createRouter, createWebHistory } from 'vue-router';

import { currentUser, clearSession } from './auth'

const routes = [
    {
        path: '/',
        meta: { requireAuth: true },
        name: 'main',
        component: () => import('./pages/Main.vue')
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('./pages/Login.vue')
    },
    {
        path: '/register',
        name: 'register',
        component: () => import('./pages/Register.vue')
    },
    {
        path: '/access',
        name: 'access',
        component: () => import('./pages/Access.vue')
    },
    {
        path: '/about',
        name: 'about',
        component: () => import('./pages/About.vue')
    },
    {
        path: '/admin',
        meta: { requireAuth: true, requireAdmin: true },
        name: 'admin',
        component: () => import('./pages/Admin.vue')
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'notfound',
        component: () => import('./pages/NotFound.vue')
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 }),
})


router.beforeEach((to) => {
    const user = currentUser()
    if (to.meta.requireAuth && !user) {
        clearSession()
        return { name: 'login' }
    }
    if (to.meta.requireAdmin && !user.isAdmin) {
        return { name: 'access' }
    }
})

export default router;
