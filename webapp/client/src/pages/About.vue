<template>
	<div class="grid">
		<div class="col-12">
			<h1>Sobre la página</h1>
			<div class="card">
				<p class="text-justify">Esta página es producto de la investigación llevada a cabo para la realización del Trabajo de Fin de Grado del autor de esta página (Universidad de Sevilla, 2022).</p>

				<p class="text-justify"> La principal motivación para la elaboración de este proyecto fue profundizar en el mundo de las redes neuronales,
					se eligió la detección de objetos debido a su gran potencial en la actualidad y a futuro,
					específicamente la detección de personas a través de imágenes aéreas por sus posibles aplicaciones en áreas sociales y seguridad.

					La página ofrece tres modelos: dos versiones de SSPNet (paper <a href="https://arxiv.org/pdf/2107.01548.pdf">aquí</a>),
					los mejores que se obtuvieron durante la investigación, y un Faster R-CNN R50-FPN como referencia.
				</p>
				<br>
				<p class="text-justify">Rendimiento en el conjunto de test de TinyPerson (AP en %, tiny = personas de 2 a 20 píxeles) y tiempo de inferencia
					por recorte de 640×512 en una GPU de Google Colab:</p>
				<br>
				<p class="text-center font-italic">Resultados de la memoria del TFG</p>
				<DataTable :value="thesis" responsiveLayout="scroll">
					<Column field="model" header="Modelo"></Column>
					<Column field="AP50tiny">
						<template #header>
						<p>AP<sup>tiny</sup><sub>50</sub></p>
						</template>
					</Column>
					<Column field="AP50tiny1">
						<template #header>
						<p>AP<sup>tiny1</sup><sub>50</sub></p>
						</template>
					</Column>
					<Column field="AP50tiny2">
						<template #header>
						<p>AP<sup>tiny2</sup><sub>50</sub></p>
						</template>
					</Column>
					<Column field="AP50tiny3">
						<template #header>
						<p>AP<sup>tiny3</sup><sub>50</sub></p>
						</template>
					</Column>
					<Column field="AP25tiny">
						<template #header>
						<p>AP<sup>tiny</sup><sub>25</sub></p>
						</template>
					</Column>
					<Column field="ms" header="ms/recorte (GPU)"></Column>
				</DataTable>
				<br><br>

				<p class="text-center font-italic">Modelos que sirve esta página (ONNX Runtime en CPU)</p>
				<DataTable :value="served" responsiveLayout="scroll" class="mb-4">
					<Column field="model" header="Modelo"></Column>
					<Column field="AP50tiny">
						<template #header>
						<p>AP<sup>tiny</sup><sub>50</sub> (ONNX)</p>
						</template>
					</Column>
					<Column field="ms" header="ms/recorte (CPU)"></Column>
				</DataTable>
				<p class="text-justify text-600">La referencia servida se reentrenó en 2026 con la misma receta que SSPNet Tiny para comparar solo
					el cuello de la red. El SSPNet (v2) exportado funciona a una sola escala, por lo que su precisión no es la de la memoria.
					La página procesa la imagen completa de una vez y solo dibuja las detecciones con una confianza de al menos 0,7, mientras
					que el AP se mide sobre recortes y con todas las detecciones; por eso el resultado puede mostrar menos personas de las que
					el modelo encuentra.</p>
			</div>
		</div>
		<div class="grid col-12 justify-content-center">
			<Button class="col-6" label="Volver" @click="$router.push({ name: 'main' })"/>
		</div>
	</div>
</template>

<script>
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'

export default {
	components: { Column, DataTable },
	data() {
        return {
			thesis: [
				{ model: 'SSPNet (v2)', AP50tiny: '49,58', AP50tiny1: '37,40', AP50tiny2: '52,30', AP50tiny3: '58,76', AP25tiny: '67,98', ms: '542,2' },
				{ model: 'SSPNet Tiny (v1)', AP50tiny: '47,30', AP50tiny1: '31,88', AP50tiny2: '51,01', AP50tiny3: '56,84', AP25tiny: '69,41', ms: '54,3' },
				{ model: 'Faster R-CNN R50-FPN', AP50tiny: '29,56', AP50tiny1: '17,41', AP50tiny2: '34,35', AP50tiny3: '37,73', AP25tiny: '46,12', ms: '56,9' },
			],
			served: [
				{ model: 'SSPNet (v2)', AP50tiny: 'sin evaluar', ms: '1694' },
				{ model: 'SSPNet Tiny (v1)', AP50tiny: '47,24', ms: '447' },
				{ model: 'Faster R-CNN R50-FPN (2026)', AP50tiny: '43,74', ms: '271' },
			]
		}
	},
}
</script>
