import { ROAD_TOP_THICKNESS_RATIO, WORLD_SCALE_FACTOR } from '@/config/cat'

export function useCollision() {
  function isCollideRoadTop(
    bgImg: HTMLImageElement | null,
    viewportHeight: number,
    worldHeight: number,
    catTop: number,
    catBottom: number,
  ) {
    if (!bgImg) return false
    const scale = (viewportHeight / bgImg.height) * WORLD_SCALE_FACTOR
    const drawHeight = bgImg.height * scale
    const bgWorldY = (worldHeight - drawHeight) / 2
    const roadTopY = bgWorldY
    const roadTopBottomY = roadTopY + drawHeight * ROAD_TOP_THICKNESS_RATIO
    return catBottom >= roadTopY && catTop <= roadTopBottomY
  }

  return { isCollideRoadTop }
}


