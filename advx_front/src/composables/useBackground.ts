import { ref } from 'vue'
import { HORIZONTAL_OFFSET_RATIO, WORLD_SCALE_FACTOR } from '@/config/cat'

export function useBackground() {
  const bgImg = ref<HTMLImageElement | null>(null)

  async function loadBackground() {
    const img = new Image()
    const mod = await import('@/assets/static/background/road.png')
    img.src = mod.default
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
    })
    bgImg.value = img
    return img
  }

  function drawBackground(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    viewportX: number,
    viewportY: number,
    worldWidth: number,
    worldHeight: number,
  ) {
    if (!bgImg.value) return
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    const scale = (viewportHeight / bgImg.value.height) * WORLD_SCALE_FACTOR
    const drawWidth = bgImg.value.width * scale
    const drawHeight = bgImg.value.height * scale

    const bgWorldX = (worldWidth - drawWidth) / 2
    const bgWorldY = (worldHeight - drawHeight) / 2
    const horizontalOffset = viewportWidth * HORIZONTAL_OFFSET_RATIO
    const bgViewX = bgWorldX - viewportX + horizontalOffset
    const bgViewY = bgWorldY - viewportY

    ctx.drawImage(bgImg.value, bgViewX, bgViewY, drawWidth, drawHeight)
  }

  return { bgImg, loadBackground, drawBackground }
}


