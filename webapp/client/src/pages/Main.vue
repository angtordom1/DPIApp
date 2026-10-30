<template>
    <div class="surface-2 flex align-items-center justify-content-center overflow-hidden">
        <div class="grid justify-content-center p-2 lg:p-0" style="min-width:80%">
            <div class="col-12 xl:col-6">
                <div class="h-full w-full m-0 px-4 mt-5">
                    <div class="text-center mb-5">
                        <div v-if="!method" class="text-900 text-3xl font-medium mt-4 mb-5">Seleccione qué método prefiere:</div>
                        <!-- stays visible to switch method; allowEmpty=false keeps one option chosen -->
                        <SelectButton v-model="method" :options="options" optionLabel="name" optionValue="value" :allowEmpty="false" :disabled="loading" class="mb-4"/>
                        <div v-if="method === 'client'">
                            <div class="text-900 text-3xl font-medium mt-4 mb-5">Añada una imagen:</div>
                            <!-- the file is sent by this page (search), so it stays chosen for another search -->
                            <FileUpload id="FileUpload" name="data[]" :customUpload="true"
                                @select="fileChosen" @clear="file = null" @remove="fileChosen"
                                :multiple="false" :showUploadButton="false" chooseLabel="Escoger"
                                cancelLabel="Cancelar" accept="image/jpeg,image/png" :maxFileSize="maxFileSize" :fileLimit="1"
                                :disabled="loading"
                                invalidFileTypeMessage="{0}: solo se admiten imágenes JPG o PNG."
                                invalidFileSizeMessage="{0}: la imagen no puede superar {1}."
                                invalidFileLimitMessage="Solo se puede subir una imagen."
                                :pt="{ badge: { root: { style: 'display: none' } } }"/>
                                <!-- no status badge: it would always read "Pendiente", the page uploads the file itself -->
                        </div>
                        <div v-if="method === 'server'">
                            <div class="text-900 text-3xl font-medium mt-4 mb-5">Seleccione una imagen:</div>
                            <Dropdown v-model="selectedImage" :options="images" optionLabel="name" optionValue="code" placeholder="Seleccione una imagen" :disabled="loading"/>
                            <br>
                            <br>
                            <!-- a light thumbnail; the full image only loads when the preview opens -->
                            <Image v-if="selectedImage" :src="thumbnail(selectedImage)" :alt="`Vista previa de ${imageName}`" width="250" height="141" preview>
                                <template #preview="slotProps">
                                    <img :src="selectedImage" :alt="imageName" :class="slotProps.class" :style="slotProps.style" @click="slotProps.onClick">
                                </template>
                            </Image>
                        </div>

                        <div class="field grid mt-5">
                            <label for="modelos" class="text-900 text-3xl font-medium text-center col-12 mb-2 md:col-6 md:mb-0">Seleccione un modelo:</label>
                            <div class="col-12 md:col-6">
                                <Dropdown id="modelos" v-model="selectedModel" :options="models" optionLabel="name" class="col-12" :disabled="loading"
                                    :emptyMessage="modelsLoaded ? 'No hay modelos disponibles: faltan los pesos ONNX (ver README)' : 'Cargando modelos…'"/>
                            </div>
                        </div>
                        <Button v-if="method" id="button" label="Buscar personas" :loading="loading" iconPos="right" class="w-full p-3 text-xl mt-5" @click="search" :disabled="!canSearch"/>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- wide: the result is explored with the zoom viewer -->
    <Dialog v-model:visible="imageDialog" :modal="true" :draggable="false" :dismissableMask="true" :closable="false" :breakpoints="{'960px': '95vw'}" :style="{width: '85vw'}">
        <template #header>
            <div class="grid justify-content-center">
                <p>Imagen resultante usando: {{ result.modelName }}</p>
            </div>
        </template>
        <ZoomViewer :src="result.image" :alt="`Personas detectadas con ${result.modelName}`" class="mb-3"/>
        <template #footer>
            <Button label="Descargar" icon="pi pi-download" iconPos="right" class="p-button-outlined" @click="download"/>
            <Button label="Volver" icon="pi pi-times" iconPos="right" class="p-button-success" @click="back"/>
        </template>
    </Dialog>

    <Toast position="bottom-center"/>

</template>

<script>
import { errorMessage } from '@/http'
import ZoomViewer from '@/components/ZoomViewer.vue'

// preferred model when the page loads (the best accuracy/speed trade-off of the bundled ones)
const DEFAULT_MODEL = 'faster_rcnn_r50_sspnet_1x_Tiny'

export default {
    components: { ZoomViewer },
    data() {
        return {
            selectedModel: null,
            models: [],
            modelsLoaded: false,
            imageDialog: false,
            // what the dialog shows; fixed when the search starts, so changing the form while
            // the search runs can't mislabel it
            result: { image: null, modelName: '', modelCode: '' },
            loading: false,
            method: null,
            options: [
               {name: 'Seleccionar una imagen de prueba', value: 'server'},
               {name: 'Subir una imagen', value: 'client'}
            ],
            selectedImage: '',
            file: null,
            // same limit as the API (server/routes/inference.js)
            maxFileSize: 10 * 1024 * 1024,
            images: [
                {name: 'Imagen 1', code: 'images/bb_V0000_I0001320.jpg'},
                {name: 'Imagen 2', code: 'images/bb_V0006_I0008080.jpg'},
                {name: 'Imagen 3', code: 'images/bb_V0013_I0005800.jpg'},
                {name: 'Imagen 4', code: 'images/google_P000_5G7lgvByEQLhnM.jpg'},
                {name: 'Imagen 5', code: 'images/youtube_V0000_I0006800.jpg'},
            ],
        }
    },
    computed: {
        // the button follows the data: an image chosen (sample or file), a model, and no search running
        canSearch() {
            const imageChosen = this.method === 'server' ? !!this.selectedImage : !!this.file
            return imageChosen && !!this.selectedModel && !this.loading
        },
        imageName() {
            return this.images.find((image) => image.code === this.selectedImage)?.name || ''
        },
    },
    watch: {
        // switching method mounts an empty file picker
        method() {
            this.file = null
        }
    },
    created() {
        this.getModels()
    },
    methods: {
        getModels(){
            this.axios.get('/api/models')
                .then( res => {
                    this.models = res.data
                    this.selectedModel = res.data.find((model) => model.code === DEFAULT_MODEL) || res.data[0] || null
                })
                .catch( err => this.showError(err))
                .finally(() => { this.modelsLoaded = true })
        },
        thumbnail(image) {
            return image.replace('images/', 'images/thumbs/')
        },
        // on select and on remove: the picker's list, which only holds accepted files (PrimeVue
        // reports a select even when it rejects one). Beyond the limit (a second file dropped in)
        // it shows an error and the first file is still the one sent.
        fileChosen(event) {
            this.file = event.files[0] || null
        },
        search(){
            const model = this.selectedModel
            this.loading = true
            const request = this.method === 'client'
                ? this.axios.post(`/api/inference/${model.code}`, this.uploadForm())
                : this.axios.post(`/api/inference/server/${model.code}`, {image: this.selectedImage})
            request
                .then(res => this.showResult(res, model))
                .catch(err => this.showError(err))
                .finally(() => { this.loading = false })
        },
        uploadForm(){
            const data = new FormData()
            data.append('data', this.file)
            return data
        },
        back(){
            // close the result and keep the form as it was, ready for another search
            this.imageDialog = false
        },
        download(){
            let a = document.createElement("a");
            a.href = this.result.image;
            a.download = `resultado_${this.result.modelCode}.jpg`
            a.click();
        },
        showResult(res, model){
            // the API already returns base64 (Node's Buffer does not exist in the browser)
            this.result = { image: 'data:image/jpeg;base64,' + res.data.img, modelName: model.name, modelCode: model.code }
            this.imageDialog = true
        },
        showError(err){
            // the API's messages are written for users; without a response, a generic one.
            // An expired session (401) also sends the user to the login page (http.js).
            const quota = err.response?.status === 429
            this.$toast.add({severity:'error', detail: errorMessage(err), life: quota ? 10000 : 6000, closable: quota})
        }
    }
}
</script>
