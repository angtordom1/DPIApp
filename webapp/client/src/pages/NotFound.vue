<template>
    <div class="grid justify-content-center p-2 lg:p-0" style="min-width:80%">
        <div class="col-12 xl:col-6" style="border-radius:56px; padding:0.3rem; background: linear-gradient(180deg, rgba(33, 150, 243, 0.4) 10%, rgba(33, 150, 243, 0) 30%);">
            <div class="h-full w-full m-0 py-7 px-4" style="border-radius:53px; background: linear-gradient(180deg, var(--surface-50) 38.9%, var(--surface-0));">
                <div class="grid flex flex-column align-items-center">
                    <span class="text-blue-500 font-bold text-3xl">404</span>
                    <h1 class="text-900 font-bold text-3xl lg:text-5xl mb-2">Parece que está perdido</h1>
                    <span class="text-gray-600 text-xl lg:text-2xl">La página no existe.</span>
                    <img src="/layout/images/asset-notfound.jpg" alt="" class="mt-5" style="width: 80%;">
                    <div class="col-12 mt-5 text-center">
                        <i class="pi pi-fw pi-arrow-left text-blue-500 mr-2" style="vertical-align:center;"></i>
                        <router-link to="/" class="text-blue-500">Volver al inicio</router-link>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>