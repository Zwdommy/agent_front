<template>
  <div class="finance-scene-container">
    <canvas ref="backgroundCanvas" id="financeBg"></canvas>
    <canvas ref="animationCanvas" id="financeCatCanvas" @click="handleCanvasClick"></canvas>
    
    <!-- AI对话气泡 -->
    <div class="chat-bubble" ref="chatBubble" :class="{ active: showChatBubble }">
      <div class="bubble-content" ref="chatMessages">
        <div class="message system">
          <div class="message-content">
            <p>欢迎来到财务中心！我是财务助手，有什么财务问题需要咨询吗？</p>
          </div>
        </div>
      </div>
      <div class="bubble-input">
        <textarea 
          ref="userInput" 
          v-model="currentMessage"
          placeholder="输入你的财务问题..." 
          rows="2"
          @keypress="handleKeyPress"
        ></textarea>
        <button @click="sendMessage">发送</button>
      </div>
      <div class="bubble-arrow"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Canvas引用
const backgroundCanvas = ref<HTMLCanvasElement>()
const animationCanvas = ref<HTMLCanvasElement>()
const chatBubble = ref<HTMLDivElement>()
const chatMessages = ref<HTMLDivElement>()
const userInput = ref<HTMLTextAreaElement>()

// 对话系统
const showChatBubble = ref(false)
const currentMessage = ref('')

// Canvas上下文
let bgCtx: CanvasRenderingContext2D | null = null
let catCtx: CanvasRenderingContext2D | null = null
let bgImg: HTMLImageElement

// 小猫动画相关
const frameRate = 24
const rightFrames = [0, 2, 4, 6, 8, 10, 12]
const leftFrames = [1, 3, 5, 7, 9, 11, 13]

let currentDirection = 'right'
let currentFrameIndex = 0
const images: HTMLImageElement[] = []
let loaded = 0
let posX = 0
let posY = 0
const imgW = 100  // 小猫尺寸
const imgH = 100
const speed = 32
const keyState = { 
  ArrowUp: false, 
  ArrowDown: false, 
  ArrowLeft: false, 
  ArrowRight: false
}

// 视窗系统
let viewportX = 0
let viewportY = 0
let worldWidth = 0
let worldHeight = 0
let viewportWidth = 0
let viewportHeight = 0

// 点击移动相关
let targetX = 0
let targetY = 0
let isMovingToTarget = false
const moveSpeed = 4

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
  if (catCtx) {
    catCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  if (bgImg && bgImg.complete) {
    calculateWorldSize()
    drawBackground()
  }
}

const calculateWorldSize = () => {
  if (!bgImg) return
  
  // 财务场景使用合适的缩放系数
  const scale = window.innerHeight / bgImg.height * 1.0
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

  const scale = window.innerHeight / bgImg.height * 1.0
  const drawWidth = bgImg.width * scale
  const drawHeight = bgImg.height * scale

  const bgWorldX = (worldWidth - drawWidth) / 2
  const bgWorldY = (worldHeight - drawHeight) / 2

  const bgViewX = bgWorldX - viewportX
  const bgViewY = bgWorldY - viewportY

  bgCtx.drawImage(bgImg, bgViewX, bgViewY, drawWidth, drawHeight)
}

const drawCat = () => {
  if (!catCtx) return
  
  catCtx.clearRect(0, 0, animationCanvas.value!.width, animationCanvas.value!.height)

  // 绘制小猫
  const currentFrames = currentDirection === 'right' ? rightFrames : leftFrames
  const imageIndex = currentDirection === 'right' ? currentFrameIndex : rightFrames.length + currentFrameIndex

  const catViewX = posX - viewportX
  const catViewY = posY - viewportY

  if (images[imageIndex]) {
    catCtx.drawImage(
      images[imageIndex],
      catViewX - imgW/2,
      catViewY - imgH/2,
      imgW,
      imgH
    )
  }

  // 更新AI对话气泡位置，跟随小猫右上角
  updateChatBubblePosition(catViewX, catViewY)
}

const updateChatBubblePosition = (catViewX: number, catViewY: number) => {
  if (!chatBubble.value || !animationCanvas.value) return
  
  const rect = animationCanvas.value.getBoundingClientRect()
  const bubbleLeft = rect.left + window.scrollX + (catViewX + imgW/2) - 12
  const bubbleTop = rect.top + window.scrollY + (catViewY - imgH/2) - 120
  
  chatBubble.value.style.left = bubbleLeft + 'px'
  chatBubble.value.style.top = bubbleTop + 'px'
}

const updatePosition = () => {
  let moving = false
  let newDirection = currentDirection

  // 键盘移动优先级更高，会中断点击移动
  const keyboardMoving = keyState.ArrowUp || keyState.ArrowDown || keyState.ArrowLeft || keyState.ArrowRight
  
  if (keyboardMoving) {
    isMovingToTarget = false // 停止点击移动
    
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
  } else if (isMovingToTarget) {
    // 点击移动逻辑
    const deltaX = targetX - posX
    const deltaY = targetY - posY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    if (distance > moveSpeed) {
      // 继续移动到目标位置
      const moveX = (deltaX / distance) * moveSpeed
      const moveY = (deltaY / distance) * moveSpeed
      
      posX += moveX
      posY += moveY
      
      // 根据移动方向更新小猫朝向
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        newDirection = deltaX > 0 ? 'right' : 'left'
      }
      
      moving = true
    } else {
      // 到达目标位置
      posX = targetX
      posY = targetY
      isMovingToTarget = false
    }
  }

  if (newDirection !== currentDirection) {
    currentDirection = newDirection
    currentFrameIndex = 0
  }

  // 限制小猫在世界边界内
  posX = Math.max(imgW/2, Math.min(worldWidth - imgW/2, posX))
  posY = Math.max(imgH/2, Math.min(worldHeight - imgH/2, posY))

  // 更新视窗位置，让小猫始终在视窗中心
  viewportX = posX - viewportWidth / 2
  viewportY = posY - viewportHeight / 2

  // 限制视窗不超出世界边界
  viewportX = Math.max(0, Math.min(worldWidth - viewportWidth, viewportX))
  viewportY = Math.max(0, Math.min(worldHeight - viewportHeight, viewportY))

  if (moving) {
    currentFrameIndex = (currentFrameIndex + 1) % rightFrames.length
    if (keyboardMoving) {
      console.log(`财务场景 - 小猫位置: X=${Math.round(posX)}, Y=${Math.round(posY)}`)
    }
  }

  return moving
}

const checkFinanceCollision = () => {
  // 财务场景的特殊碰撞检测区域
  // 左上角区域：返回主场景的传送门
  
  // 计算左上角区域的坐标（基于世界尺寸的相对位置）
  const exitAreaWidth = 200   // 区域宽度
  const exitAreaHeight = 200  // 区域高度
  const margin = 50          // 距离边界的边距
  
  // 左上角区域坐标
  const exitX1 = margin
  const exitX2 = margin + exitAreaWidth
  const exitY1 = margin
  const exitY2 = margin + exitAreaHeight

  // 中心偏左下区域：返回主场景的传送门 (小猫出生坐标左移100px，下移100px)
  const centerAreaWidth = 150
  const centerAreaHeight = 150
  const centerX1 = worldWidth / 2 - 150
  const centerX2 = centerX1 + centerAreaWidth
  const centerY1 = worldHeight / 2 + 150
  const centerY2 = centerY1 + centerAreaHeight

  // 调试信息 - 显示小猫位置和区域坐标
  if (keyState.ArrowUp || keyState.ArrowDown || keyState.ArrowLeft || keyState.ArrowRight) {
    console.log(`财务场景 - 小猫位置: X=${Math.round(posX)}, Y=${Math.round(posY)}`)
    console.log(`左上角返回区域: X(${exitX1}~${exitX2}), Y(${exitY1}~${exitY2})`)
    console.log(`中心偏左下返回区域: X(${Math.round(centerX1)}~${Math.round(centerX2)}), Y(${Math.round(centerY1)}~${Math.round(centerY2)})`)
  }

  // 检测是否在左上角返回主场景的区域内
  if (posX >= exitX1 && posX <= exitX2 && posY >= exitY1 && posY <= exitY2) {
    console.log('🚪 检测到左上角传送门！准备返回主场景')
    router.push('/main-scene')
  }

  // 检测是否在中心偏左下返回主场景的区域内
  if (posX >= centerX1 && posX <= centerX2 && posY >= centerY1 && posY <= centerY2) {
    console.log('💼 检测到中心传送门！准备返回主场景')
    router.push('/main-scene')
  }
}

const drawFrame = () => {
  drawBackground()
  drawCat()
  updatePosition()
  checkFinanceCollision()

  setTimeout(() => {
    animationId = requestAnimationFrame(drawFrame)
  }, 1000 / frameRate)
}

// 鼠标点击事件处理
const handleCanvasClick = (e: MouseEvent) => {
  if (!animationCanvas.value) return
  
  const rect = animationCanvas.value.getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const clickY = e.clientY - rect.top
  
  // 将点击坐标转换为世界坐标
  const worldClickX = clickX + viewportX
  const worldClickY = clickY + viewportY
  
  // 设置目标位置
  targetX = worldClickX
  targetY = worldClickY
  
  // 限制目标位置在世界边界内
  targetX = Math.max(imgW/2, Math.min(worldWidth - imgW/2, targetX))
  targetY = Math.max(imgH/2, Math.min(worldHeight - imgH/2, targetY))
  
  // 开始移动到目标位置
  isMovingToTarget = true
  
  console.log(`财务场景 - 点击移动到: X=${Math.round(targetX)}, Y=${Math.round(targetY)}`)
}

// 键盘事件处理
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key in keyState) {
    keyState[e.key as keyof typeof keyState] = true
  }

  // F键弹出/关闭AI对话气泡
  if (e.key === 'f' || e.key === 'F') {
    showChatBubble.value = !showChatBubble.value
    if (showChatBubble.value) {
      nextTick(() => {
        userInput.value?.focus()
      })
    }
  }
  
  // ESC关闭对话气泡
  if (e.key === 'Escape') {
    showChatBubble.value = false
  }

  // H键显示调试帮助
  if (e.key === 'h' || e.key === 'H') {
    console.log(`
🛠️ === 财务场景调试帮助 ===

📍 基本操作:
  • 方向键: 移动小猫
  • 鼠标点击: 点击移动
  • F键: 弹出/关闭AI对话气泡
  • ESC键: 关闭对话气泡

📝 当前状态:
  • 小猫位置: X=${Math.round(posX)}, Y=${Math.round(posY)}
  • 世界尺寸: ${Math.round(worldWidth)} x ${Math.round(worldHeight)}

💡 这是财务场景，可以在这里进行财务相关咨询!
    `)
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key in keyState) {
    keyState[e.key as keyof typeof keyState] = false
  }
}

// 对话系统
const handleKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const sendMessage = async () => {
  const message = currentMessage.value.trim()
  if (message === '') return

  addMessage('user', message)
  currentMessage.value = ''
  addLoadingIndicator()

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message })
    })

    if (!response.ok) throw new Error('网络响应错误')
    
    const data = await response.json()
    removeLoadingIndicator()
    addMessage('assistant', data.message)
    scrollToBottom()
  } catch (error) {
    removeLoadingIndicator()
    addMessage('system', 'AI财务服务暂时不可用，请稍后再试。')
  }
}

const addMessage = (role: string, content: string) => {
  if (!chatMessages.value) return
  
  const messageDiv = document.createElement('div')
  messageDiv.className = 'message ' + role
  
  const contentDiv = document.createElement('div')
  contentDiv.className = 'message-content'
  
  const paragraphs = content.split('\n')
  paragraphs.forEach(paragraph => {
    if (paragraph.trim() !== '') {
      const p = document.createElement('p')
      p.textContent = paragraph
      contentDiv.appendChild(p)
    }
  })
  
  messageDiv.appendChild(contentDiv)
  chatMessages.value.appendChild(messageDiv)
  scrollToBottom()
}

const addLoadingIndicator = () => {
  if (!chatMessages.value) return
  
  const loadingDiv = document.createElement('div')
  loadingDiv.className = 'message assistant loading'
  loadingDiv.id = 'loadingIndicator'
  
  const contentDiv = document.createElement('div')
  contentDiv.className = 'message-content'
  contentDiv.textContent = '财务助手思考中...'
  
  loadingDiv.appendChild(contentDiv)
  chatMessages.value.appendChild(loadingDiv)
  scrollToBottom()
}

const removeLoadingIndicator = () => {
  const loadingIndicator = document.getElementById('loadingIndicator')
  if (loadingIndicator) loadingIndicator.remove()
}

const scrollToBottom = () => {
  if (chatMessages.value) {
    chatMessages.value.scrollTop = chatMessages.value.scrollHeight
  }
}

// 预加载图片
const allFrames = [...rightFrames, ...leftFrames]
const preloadImages = () => {
  for (let i = 0; i < allFrames.length; i++) {
    const img = new Image()
    import(`@/assets/static/170-261 dog lop/cat-run_${allFrames[i]}.png`).then(module => {
      img.src = module.default
      img.onload = () => {
        loaded++
        checkAllLoaded()
      }
    }).catch(() => {
      console.error(`Failed to load image: cat-run_${allFrames[i]}.png`)
    })
    images.push(img)
  }
}

const initBackgroundImage = () => {
  bgImg = new Image()
  import('@/assets/static/account_scence/site-1.png').then(module => {
    bgImg.src = module.default
    bgImg.onload = () => {
      console.log('✅ 财务场景背景图片加载完成')
      checkAllLoaded()
    }
  }).catch(() => {
    console.error('❌ Failed to load site-1.png')
  })
}

// 检查所有资源是否加载完成
const checkAllLoaded = () => {
  const catFramesLoaded = loaded === allFrames.length
  const backgroundLoaded = bgImg && bgImg.complete
  
  if (catFramesLoaded && backgroundLoaded) {
    console.log('🎉 财务场景所有资源加载完成！开始游戏...')
    start()
  }
}

const start = () => {
  resizeCanvas()
  calculateWorldSize()
  
  // 初始化小猫在世界中心
  posX = worldWidth / 2
  posY = worldHeight / 2
  
  window.addEventListener('resize', () => {
    resizeCanvas()
    calculateWorldSize()
    // 保证小猫在resize后仍在世界边界内
    posX = Math.max(imgW/2, Math.min(worldWidth - imgW/2, posX))
    posY = Math.max(imgH/2, Math.min(worldHeight - imgH/2, posY))
  })
  
  drawFrame()
}

onMounted(() => {
  if (!backgroundCanvas.value || !animationCanvas.value) return
  
  bgCtx = backgroundCanvas.value.getContext('2d')
  catCtx = animationCanvas.value.getContext('2d')
  
  if (!bgCtx || !catCtx) {
    console.error('Failed to get canvas context')
    return
  }

  // 初始化
  preloadImages()
  initBackgroundImage()

  // 事件监听
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  // 清理事件监听器和动画
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.finance-scene-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #0a1a0a;
  overflow: hidden;
}

#financeBg, #financeCatCanvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: block;
}

#financeBg { 
  z-index: 0; 
}

#financeCatCanvas { 
  z-index: 1; 
  cursor: crosshair;
}

/* AI对话气泡样式 */
.chat-bubble {
  position: absolute;
  min-width: 220px;
  max-width: 320px;
  background: #f0fff0;
  border: 2px solid #90ee90;
  border-radius: 18px 18px 18px 0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  padding: 12px 16px 8px 16px;
  z-index: 1000;
  display: none;
  font-size: 15px;
  color: #2e7d32;
  transition: left 0.1s, top 0.1s;
  font-family: Arial, sans-serif;
}

.chat-bubble.active { 
  display: block; 
}

.chat-bubble .bubble-arrow {
  position: absolute;
  left: 18px;
  bottom: -16px;
  width: 0; 
  height: 0;
  border-top: 16px solid #f0fff0;
  border-left: 16px solid transparent;
  border-right: 16px solid transparent;
  z-index: 1001;
}

.chat-bubble .bubble-content {
  max-height: 120px;
  overflow-y: auto;
  margin-bottom: 8px;
  word-break: break-all;
}

.chat-bubble .bubble-input {
  display: flex;
  gap: 6px;
}

.chat-bubble textarea {
  flex: 1;
  border: 1px solid #90ee90;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 14px;
  resize: none;
  background: #f9fff9;
  color: #2e7d32;
  outline: none;
  font-family: Arial, sans-serif;
}

.chat-bubble button {
  background: #90ee90;
  color: #2e7d32;
  border: none;
  border-radius: 6px;
  padding: 0 14px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  font-family: Arial, sans-serif;
}

.chat-bubble button:hover {
  background: #7dd87d;
}

.message {
  margin-bottom: 8px;
}

.message-content p {
  margin: 4px 0;
}
</style> 