<template>
  <div class="canvas-container" ref="container">
    <canvas ref="backgroundCanvas" id="background"></canvas>
    <canvas ref="animationCanvas" id="animation"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useKeyboard } from '@/composables/useKeyboard'
import { useSprites } from '@/composables/useSprites'
import { useCamera } from '@/composables/useCamera'
import { useBackground } from '@/composables/useBackground'
import { useCollision } from '@/composables/useCollision'
import { useRafLoop } from '@/composables/useRafLoop'
import { setupDprCanvas } from '@/composables/useDprCanvas'
import { useClickMove } from '@/composables/useClickMove'
import { FRAME_RATE, IMAGE_WIDTH, IMAGE_HEIGHT, MOVE_SPEED, HORIZONTAL_OFFSET_RATIO } from '@/config/cat'

const router = useRouter()

// Canvas 引用
const container = ref<HTMLDivElement>()
const backgroundCanvas = ref<HTMLCanvasElement>()
const animationCanvas = ref<HTMLCanvasElement>()

let bgCtx: CanvasRenderingContext2D | null = null
let ctx: CanvasRenderingContext2D | null = null

// 组合模块
const { keyState } = useKeyboard()
const { images, preload, getImageIndex, getFrames } = useSprites()
const camera = useCamera()
const { bgImg, loadBackground, drawBackground } = useBackground()
const { isCollideRoadTop } = useCollision()
const { targetX, targetY, setTarget, stepToward, drawMarker } = useClickMove()

// 角色状态
let posX = 0
let posY = 0
let currentDirection: 'left' | 'right' = 'right'
let currentFrameIndex = 0

// 动画循环控制
let frameAccumulator = 0
const frameInterval = 1000 / FRAME_RATE

function resizeCanvas() {
  if (!backgroundCanvas.value || !animationCanvas.value) return

  const vw = window.innerWidth
  const vh = window.innerHeight
  camera.setViewportSize(vw, vh)
  if (bgCtx) setupDprCanvas(backgroundCanvas.value, bgCtx, vw, vh)
  if (ctx) setupDprCanvas(animationCanvas.value, ctx, vw, vh)

  if (bgImg.value) {
    camera.calculateWorldSize(bgImg.value)
    drawBackground(
      bgCtx!,
      backgroundCanvas.value.width,
      backgroundCanvas.value.height,
      camera.viewportWidth.value,
      camera.viewportHeight.value,
      camera.viewportX.value,
      camera.viewportY.value,
      camera.worldWidth.value,
      camera.worldHeight.value,
    )
  }
}

function updatePosition(): boolean {
  let moving = false
  let newDirection = currentDirection

  // 鼠标点击移动优先，其次键盘
  if (pendingDeltaMs > 0) {
    const res = stepToward(posX, posY, MOVE_SPEED * 60, pendingDeltaMs)
    if (res.moving) {
      moving = true
      posX = res.x
      posY = res.y
      newDirection = res.direction
    }
  }

  if (!moving) {
    if (keyState.value.ArrowUp) { posY -= MOVE_SPEED; moving = true }
    if (keyState.value.ArrowDown) { posY += MOVE_SPEED; moving = true }
    if (keyState.value.ArrowLeft) { posX -= MOVE_SPEED; newDirection = 'left'; moving = true }
    if (keyState.value.ArrowRight) { posX += MOVE_SPEED; newDirection = 'right'; moving = true }
  }

  if (newDirection !== currentDirection) {
    currentDirection = newDirection
    currentFrameIndex = 0
  }

  // clamp 到世界范围
  posX = Math.max(IMAGE_WIDTH / 2, Math.min(camera.worldWidth.value - IMAGE_WIDTH / 2, posX))
  posY = Math.max(IMAGE_HEIGHT / 2, Math.min(camera.worldHeight.value - IMAGE_HEIGHT / 2, posY))

  camera.follow(posX, posY)
  return moving
}

let pendingDeltaMs = 0
function renderOnce(delta: number, now: number) {
  if (!ctx || !animationCanvas.value) return

  frameAccumulator += delta
  pendingDeltaMs = delta

  ctx.clearRect(0, 0, animationCanvas.value.width, animationCanvas.value.height)

  // 帧推进（基于目标帧率）
  const currentFrames = getFrames(currentDirection)
  const shouldAdvance = frameAccumulator >= frameInterval
  if (shouldAdvance) {
    frameAccumulator -= frameInterval
  }

  const horizontalOffset = camera.viewportWidth.value * HORIZONTAL_OFFSET_RATIO
  const catViewX = posX - camera.viewportX.value + horizontalOffset
  const catViewY = posY - camera.viewportY.value

  const imageIndex = getImageIndex(currentDirection, currentFrameIndex)
  const sprite = images.value[imageIndex]
  if (sprite) {
    ctx.drawImage(
      sprite,
      catViewX - IMAGE_WIDTH / 2,
      catViewY - IMAGE_HEIGHT / 2,
      IMAGE_WIDTH,
      IMAGE_HEIGHT,
    )
  }

  // 绘制点击标记（若存在目标）
  if (targetX.value != null && targetY.value != null) {
    drawMarker(
      ctx,
      targetX.value - camera.viewportX.value + horizontalOffset,
      targetY.value - camera.viewportY.value,
      now,
    )
  }

  const isMoving = updatePosition()
  if (isMoving && shouldAdvance) {
    currentFrameIndex = (currentFrameIndex + 1) % currentFrames.length
  }

  // 碰撞检测与背景刷新
  const catTop = posY - IMAGE_HEIGHT / 2
  const catBottom = posY + IMAGE_HEIGHT / 2
  if (
    isCollideRoadTop(
      bgImg.value,
      camera.viewportHeight.value,
      camera.worldHeight.value,
      catTop,
      catBottom,
    )
  ) {
    router.push('/main-scene')
  }

  if (bgCtx && bgImg.value) {
    drawBackground(
      bgCtx,
      backgroundCanvas.value!.width,
      backgroundCanvas.value!.height,
      camera.viewportWidth.value,
      camera.viewportHeight.value,
      camera.viewportX.value,
      camera.viewportY.value,
      camera.worldWidth.value,
      camera.worldHeight.value,
    )
  }

}

const { start, stop } = useRafLoop((delta, now) => {
  renderOnce(delta, now)
})

onMounted(async () => {
  if (!backgroundCanvas.value || !animationCanvas.value) return

  bgCtx = backgroundCanvas.value.getContext('2d')
  ctx = animationCanvas.value.getContext('2d')
  if (!bgCtx || !ctx) return

  resizeCanvas()

  const img = await loadBackground()
  camera.calculateWorldSize(img)
  // 初始位置放到世界中心
  posX = camera.worldWidth.value / 2
  posY = camera.worldHeight.value / 2

  await preload()
  start()

  window.addEventListener('resize', resizeCanvas)
  // 点击事件：将屏幕坐标转换为世界坐标
  animationCanvas.value.addEventListener('click', (e) => {
    const rect = animationCanvas.value!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const worldX = sx + camera.viewportX.value - camera.viewportWidth.value * HORIZONTAL_OFFSET_RATIO
    const worldY = sy + camera.viewportY.value
    setTarget(worldX, worldY, performance.now())
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  stop()
})
</script>

<style scoped>
.canvas-container {
  position: relative;
  height: 100vh;
  width: 100vw;
  background: #000;
  overflow: hidden;
}

#background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

#animation {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
}
</style>
