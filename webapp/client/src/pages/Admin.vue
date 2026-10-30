<template>
    <div class="surface-2 flex align-items-center justify-content-center overflow-hidden">
        <div class="grid justify-content-center p-2 lg:p-0" style="min-width:80%">
            <div class="col-12">
                <div class="h-full w-full m-0 px-4 mt-5">
                    <div class="text-center mb-5">
                        <div class="text-900 text-3xl font-medium mb-3">Gestión de modelos</div>
                    </div>

                    <Toolbar class="mb-4">
                        <template #start>
                            <Button id="btBack" label="Volver" icon="pi pi-arrow-left" class="p-button-text" @click="$router.push({ name: 'main' })"/>
                        </template>
                        <template #end>
                            <Button label="Nuevo modelo" icon="pi pi-plus" class="p-button-success" @click="openNew"/>
                        </template>
                    </Toolbar>

                    <DataTable :value="models" responsiveLayout="scroll">
                        <Column field="name" header="Nombre" sortable></Column>
                        <Column header="Disponible en Flask" style="width: 10rem; text-align: center">
                            <template #body="slotProps">
                                <i v-if="flaskModels.includes(slotProps.data.code)"
                                    class="pi pi-check-circle" style="color: var(--green-500); font-size: 1.3rem"/>
                                <i v-else
                                    class="pi pi-times-circle" style="color: var(--red-500); font-size: 1.3rem"/>
                            </template>
                        </Column>
                        <Column header="Acciones" style="width: 8rem; text-align: center">
                            <template #body="slotProps">
                                <Button icon="pi pi-trash" class="p-button-rounded p-button-danger"
                                    :aria-label="`Eliminar ${slotProps.data.name}`"
                                    @click="confirmDelete(slotProps.data)"/>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </div>
        </div>
    </div>

    <!-- Dialog nuevo modelo -->
    <Dialog v-model:visible="modelDialog" header="Nuevo modelo" :modal="true" :draggable="false"
        :style="{width: '480px'}" :closable="true">
        <div class="field mt-3">
            <label for="name" class="block text-900 font-medium mb-2">Nombre</label>
            <InputText id="name" v-model="newModel.name" class="w-full" placeholder="Ej: Faster RCNN R50 FPN"/>
        </div>
        <div class="field mt-3">
            <label for="onnxFile" class="block text-900 font-medium mb-2">Archivo ONNX <span class="text-500 font-normal">(.onnx)</span></label>
            <input id="onnxFile" ref="onnxFile" type="file" accept=".onnx" class="w-full p-inputtext"/>
        </div>
        <div class="field mt-3">
            <label for="baseConfig" class="block text-900 font-medium mb-2">Arquitectura <span class="text-500 font-normal">(config del repositorio con la que se entrenó)</span></label>
            <Dropdown id="baseConfig" v-model="newModel.baseConfig" :options="configs" placeholder="Seleccione una config" class="w-full"/>
        </div>
        <template #footer>
            <Button label="Cancelar" icon="pi pi-times" class="p-button-text p-button-danger" @click="modelDialog=false"/>
            <Button label="Guardar" icon="pi pi-check" class="p-button-text p-button-success" :loading="saving" @click="saveModel"/>
        </template>
    </Dialog>

    <!-- Dialog confirmar borrado -->
    <Dialog v-model:visible="deleteDialog" header="Confirmar" :modal="true" :draggable="false"
        :style="{width: '350px'}" :closable="false">
        <div class="flex align-items-center">
            <i class="pi pi-exclamation-triangle mr-3" style="font-size: 2rem"/>
            <span>¿Eliminar el modelo <b>{{modelToDelete?.name}}</b>?</span>
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" class="p-button-text p-button-danger" @click="deleteDialog=false"/>
            <Button label="Sí" icon="pi pi-check" class="p-button-text p-button-success" @click="deleteModel"/>
        </template>
    </Dialog>

    <Toast position="bottom-center"/>
</template>

<script>
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import { errorMessage } from '@/http'

export default {
    components: { Column, DataTable },
    data() {
        return {
            models: [],
            flaskModels: [],
            configs: [],
            modelDialog: false,
            deleteDialog: false,
            newModel: { name: '', baseConfig: null },
            modelToDelete: null,
            saving: false,
        }
    },
    created() {
        this.getModels()
        this.getFlaskModels()
        this.getConfigs()
    },
    methods: {
        getModels() {
            this.axios.get('/api/models')
                .then(res => { this.models = res.data })
                .catch(err => this.$toast.add({ severity: 'error', detail: errorMessage(err, 'Error al cargar modelos'), life: 6000, closable: false }))
        },
        getFlaskModels() {
            this.axios.get('/api/models/flask')
                .then(res => { this.flaskModels = res.data.models })
                .catch(() => { this.flaskModels = [] })
        },
        getConfigs() {
            this.axios.get('/api/models/configs')
                .then(res => { this.configs = res.data.configs })
                .catch(() => { this.configs = [] })
        },
        openNew() {
            this.newModel = { name: '', baseConfig: null }
            this.modelDialog = true
        },
        saveModel() {
            const onnxFile = this.$refs.onnxFile?.files[0]
            if (!this.newModel.name || !this.newModel.baseConfig || !onnxFile) {
                this.$toast.add({ severity: 'warn', detail: 'Rellene todos los campos y seleccione el archivo ONNX', life: 3000, closable: false })
                return
            }
            const formData = new FormData()
            formData.append('name', this.newModel.name)
            formData.append('base_config', this.newModel.baseConfig)
            formData.append('onnx_file', onnxFile)
            this.saving = true
            this.axios.post('/api/models', formData)
                .then(res => {
                    this.models.push(res.data)
                    this.models.sort((a, b) => a.name.localeCompare(b.name))
                    this.flaskModels.push(res.data.code)
                    this.modelDialog = false
                    this.$toast.add({ severity: 'success', detail: 'Modelo creado', life: 3000, closable: false })
                })
                .catch(err => this.$toast.add({ severity: 'error', detail: errorMessage(err, 'Error al crear modelo'), life: 6000, closable: false }))
                .finally(() => { this.saving = false })
        },
        confirmDelete(model) {
            this.modelToDelete = model
            this.deleteDialog = true
        },
        deleteModel() {
            this.axios.delete(`/api/models/${this.modelToDelete._id}`)
                .then(() => {
                    this.models = this.models.filter(m => m._id !== this.modelToDelete._id)
                    this.deleteDialog = false
                    this.$toast.add({ severity: 'success', detail: 'Modelo eliminado', life: 3000, closable: false })
                })
                .catch(err => this.$toast.add({ severity: 'error', detail: errorMessage(err, 'Error al eliminar modelo'), life: 6000, closable: false }))
        }
    }
}
</script>
