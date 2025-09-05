import { ref } from 'vue'
import { WORLD_SCALE_FACTOR } from '@/config/cat'

export function useCamera() {
  const viewportX = ref(0)
  const viewportY = ref(0)
  const viewportWidth = ref(0)
  const viewportHeight = ref(0)

  const worldWidth = ref(0)
  const worldHeight = ref(0)

  function setViewportSize(width: number, height: number) {
    viewportWidth.value = width
    viewportHeight.value = height
  }

  function calculateWorldSize(bgImg: HTMLImageElement) {
    if (!bgImg) return
    const scale = (viewportHeight.value / bgImg.height) * WORLD_SCALE_FACTOR
    worldWidth.value = bgImg.width * scale
    worldHeight.value = bgImg.height * scale

    if (viewportX.value === 0 && viewportY.value === 0) {
      viewportX.value = worldWidth.value / 2 - viewportWidth.value / 2
      viewportY.value = worldHeight.value / 2 - viewportHeight.value / 2
    }
  }

  function clampViewToWorld() {
    viewportX.value = Math.max(0, Math.min(worldWidth.value - viewportWidth.value, viewportX.value))
    viewportY.value = Math.max(0, Math.min(worldHeight.value - viewportHeight.value, viewportY.value))
  }

  function follow(centerX: number, centerY: number) {
    viewportX.value = centerX - viewportWidth.value / 2
    viewportY.value = centerY - viewportHeight.value / 2
    clampViewToWorld()
  }

  return {
    viewportX,
    viewportY,
    viewportWidth,
    viewportHeight,
    worldWidth,
    worldHeight,
    setViewportSize,
    calculateWorldSize,
    follow,
  }
}


