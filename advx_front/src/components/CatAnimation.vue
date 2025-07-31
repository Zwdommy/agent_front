<template>
  <div class="canvas-container" ref="container">
    <canvas ref="backgroundCanvas" id="background"></canvas>
    <canvas ref="animationCanvas" id="animation"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Canvas引用
const container = ref<HTMLDivElement>()
const backgroundCanvas = ref<HTMLCanvasElement>()
const animationCanvas = ref<HTMLCanvasElement>()

// 背景相关
let bgCtx: CanvasRenderingContext2D | null = null
let bgImg: HTMLImageElement

// 视窗系统
let viewportX = 0
let viewportY = 0
let worldWidth = 0
let worldHeight = 0
let viewportWidth = 0
let viewportHeight = 0

// 小猫动画相关
const frameRate = 24
const rightFrames = [0, 2, 4, 6, 8, 10, 12]
const leftFrames = [1, 3, 5, 7, 9, 11, 13]

let currentDirection = 'right'
let currentFrameIndex = 0
const images: HTMLImageElement[] = []
let loaded = 0
let ctx: CanvasRenderingContext2D | null = null
let posX = 0
let posY = 0
const imgW = 140
const imgH = 140
const speed = 32
const keyState = { 
  ArrowUp: false, 
  ArrowDown: false, 
  ArrowLeft: false, 
  ArrowRight: false 
}

// 动画控制
let animationId = 0

const resizeCanvas = () => {
  if (!backgroundCanvas.value || !animationCanvas.value) return
  
  const vw = window.innerWidth
  const vh = window.innerHeight
  const dpr = window.devicePixelRatio || 1

  backgroundCanvas.value.width = vw * dpr
  backgroundCanvas.value.height = vh * dpr
  animationCanvas.value.width = vw * dpr
  animationCanvas.value.height = vh * dpr

  backgroundCanvas.value.style.width = vw + 'px'
  backgroundCanvas.value.style.height = vh + 'px'
  animationCanvas.value.style.width = vw + 'px'
  animationCanvas.value.style.height = vh + 'px'

  viewportWidth = vw
  viewportHeight = vh

  if (bgCtx) {
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  if (bgImg && bgImg.complete) {
    calculateWorldSize()
    drawBackground()
  }
}

const calculateWorldSize = () => {
  if (!bgImg) return
  
  const scale = viewportHeight / bgImg.height * 7
  worldWidth = bgImg.width * scale
  worldHeight = bgImg.height * scale

  if (viewportX === 0 && viewportY === 0) {
    viewportX = worldWidth / 2 - viewportWidth / 2
    viewportY = worldHeight / 2 - viewportHeight / 2
  }
}

const drawBackground = () => {
  if (!bgCtx || !bgImg) return
  
  bgCtx.clearRect(0, 0, backgroundCanvas.value!.width, backgroundCanvas.value!.height)

  const scale = viewportHeight / bgImg.height * 7
  const drawWidth = bgImg.width * scale
  const drawHeight = bgImg.height * scale

  const bgWorldX = (worldWidth - drawWidth) / 2
  const bgWorldY = (worldHeight - drawHeight) / 2

  // 添加水平偏移量让场景居中显示
  const horizontalOffset = viewportWidth * 0.13 // 向右偏移18%的视窗宽度，稍微往左移动

  const bgViewX = bgWorldX - viewportX + horizontalOffset
  const bgViewY = bgWorldY - viewportY

  bgCtx.drawImage(bgImg, bgViewX, bgViewY, drawWidth, drawHeight)
}

const updatePosition = () => {
  let moving = false
  let newDirection = currentDirection

  if (keyState.ArrowUp) {
    posY -= speed
    moving = true
  }
  if (keyState.ArrowDown) {
    posY += speed
    moving = true
  }
  if (keyState.ArrowLeft) {
    posX -= speed
    newDirection = 'left'
    moving = true
  }
  if (keyState.ArrowRight) {
    posX += speed
    newDirection = 'right'
    moving = true
  }

  if (newDirection !== currentDirection) {
    currentDirection = newDirection
    currentFrameIndex = 0
  }

  posX = Math.max(imgW/2, Math.min(worldWidth - imgW/2, posX))
  posY = Math.max(imgH/2, Math.min(worldHeight - imgH/2, posY))

  viewportX = posX - viewportWidth / 2
  viewportY = posY - viewportHeight / 2

  viewportX = Math.max(0, Math.min(worldWidth - viewportWidth, viewportX))
  viewportY = Math.max(0, Math.min(worldHeight - viewportHeight, viewportY))

  // 输出小猫位置坐标
  if (moving) {
    console.log(`小猫位置: X=${Math.round(posX)}, Y=${Math.round(posY)}`)
  }

  return moving
}

const checkRoadTopCollision = () => {
  if (!bgImg) return
  
  const scale = viewportHeight / bgImg.height * 7
  const drawHeight = bgImg.height * scale
  const bgWorldY = (worldHeight - drawHeight) / 2

  const roadTopY = bgWorldY
  const roadTopHeight = drawHeight / 18
  const roadTopBottomY = roadTopY + roadTopHeight

  const catTop = posY - imgH/2
  const catBottom = posY + imgH/2

  if (catBottom >= roadTopY && catTop <= roadTopBottomY) {
    console.log('检测到碰撞！跳转到main-scene')
    // 这里可以使用Vue Router进行页面跳转
    router.push('/main-scene')
  }
}

const drawFrame = () => {
  if (!ctx) return
  
  ctx.clearRect(0, 0, animationCanvas.value!.width, animationCanvas.value!.height)

  const currentFrames = currentDirection === 'right' ? rightFrames : leftFrames
  const imageIndex = currentDirection === 'right' ? currentFrameIndex : rightFrames.length + currentFrameIndex

  // 添加同样的水平偏移量让小猫与背景同步
  const horizontalOffset = viewportWidth * 0.13

  const catViewX = posX - viewportX + horizontalOffset
  const catViewY = posY - viewportY

  if (images[imageIndex]) {
    ctx.drawImage(
      images[imageIndex],
      catViewX - imgW/2,
      catViewY - imgH/2,
      imgW,
      imgH
    )
  }

  const isMoving = updatePosition()
  if (isMoving) {
    currentFrameIndex = (currentFrameIndex + 1) % currentFrames.length
  }

  checkRoadTopCollision()
  drawBackground()

  setTimeout(() => {
    animationId = requestAnimationFrame(drawFrame)
  }, 1000 / frameRate)
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key in keyState) {
    keyState[e.key as keyof typeof keyState] = true
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key in keyState) {
    keyState[e.key as keyof typeof keyState] = false
  }
}

const preloadImages = () => {
  const allFrames = [...rightFrames, ...leftFrames]
  
  for (let i = 0; i < allFrames.length; i++) {
    const img = new Image()
    // 使用动态import来获取正确的资源路径
    import(`@/assets/static/170-261 dog lop/cat-run_${allFrames[i]}.png`).then(module => {
      img.src = module.default
      img.onload = () => {
        loaded++
        if (loaded === allFrames.length) {
          requestAnimationFrame(drawFrame)
        }
      }
    }).catch(() => {
      console.error(`Failed to load image: cat-run_${allFrames[i]}.png`)
    })
    images.push(img)
  }
}

const initBackgroundImage = () => {
  bgImg = new Image()
  // 使用动态import来获取正确的资源路径
  import('@/assets/static/background/road.png').then(module => {
    bgImg.src = module.default
    bgImg.onload = () => {
      resizeCanvas()
      posX = worldWidth / 2
      posY = worldHeight / 2
    }
  }).catch(() => {
    console.error('Failed to load background image: road.png')
  })
}

onMounted(() => {
  if (!backgroundCanvas.value || !animationCanvas.value) return
  
  bgCtx = backgroundCanvas.value.getContext('2d')
  ctx = animationCanvas.value.getContext('2d')
  
  if (!bgCtx || !ctx) {
    console.error('Failed to get canvas context')
    return
  }

  // 初始化
  resizeCanvas()
  initBackgroundImage()
  preloadImages()

  // 事件监听
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  // 清理事件监听器和动画
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
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
