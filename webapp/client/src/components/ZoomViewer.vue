<template>
    <div class="zoom-viewer">
        <div class="zoom-toolbar flex align-items-center justify-content-center gap-2 mb-2">
            <Button icon="pi pi-search-minus" class="p-button-text p-button-rounded" aria-label="Reducir" @click="zoomBy(1 / STEP)" :disabled="!ready || scale <= fitScale"/>
            <span class="zoom-level text-700 font-medium" aria-live="polite">{{ Math.round(scale * 100) }} %</span>
            <Button icon="pi pi-search-plus" class="p-button-text p-button-rounded" aria-label="Ampliar" @click="zoomBy(STEP)" :disabled="!ready || scale >= MAX_SCALE"/>
            <Button label="Ajustar" class="p-button-text p-button-sm" @click="fit" :disabled="!ready"/>
            <Button label="100 %" class="p-button-text p-button-sm" @click="zoomTo(1)" :disabled="!ready"/>
        </div>
        <!-- wheel zooms where the pointer is, dragging pans; + - 0 and the arrows from the keyboard -->
        <div ref="stage" class="zoom-stage" :class="{ dragging: drag }" tabindex="0" role="img" :aria-label="alt"
            @wheel.prevent="onWheel" @pointerdown="onPointerDown" @pointermove="onPointerMove"
            @pointerup="onPointerUp" @pointercancel="onPointerUp" @dblclick="onDoubleClick" @keydown="onKey">
            <img ref="image" :src="src" alt="" draggable="false" @load="onLoad"
                :style="{ transform: `translate(${x}px, ${y}px) scale(${scale})` }">
        </div>
        <small class="block text-center text-600 mt-2">Rueda del ratón o botones para ampliar, arrastre para moverse, doble clic para alternar entre ajustar y 100 %.</small>
    </div>
</template>

<script>
// Zoom and pan over a large image: the people the models detect are 2-20 px tall, so a 1080p or
// 4K result scaled to fit the screen needs to be explored up close.
const STEP = 1.25
const MAX_SCALE = 4  // 400 % of the image's real pixels

export default {
    name: 'ZoomViewer',
    props: {
        src: { type: String, required: true },
        alt: { type: String, default: '' },
    },
    data() {
        return { STEP, MAX_SCALE, ready: false, scale: 1, fitScale: 1, x: 0, y: 0, drag: null }
    },
    mounted() {
        // keep the image fitted when the dialog changes size, unless the user has zoomed in
        this.resizeObserver = new ResizeObserver(() => {
            if (this.ready && this.scale <= this.fitScale) this.fit()
        })
        this.resizeObserver.observe(this.$refs.stage)
    },
    beforeUnmount() {
        this.resizeObserver.disconnect()
    },
    watch: {
        src() { this.ready = false },
    },
    methods: {
        stageSize() {
            const { clientWidth, clientHeight } = this.$refs.stage
            return { width: clientWidth, height: clientHeight }
        },
        onLoad() {
            this.ready = true
            this.fit()
        },
        fit() {
            const { naturalWidth, naturalHeight } = this.$refs.image
            const { width, height } = this.stageSize()
            this.fitScale = Math.min(width / naturalWidth, height / naturalHeight, 1)
            this.scale = this.fitScale
            this.clampPosition()
        },
        // zoom keeping the image point under (cx, cy) in place; the stage centre by default
        zoomTo(target, cx, cy) {
            if (!this.ready) return
            const { width, height } = this.stageSize()
            cx = cx ?? width / 2
            cy = cy ?? height / 2
            const next = Math.min(Math.max(target, this.fitScale), MAX_SCALE)
            this.x = cx - (cx - this.x) * (next / this.scale)
            this.y = cy - (cy - this.y) * (next / this.scale)
            this.scale = next
            this.clampPosition()
        },
        zoomBy(factor, cx, cy) {
            this.zoomTo(this.scale * factor, cx, cy)
        },
        // keep the image covering the stage, or centred along an axis where it is smaller
        clampPosition() {
            const { naturalWidth, naturalHeight } = this.$refs.image
            const { width, height } = this.stageSize()
            const w = naturalWidth * this.scale
            const h = naturalHeight * this.scale
            this.x = w <= width ? (width - w) / 2 : Math.min(0, Math.max(width - w, this.x))
            this.y = h <= height ? (height - h) / 2 : Math.min(0, Math.max(height - h, this.y))
        },
        pointerPosition(event) {
            const rect = this.$refs.stage.getBoundingClientRect()
            return [event.clientX - rect.left, event.clientY - rect.top]
        },
        onWheel(event) {
            this.zoomBy(event.deltaY < 0 ? STEP : 1 / STEP, ...this.pointerPosition(event))
        },
        onPointerDown(event) {
            if (!this.ready || event.button !== 0) return
            this.$refs.stage.setPointerCapture(event.pointerId)
            this.drag = { id: event.pointerId, startX: event.clientX - this.x, startY: event.clientY - this.y }
        },
        onPointerMove(event) {
            if (!this.drag || event.pointerId !== this.drag.id) return
            this.x = event.clientX - this.drag.startX
            this.y = event.clientY - this.drag.startY
            this.clampPosition()
        },
        onPointerUp(event) {
            if (this.drag && event.pointerId === this.drag.id) this.drag = null
        },
        onDoubleClick(event) {
            if (this.scale > this.fitScale) this.fit()
            else this.zoomTo(1, ...this.pointerPosition(event))
        },
        onKey(event) {
            const PAN = 50
            const actions = {
                '+': () => this.zoomBy(STEP),
                '=': () => this.zoomBy(STEP),
                '-': () => this.zoomBy(1 / STEP),
                '0': () => this.fit(),
                ArrowLeft: () => { this.x += PAN },
                ArrowRight: () => { this.x -= PAN },
                ArrowUp: () => { this.y += PAN },
                ArrowDown: () => { this.y -= PAN },
            }
            const action = actions[event.key]
            if (!action) return
            event.preventDefault()
            action()
            this.clampPosition()
        },
    },
}
</script>

<style scoped>
.zoom-stage {
    position: relative;
    /* aerial photos are landscape: on a narrow screen a tall stage would be mostly empty */
    height: min(55vh, 75vw);
    overflow: hidden;
    background: var(--surface-ground);
    border-radius: var(--border-radius);
    cursor: grab;
    touch-action: none;
}

.zoom-stage.dragging {
    cursor: grabbing;
}

.zoom-stage:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
}

.zoom-stage img {
    position: absolute;
    top: 0;
    left: 0;
    max-width: none;
    transform-origin: 0 0;
    user-select: none;
}

.zoom-level {
    min-width: 4rem;
    text-align: center;
}

.zoom-toolbar :deep(.p-button) {
    white-space: nowrap;
}
</style>
