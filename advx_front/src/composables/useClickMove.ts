import { ref } from 'vue'

export type Direction = 'left' | 'right'

export function useClickMove() {
  const targetX = ref<number | null>(null)
  const targetY = ref<number | null>(null)
  const createdAt = ref<number>(0)

  function setTarget(x: number, y: number, now: number) {
    targetX.value = x
    targetY.value = y
    createdAt.value = now
  }

  function clearTarget() {
    targetX.value = null
    targetY.value = null
  }

  // 基于速度与 delta（ms）向目标点移动，返回新坐标、是否移动、朝向
  function stepToward(
    posX: number,
    posY: number,
    speedPerSecond: number,
    deltaMs: number,
  ): { x: number; y: number; moving: boolean; direction: Direction } {
    if (targetX.value == null || targetY.value == null) {
      return { x: posX, y: posY, moving: false, direction: 'right' }
    }
    const dx = targetX.value - posX
    const dy = targetY.value - posY
    const dist = Math.hypot(dx, dy)
    const threshold = 2 // 接近阈值
    if (dist <= threshold) {
      return { x: targetX.value, y: targetY.value, moving: false, direction: dx >= 0 ? 'right' : 'left' }
    }
    const maxStep = (speedPerSecond * deltaMs) / 1000
    const ratio = Math.min(1, maxStep / dist)
    const nx = posX + dx * ratio
    const ny = posY + dy * ratio
    return { x: nx, y: ny, moving: true, direction: dx >= 0 ? 'right' : 'left' }
  }

  // 绘制动态点击标记（脉冲圆圈）
  function drawMarker(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    now: number,
  ) {
    const elapsed = (now - createdAt.value) / 1000 // s
    const period = 1.2 // s
    const t = (elapsed % period) / period
    const baseRadius = 8
    const maxExtra = 14
    const radius = baseRadius + maxExtra * t
    const alpha = 1 - t

    ctx.save()
    ctx.lineWidth = 2
    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha.toFixed(3)})` // 金色
    ctx.beginPath()
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
    ctx.stroke()

    // 中心小点
    ctx.fillStyle = `rgba(255, 215, 0, ${Math.max(0.2, alpha).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(screenX, screenY, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  return { targetX, targetY, setTarget, clearTarget, stepToward, drawMarker }
}


