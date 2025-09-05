import { ref } from 'vue'
import { LEFT_FRAMES, RIGHT_FRAMES } from '@/config/cat'
import type { Direction } from '@/config/cat'

export function useSprites() {
  const images = ref<HTMLImageElement[]>([])
  const loadedCount = ref(0)
  const totalFrames = RIGHT_FRAMES.length + LEFT_FRAMES.length

  async function preload() {
    const all = [...RIGHT_FRAMES, ...LEFT_FRAMES]
    images.value = new Array(totalFrames)

    await Promise.all(
      all.map(async (frame, idx) => {
        const img = new Image()
        try {
          const module = await import(`@/assets/static/170-261 dog lop/cat-run_${frame}.png`)
          img.src = module.default
        } catch (e) {
          // 忽略加载错误
        }
        return new Promise<void>((resolve) => {
          img.onload = () => {
            loadedCount.value++
            resolve()
          }
          // 即使加载失败也不阻塞整体流程
          img.onerror = () => resolve()
          images.value[idx] = img
        })
      }),
    )
  }

  function getImageIndex(direction: Direction, frameIndex: number) {
    return direction === 'right' ? frameIndex : RIGHT_FRAMES.length + frameIndex
  }

  function getFrames(direction: Direction) {
    return direction === 'right' ? RIGHT_FRAMES : LEFT_FRAMES
  }

  return { images, loadedCount, totalFrames, preload, getImageIndex, getFrames }
}


