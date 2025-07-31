<template>
  <div class="main-scene-container">
    <canvas ref="backgroundCanvas" id="mainBg"></canvas>
    <canvas ref="animationCanvas" id="catCanvas" @click="handleCanvasClick"></canvas>
    
    <!-- AI对话气泡 -->
    <div class="chat-bubble" ref="chatBubble" :class="{ active: showChatBubble }">
      <div class="bubble-content" ref="chatMessages">
        <div class="message system">
          <div class="message-content">
            <p>您好！我是小珂喵AI，有什么想问我的吗？</p>
          </div>
        </div>
      </div>
      <div class="bubble-input">
        <textarea 
          ref="userInput" 
          v-model="currentMessage"
          placeholder="输入你的问题..." 
          rows="2"
          @keypress="handleKeyPress"
        ></textarea>
        <button @click="sendMessage">发送</button>
      </div>
      <div class="bubble-arrow"></div>
    </div>

    <!-- CommonAgent对话弹窗 -->
    <div v-if="showAgentDialog" class="dialog-overlay" @click="closeAgentDialog">
      <div class="dialog-main" @click.stop>
        <!-- 左侧角色区域 -->
        <div class="dialog-character">
          <!-- 背景会通过CSS设置 -->
        </div>
        
        <!-- 右侧对话区域 -->
        <div class="dialog-chat" :class="{ 'debug-mode': debugMode }">
          <!-- 聊天室ID信息 -->
          <div class="chat-room-id">{{ chatId }}</div>
          
          <!-- 聊天消息区域（上半部分） -->
          <div class="chat-messages-area">
            <div class="chat-messages" ref="chatMessagesContainer">
              <!-- 欢迎消息 -->
              <div v-if="dialogChatMessages.length === 0" class="welcome-message">
                <div class="ai-message-wrapper">
                  <div class="avatar ai-avatar">🐱</div>
                  <div class="message-bubble ai-bubble">
                    <div class="message-content">您好！我是洛灵AI助手，有什么可以帮助您的吗？</div>
                    <div class="message-time">{{ formatTime(Date.now()) }}</div>
                  </div>
                </div>
              </div>
              
              <!-- 聊天消息列表 -->
              <div 
                v-for="message in dialogChatMessages" 
                :key="message.id" 
                :class="['message-wrapper', message.type === 'user' ? 'user-message-wrapper' : 'ai-message-wrapper']"
              >
                <!-- AI消息 -->
                <template v-if="message.type === 'assistant'">
                  <div class="avatar ai-avatar">🐱</div>
                  <div class="message-bubble ai-bubble">
                    <div class="message-content">{{ message.content }}</div>
                    <div class="message-time">{{ formatTime(message.timestamp) }}</div>
                  </div>
                </template>
                
                <!-- 用户消息 -->
                <template v-else>
                  <div class="message-bubble user-bubble">
                    <div class="message-content">{{ message.content }}</div>
                    <div class="message-time">{{ formatTime(message.timestamp) }}</div>
                  </div>
                  <div class="avatar user-avatar">😊</div>
                </template>
              </div>
              
              <!-- 流式输出指示器 -->
              <div v-if="isStreaming" class="ai-message-wrapper typing-indicator">
                <div class="avatar ai-avatar">🐱</div>
                <div class="message-bubble ai-bubble typing">
                  <div class="typing-animation">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 用户输入区域（下半部分） -->
          <div class="chat-input-area">
            <div class="input-container">
              <textarea
                v-model="chatInput"
                placeholder="请输入您的问题..."
                rows="1"
                @keypress="handleChatKeyPress"
                @input="adjustTextareaHeight"
                :disabled="isStreaming"
                class="chat-textarea"
                ref="messageInput"
              ></textarea>
              <button 
                v-if="isStreaming"
                @click="stopStreaming" 
                class="stop-button"
              >
                停止
              </button>
            </div>
          </div>
        </div>
        
        <!-- 关闭按钮 -->
        <button class="dialog-close" @click="closeAgentDialog">×</button>
        
        <!-- 弹窗底部图片 -->
        <div class="dialog-bottom-image"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { doChatSSE } from '@/api/chatApi'
import type { ChatRequest } from '@/api/types/chat'

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

// 弹窗系统
const showAgentDialog = ref(false)
const dialogImageLoaded = ref(false)

// 聊天系统
const dialogChatMessages = ref<Array<{id: number, content: string, type: 'user' | 'assistant', timestamp: number}>>([])
const chatInput = ref('')
const isStreaming = ref(false)
const chatId = ref('chat_' + Date.now())
let currentEventSource: EventSource | null = null

// 调试模式
const debugMode = ref(true)  // 默认开启调试模式，方便调整位置

// Canvas上下文
let bgCtx: CanvasRenderingContext2D | null = null
let catCtx: CanvasRenderingContext2D | null = null
let bgImg: HTMLImageElement

// CommonAgent角色相关 (有气泡)
let agentImg: HTMLImageElement
let agentChatImg: HTMLImageElement
let agentX = 400  // CommonAgent在世界坐标中的X位置 (可调整)
let agentY = 1300  // CommonAgent在世界坐标中的Y位置 (可调整)
const agentWidth = 150  // CommonAgent角色宽度
const agentHeight = 150 // CommonAgent角色高度
const chatBubbleWidth = 180  // 气泡宽度
const chatBubbleHeight = 100  // 气泡高度
let chatBubbleOffsetX = 70  // 气泡相对于CommonAgent的X偏移 (可调整)
let chatBubbleOffsetY = -60  // 气泡相对于CommonAgent的Y偏移 (可调整)
const interactionDistance = 120 // 显示气泡的距离阈值
let showAgentChat = false

// Email角色相关
let emailImg: HTMLImageElement
let emailX = 760  // Email在世界坐标中的X位置 (可调整)
let emailY = 615  // Email在世界坐标中的Y位置 (可调整)
const emailWidth = 150  // Email角色宽度
const emailHeight = 150 // Email角色高度

// NPC_01角色相关
let npc01Img: HTMLImageElement
let npc01X = 1000  // NPC_01在世界坐标中的X位置 (可调整)
let npc01Y = 1200  // NPC_01在世界坐标中的Y位置 (可调整)
const npc01Width = 150  // NPC_01角色宽度
const npc01Height = 150 // NPC_01角色高度

// NPC_02角色相关
let npc02Img: HTMLImageElement
let npc02X = 1200  // NPC_02在世界坐标中的X位置 (可调整)
let npc02Y = 695  // NPC_02在世界坐标中的Y位置 (可调整)
const npc02Width = 150  // NPC_02角色宽度
const npc02Height = 150 // NPC_02角色高度

// NPC_03角色相关
let npc03Img: HTMLImageElement
let npc03X = 1120  // NPC_03在世界坐标中的X位置 (可调整)
let npc03Y = 360  // NPC_03在世界坐标中的Y位置 (可调整)
const npc03Width = 150  // NPC_03角色宽度
const npc03Height = 150 // NPC_03角色高度

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
const imgW = 100  // 进一步缩小小猫尺寸
const imgH = 100
const speed = 32
const keyState = { 
  ArrowUp: false, 
  ArrowDown: false, 
  ArrowLeft: false, 
  ArrowRight: false,
  '1': false,
  '2': false,
  '3': false,
  '4': false
}

// 视窗系统
let viewportX = 0
let viewportY = 0
let worldWidth = 0
let worldHeight = 0
let viewportWidth = 0
let viewportHeight = 0

// 动画控制
let animationId = 0

// 点击移动相关
let targetX = 0
let targetY = 0
let isMovingToTarget = false
const moveSpeed = 4 // 移动到目标位置的速度

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
}

const calculateWorldSize = () => {
  if (!bgImg) return
  
  // 主场景使用较小的缩放系数
  const scale = window.innerHeight / bgImg.height * 2
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

  const scale = window.innerHeight / bgImg.height * 2
  const drawWidth = bgImg.width * scale
  const drawHeight = bgImg.height * scale

  const bgWorldX = (worldWidth - drawWidth) / 2
  const bgWorldY = (worldHeight - drawHeight) / 2

  const bgViewX = bgWorldX - viewportX
  const bgViewY = bgWorldY - viewportY

  // 裁剪2像素边框，与原HTML保持一致
  const borderSize = 2
  const cropX = borderSize
  const cropY = borderSize
  const cropWidth = bgImg.width - borderSize * 2
  const cropHeight = bgImg.height - borderSize * 2

  bgCtx.drawImage(
    bgImg,
    cropX, cropY, cropWidth, cropHeight,  // 源图片裁剪区域
    bgViewX, bgViewY, drawWidth, drawHeight  // 目标绘制区域
  )
}

const drawCat = () => {
  if (!catCtx) return
  
  catCtx.clearRect(0, 0, animationCanvas.value!.width, animationCanvas.value!.height)

  // 绘制所有NPC角色
  drawCommonAgent()
  drawEmail()
  drawNPC01()
  drawNPC02()
  drawNPC03()

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

// 绘制CommonAgent (有气泡)
const drawCommonAgent = () => {
  if (!catCtx || !agentImg) return
  
  const agentViewX = agentX - viewportX
  const agentViewY = agentY - viewportY
  
  if (agentViewX > -agentWidth && agentViewX < viewportWidth && 
      agentViewY > -agentHeight && agentViewY < viewportHeight) {
    
    catCtx.drawImage(
      agentImg,
      agentViewX - agentWidth/2,
      agentViewY - agentHeight/2,
      agentWidth,
      agentHeight
    )
    
    // 绘制气泡
    if (showAgentChat && agentChatImg) {
      catCtx.drawImage(
        agentChatImg,
        agentViewX + chatBubbleOffsetX,
        agentViewY + chatBubbleOffsetY,
        chatBubbleWidth,
        chatBubbleHeight
      )
    }
  }
}

// 绘制Email
const drawEmail = () => {
  if (!catCtx || !emailImg) return
  
  const emailViewX = emailX - viewportX
  const emailViewY = emailY - viewportY
  
  if (emailViewX > -emailWidth && emailViewX < viewportWidth && 
      emailViewY > -emailHeight && emailViewY < viewportHeight) {
    
    catCtx.drawImage(
      emailImg,
      emailViewX - emailWidth/2,
      emailViewY - emailHeight/2,
      emailWidth,
      emailHeight
    )
    

  }
}

// 绘制NPC_01
const drawNPC01 = () => {
  if (!catCtx || !npc01Img) return
  
  const npc01ViewX = npc01X - viewportX
  const npc01ViewY = npc01Y - viewportY
  
  if (npc01ViewX > -npc01Width && npc01ViewX < viewportWidth && 
      npc01ViewY > -npc01Height && npc01ViewY < viewportHeight) {
    
    catCtx.drawImage(
      npc01Img,
      npc01ViewX - npc01Width/2,
      npc01ViewY - npc01Height/2,
      npc01Width,
      npc01Height
    )
    

  }
}

// 绘制NPC_02
const drawNPC02 = () => {
  if (!catCtx || !npc02Img) return
  
  const npc02ViewX = npc02X - viewportX
  const npc02ViewY = npc02Y - viewportY
  
  if (npc02ViewX > -npc02Width && npc02ViewX < viewportWidth && 
      npc02ViewY > -npc02Height && npc02ViewY < viewportHeight) {
    
    catCtx.drawImage(
      npc02Img,
      npc02ViewX - npc02Width/2,
      npc02ViewY - npc02Height/2,
      npc02Width,
      npc02Height
    )
    

  }
}

// 绘制NPC_03
const drawNPC03 = () => {
  if (!catCtx || !npc03Img) return
  
  const npc03ViewX = npc03X - viewportX
  const npc03ViewY = npc03Y - viewportY
  
  if (npc03ViewX > -npc03Width && npc03ViewX < viewportWidth && 
      npc03ViewY > -npc03Height && npc03ViewY < viewportHeight) {
    
    catCtx.drawImage(
      npc03Img,
      npc03ViewX - npc03Width/2,
      npc03ViewY - npc03Height/2,
      npc03Width,
      npc03Height
    )
    

  }
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
      console.log(`小猫位置: X=${Math.round(posX)}, Y=${Math.round(posY)}`)
    }
  }

  // 检查小猫与CommonAgent的距离，决定是否显示气泡
  checkAgentInteraction()

  return moving
}

const checkAgentInteraction = () => {
  // 只检测CommonAgent的气泡交互，其他NPC没有气泡
  const deltaX = posX - agentX
  const deltaY = posY - agentY
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  
  // 根据距离决定是否显示气泡
  const shouldShowChat = distance <= interactionDistance
  
  if (shouldShowChat !== showAgentChat) {
    showAgentChat = shouldShowChat
    if (showAgentChat) {
      console.log(`🗨️ 接近CommonAgent，显示对话气泡 (距离: ${Math.round(distance)}px)`)
    } else {
      console.log(`👋 远离CommonAgent，隐藏对话气泡 (距离: ${Math.round(distance)}px)`)
    }
  }
}

const checkRectCollision = () => {
  // 检查小猫中心点是否在指定矩形内
  const rectX1 = 568, rectX2 = 726
  const rectY1 = 480, rectY2 = 672

  // 管理页面区域检测 (向上向右移动100px)
  const mgmtX1 = 1236 + 30, mgmtX2 = 1332 + 30
  const mgmtY1 = 956 , mgmtY2 = 1052

  // 咨询页面区域检测 (更靠右下的位置)
  const consultX1 = mgmtX2 + 50, consultX2 = consultX1 + (mgmtX2 - mgmtX1)
  const consultY1 = mgmtY2 + 100, consultY2 = consultY1 + (mgmtY2 - mgmtY1)

  // 产品页面区域检测 (指定左上角坐标 380, 800)
  const productX1 = 380, productX2 = productX1 + 100
  const productY1 = 800, productY2 = productY1 + 100

  // 宣传页面区域检测 (指定左上角坐标 10, 1000)
  const promotionX1 = 10, promotionX2 = promotionX1 + 100
  const promotionY1 = 1000, promotionY2 = promotionY1 + 100

  // 财务页面区域检测 (指定左上角坐标 1450, 330)
  const financeX1 = 1450, financeX2 = financeX1 + 100
  const financeY1 = 330, financeY2 = financeY1 + 100

  // 调试信息
  if (keyState.ArrowUp || keyState.ArrowDown || keyState.ArrowLeft || keyState.ArrowRight) {
    console.log(`小猫位置: X=${Math.round(posX)}, Y=${Math.round(posY)}`)
    console.log(`首页区域: X(${rectX1}~${rectX2}), Y(${rectY1}~${rectY2})`)
    console.log(`管理区域: X(${mgmtX1}~${mgmtX2}), Y(${mgmtY1}~${mgmtY2})`)
    console.log(`咨询区域: X(${consultX1}~${consultX2}), Y(${consultY1}~${consultY2})`)
    console.log(`产品区域: X(${productX1}~${productX2}), Y(${productY1}~${productY2})`)
    console.log(`宣传区域: X(${promotionX1}~${promotionX2}), Y(${promotionY1}~${promotionY2})`)
    console.log(`财务区域: X(${financeX1}~${financeX2}), Y(${financeY1}~${financeY2})`)
  }

  // 检测首页跳转区域
  if (posX >= rectX1 && posX <= rectX2 && posY >= rectY1 && posY <= rectY2) {
    console.log('检测到碰撞！准备跳转到首页')
    router.push('/cat-animation') // 跳转到小猫动画页面
  }

  // 检测管理页面跳转区域
  if (posX >= mgmtX1 && posX <= mgmtX2 && posY >= mgmtY1 && posY <= mgmtY2) {
    console.log('检测到碰撞！准备跳转到管理页面')
    router.push('/management') // 跳转到管理页面
  }

  // 检测咨询页面跳转区域
  if (posX >= consultX1 && posX <= consultX2 && posY >= consultY1 && posY <= consultY2) {
    console.log('💼 检测到咨询传送门！准备跳转到咨询页面')
    router.push('/consult') // 跳转到咨询页面
  }

  // 检测产品页面跳转区域
  if (posX >= productX1 && posX <= productX2 && posY >= productY1 && posY <= productY2) {
    console.log('🛍️ 检测到产品传送门！准备跳转到产品页面')
    router.push('/product') // 跳转到产品页面
  }

  // 检测宣传页面跳转区域
  if (posX >= promotionX1 && posX <= promotionX2 && posY >= promotionY1 && posY <= promotionY2) {
    console.log('📢 检测到宣传传送门！准备跳转到宣传页面')
    router.push('/promotion') // 跳转到宣传页面
  }

  // 检测财务页面跳转区域
  if (posX >= financeX1 && posX <= financeX2 && posY >= financeY1 && posY <= financeY2) {
    console.log('💰 检测到财务传送门！准备跳转到财务页面')
    router.push('/finance') // 跳转到财务页面
  }
}

const drawFrame = () => {
  drawBackground()
  drawCat()
  updatePosition()
  checkRectCollision()

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
  
  // 检测是否点击了CommonAgent
  const agentViewX = agentX - viewportX
  const agentViewY = agentY - viewportY
  
  // 检查点击是否在CommonAgent范围内
  if (clickX >= agentViewX - agentWidth/2 && 
      clickX <= agentViewX + agentWidth/2 &&
      clickY >= agentViewY - agentHeight/2 && 
      clickY <= agentViewY + agentHeight/2) {
    console.log('🎯 点击了CommonAgent，显示对话弹窗')
    showAgentDialog.value = true
    return
  }
  
  // 如果按住Ctrl键，显示坐标用于调试NPC位置
  if (e.ctrlKey) {
    console.log(`🎯 调试坐标: X=${Math.round(worldClickX)}, Y=${Math.round(worldClickY)}`)
    console.log(`📍 所有NPC当前位置:`)
    console.log(`  • CommonAgent: X=${agentX}, Y=${agentY}`)
    console.log(`  • Email: X=${emailX}, Y=${emailY}`)
    console.log(`  • NPC_01: X=${npc01X}, Y=${npc01Y}`)
    console.log(`  • NPC_02: X=${npc02X}, Y=${npc02Y}`)
    console.log(`  • NPC_03: X=${npc03X}, Y=${npc03Y}`)
    console.log(`💡 可以使用对应快捷键移动各个NPC到此位置`)
    return // 不移动小猫，只显示坐标
  }
  
  // 设置目标位置
  targetX = worldClickX
  targetY = worldClickY
  
  // 限制目标位置在世界边界内
  targetX = Math.max(imgW/2, Math.min(worldWidth - imgW/2, targetX))
  targetY = Math.max(imgH/2, Math.min(worldHeight - imgH/2, targetY))
  
  // 开始移动到目标位置
  isMovingToTarget = true
  
  console.log(`🐱 点击移动到: X=${Math.round(targetX)}, Y=${Math.round(targetY)}`)
}

// 弹窗控制方法
const closeAgentDialog = () => {
  showAgentDialog.value = false
  // 关闭弹窗时停止流式输出
  stopStreaming()
}

// 聊天相关方法
const chatMessagesContainer = ref<HTMLDivElement>()
const messageInput = ref<HTMLTextAreaElement>()

// 自动调整输入框高度
const adjustTextareaHeight = () => {
  if (!messageInput.value) return
  
  messageInput.value.style.height = 'auto'
  const scrollHeight = messageInput.value.scrollHeight
  const maxHeight = 120 // 最大高度
  messageInput.value.style.height = Math.min(scrollHeight, maxHeight) + 'px'
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 滚动弹窗聊天到底部
const scrollDialogToBottom = () => {
  nextTick(() => {
    if (chatMessagesContainer.value) {
      chatMessagesContainer.value.scrollTop = chatMessagesContainer.value.scrollHeight
    }
  })
}

// 添加弹窗聊天消息
const addDialogMessage = (content: string, type: 'user' | 'assistant') => {
  const message = {
    id: Date.now() + Math.random(),
    content,
    type,
    timestamp: Date.now()
  }
  dialogChatMessages.value.push(message)
  scrollDialogToBottom()
  return message
}

// 发送聊天消息
const sendChatMessage = () => {
  const message = chatInput.value.trim()
  if (!message || isStreaming.value) return

  // 添加用户消息
  addDialogMessage(message, 'user')
  
  // 清空输入框并重置高度
  chatInput.value = ''
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
  }
  
  // 创建聊天请求
  const chatRequest: ChatRequest = {
    message: message,
    chatId: chatId.value
  }
  
  // 开始流式聊天
  isStreaming.value = true
  
  // 添加AI消息占位符
  const aiMessage = addDialogMessage('', 'assistant')
  
  try {
    currentEventSource = doChatSSE(
      chatRequest,
      // 接收消息回调
      (data: string) => {
        aiMessage.content += data
        scrollDialogToBottom()
      },
      // 错误回调
      (error: Event) => {
        console.error('聊天流式输出错误:', error)
        aiMessage.content += '\n[连接中断，请重试]'
        isStreaming.value = false
        currentEventSource = null
      },
      // 完成回调
      () => {
        console.log('聊天流式输出完成')
        isStreaming.value = false
        currentEventSource = null
        scrollDialogToBottom()
      }
    )
  } catch (error) {
    console.error('发送聊天消息失败:', error)
    aiMessage.content = '抱歉，发送消息失败，请稍后重试。'
    isStreaming.value = false
  }
}

// 停止流式输出
const stopStreaming = () => {
  if (currentEventSource) {
    currentEventSource.close()
    currentEventSource = null
    isStreaming.value = false
    console.log('已停止流式输出')
  }
}

// 处理键盘事件
const handleChatKeyPress = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendChatMessage()
  }
}

// 预加载弹窗背景图片并获取尺寸
const preloadDialogBackground = () => {
  const img = new Image()
  import('@/assets/static/agent_scence/弹窗背景.png').then(module => {
    img.src = module.default
    img.onload = () => {
      // 动态设置CSS变量来适应图片尺寸
      const aspectRatio = img.width / img.height
      const maxWidth = Math.min(window.innerWidth * 0.95, 1400)
      const maxHeight = Math.min(window.innerHeight * 0.95, 900)
      
      let dialogWidth = img.width
      let dialogHeight = img.height
      
      // 如果图片太大，按比例缩放
      if (dialogWidth > maxWidth) {
        dialogWidth = maxWidth
        dialogHeight = dialogWidth / aspectRatio
      }
      
      if (dialogHeight > maxHeight) {
        dialogHeight = maxHeight
        dialogWidth = dialogHeight * aspectRatio
      }
      
      // 设置CSS变量
      document.documentElement.style.setProperty('--dialog-width', `${dialogWidth}px`)
      document.documentElement.style.setProperty('--dialog-height', `${dialogHeight}px`)
      
      // 计算并设置对话框宽度（约占弹窗宽度的44%）
      const chatWidth = Math.max(350, Math.min(500, dialogWidth * 0.44))
      document.documentElement.style.setProperty('--chat-width', `${chatWidth}px`)
      
      dialogImageLoaded.value = true
      console.log(`🖼️ 弹窗背景图片加载完成: ${img.width}×${img.height}px，显示尺寸: ${Math.round(dialogWidth)}×${Math.round(dialogHeight)}px，对话框宽度: ${Math.round(chatWidth)}px`)
    }
  }).catch(error => {
    console.error('❌ 弹窗背景图片加载失败:', error)
  })
}

// 键盘事件处理
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key in keyState) {
    keyState[e.key as keyof typeof keyState] = true
  }
  

  
  // 数字键处理
  if (['1', '2', '3', '4'].includes(e.key)) {
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
  
  // D键切换聊天弹窗调试模式
  if (e.key === 'd' || e.key === 'D') {
    debugMode.value = !debugMode.value
    console.log(`🔧 聊天弹窗调试模式: ${debugMode.value ? '开启' : '关闭'}`)
  }
  
  // ESC关闭对话气泡
  if (e.key === 'Escape') {
    showChatBubble.value = false
    showAgentDialog.value = false // 同时关闭弹窗
  }

  // H键显示调试帮助
  if (e.key === 'h' || e.key === 'H') {
    console.log(`
🛠️ === 多NPC位置调试帮助 ===

📍 查看坐标:
  • Ctrl + 点击: 显示世界坐标，用于定位NPC位置

🏃 移动各个NPC位置 (步长:10px):
  • Shift + ↑↓←→: 移动CommonAgent
  • 1 + ↑↓←→: 移动Email
  • 2 + ↑↓←→: 移动NPC_01
  • 3 + ↑↓←→: 移动NPC_02
  • 4 + ↑↓←→: 移动NPC_03

🗨️ 调整气泡位置 (仅CommonAgent):
  • Ctrl + ↑↓←→: 调整气泡相对于CommonAgent的偏移 (步长:5px)

📝 当前所有NPC位置:
  • CommonAgent: X=${agentX}, Y=${agentY} (有气泡)
  • Email: X=${emailX}, Y=${emailY}
  • NPC_01: X=${npc01X}, Y=${npc01Y}
  • NPC_02: X=${npc02X}, Y=${npc02Y}
  • NPC_03: X=${npc03X}, Y=${npc03Y}
  • 气泡偏移: X=${chatBubbleOffsetX}, Y=${chatBubbleOffsetY}
  • 小猫位置: X=${Math.round(posX)}, Y=${Math.round(posY)}

💡 提示: 调整完成后，记录控制台中显示的最终坐标值!

🗨️ === 聊天系统快捷键 ===
  • F键: 弹出/关闭AI聊天气泡
  • D键: 切换聊天弹窗调试模式 (显示/隐藏调试边框)
  • 点击CommonAgent: 打开聊天弹窗
  • ESC: 关闭所有弹窗
    `)
  }

  // CommonAgent位置调试快捷键 (按住Shift + 方向键)
  if (e.shiftKey) {
    const moveStep = 10
    switch(e.key) {
      case 'ArrowUp':
        agentY -= moveStep
        console.log(`🔧 CommonAgent位置调整: X=${agentX}, Y=${agentY} (上移)`)
        e.preventDefault()
        break
      case 'ArrowDown':
        agentY += moveStep
        console.log(`🔧 CommonAgent位置调整: X=${agentX}, Y=${agentY} (下移)`)
        e.preventDefault()
        break
      case 'ArrowLeft':
        agentX -= moveStep
        console.log(`🔧 CommonAgent位置调整: X=${agentX}, Y=${agentY} (左移)`)
        e.preventDefault()
        break
      case 'ArrowRight':
        agentX += moveStep
        console.log(`🔧 CommonAgent位置调整: X=${agentX}, Y=${agentY} (右移)`)
        e.preventDefault()
        break
    }
  }

  // Email位置调试快捷键 (按住1 + 方向键)
  if (keyState['1']) {
    const moveStep = 10
    switch(e.key) {
      case 'ArrowUp':
        emailY -= moveStep
        console.log(`🔧 Email位置调整: X=${emailX}, Y=${emailY} (上移)`)
        e.preventDefault()
        break
      case 'ArrowDown':
        emailY += moveStep
        console.log(`🔧 Email位置调整: X=${emailX}, Y=${emailY} (下移)`)
        e.preventDefault()
        break
      case 'ArrowLeft':
        emailX -= moveStep
        console.log(`🔧 Email位置调整: X=${emailX}, Y=${emailY} (左移)`)
        e.preventDefault()
        break
      case 'ArrowRight':
        emailX += moveStep
        console.log(`🔧 Email位置调整: X=${emailX}, Y=${emailY} (右移)`)
        e.preventDefault()
        break
    }
  }

  // NPC_01位置调试快捷键 (按住2 + 方向键)
  if (keyState['2']) {
    const moveStep = 10
    switch(e.key) {
      case 'ArrowUp':
        npc01Y -= moveStep
        console.log(`🔧 NPC_01位置调整: X=${npc01X}, Y=${npc01Y} (上移)`)
        e.preventDefault()
        break
      case 'ArrowDown':
        npc01Y += moveStep
        console.log(`🔧 NPC_01位置调整: X=${npc01X}, Y=${npc01Y} (下移)`)
        e.preventDefault()
        break
      case 'ArrowLeft':
        npc01X -= moveStep
        console.log(`🔧 NPC_01位置调整: X=${npc01X}, Y=${npc01Y} (左移)`)
        e.preventDefault()
        break
      case 'ArrowRight':
        npc01X += moveStep
        console.log(`🔧 NPC_01位置调整: X=${npc01X}, Y=${npc01Y} (右移)`)
        e.preventDefault()
        break
    }
  }

  // NPC_02位置调试快捷键 (按住3 + 方向键)
  if (keyState['3']) {
    const moveStep = 10
    switch(e.key) {
      case 'ArrowUp':
        npc02Y -= moveStep
        console.log(`🔧 NPC_02位置调整: X=${npc02X}, Y=${npc02Y} (上移)`)
        e.preventDefault()
        break
      case 'ArrowDown':
        npc02Y += moveStep
        console.log(`🔧 NPC_02位置调整: X=${npc02X}, Y=${npc02Y} (下移)`)
        e.preventDefault()
        break
      case 'ArrowLeft':
        npc02X -= moveStep
        console.log(`🔧 NPC_02位置调整: X=${npc02X}, Y=${npc02Y} (左移)`)
        e.preventDefault()
        break
      case 'ArrowRight':
        npc02X += moveStep
        console.log(`🔧 NPC_02位置调整: X=${npc02X}, Y=${npc02Y} (右移)`)
        e.preventDefault()
        break
    }
  }

  // NPC_03位置调试快捷键 (按住4 + 方向键)
  if (keyState['4']) {
    const moveStep = 10
    switch(e.key) {
      case 'ArrowUp':
        npc03Y -= moveStep
        console.log(`🔧 NPC_03位置调整: X=${npc03X}, Y=${npc03Y} (上移)`)
        e.preventDefault()
        break
      case 'ArrowDown':
        npc03Y += moveStep
        console.log(`🔧 NPC_03位置调整: X=${npc03X}, Y=${npc03Y} (下移)`)
        e.preventDefault()
        break
      case 'ArrowLeft':
        npc03X -= moveStep
        console.log(`🔧 NPC_03位置调整: X=${npc03X}, Y=${npc03Y} (左移)`)
        e.preventDefault()
        break
      case 'ArrowRight':
        npc03X += moveStep
        console.log(`🔧 NPC_03位置调整: X=${npc03X}, Y=${npc03Y} (右移)`)
        e.preventDefault()
        break
    }
  }

  // 气泡位置调试快捷键 (按住Ctrl + 方向键)
  if (e.ctrlKey) {
    const bubbleStep = 5
    switch(e.key) {
      case 'ArrowUp':
        chatBubbleOffsetY -= bubbleStep
        console.log(`🗨️ 气泡位置调整: offsetX=${chatBubbleOffsetX}, offsetY=${chatBubbleOffsetY} (上移)`)
        e.preventDefault()
        break
      case 'ArrowDown':
        chatBubbleOffsetY += bubbleStep
        console.log(`🗨️ 气泡位置调整: offsetX=${chatBubbleOffsetX}, offsetY=${chatBubbleOffsetY} (下移)`)
        e.preventDefault()
        break
      case 'ArrowLeft':
        chatBubbleOffsetX -= bubbleStep
        console.log(`🗨️ 气泡位置调整: offsetX=${chatBubbleOffsetX}, offsetY=${chatBubbleOffsetY} (左移)`)
        e.preventDefault()
        break
      case 'ArrowRight':
        chatBubbleOffsetX += bubbleStep
        console.log(`🗨️ 气泡位置调整: offsetX=${chatBubbleOffsetX}, offsetY=${chatBubbleOffsetY} (右移)`)
        e.preventDefault()
        break
    }
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.key in keyState) {
    keyState[e.key as keyof typeof keyState] = false
  }
  

  
  // 数字键处理
  if (['1', '2', '3', '4'].includes(e.key)) {
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
    addMessage('system', 'AI服务暂时不可用，请稍后再试。')
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
  contentDiv.textContent = '思考中...'
  
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

// 加载所有NPC相关图片
const preloadAllNPCImages = () => {
  // 加载CommonAgent角色图片
  agentImg = new Image()
  import('@/assets/static/people/CommonAgent.png').then(module => {
    agentImg.src = module.default
    agentImg.onload = () => {
      console.log('✅ CommonAgent图片加载完成')
      checkAllLoaded()
    }
  }).catch(() => {
    console.error('❌ Failed to load CommonAgent.png')
  })
  
  // 加载CommonAgent对话气泡图片
  agentChatImg = new Image()
  import('@/assets/static/people/CommonAgentChat.png').then(module => {
    agentChatImg.src = module.default
    agentChatImg.onload = () => {
      console.log('✅ CommonAgent气泡图片加载完成')
      checkAllLoaded()
    }
  }).catch(() => {
    console.error('❌ Failed to load CommonAgentChat.png')
  })

  // 加载Email角色图片
  emailImg = new Image()
  import('@/assets/static/people/Email.png').then(module => {
    emailImg.src = module.default
    emailImg.onload = () => {
      console.log('✅ Email图片加载完成')
      checkAllLoaded()
    }
  }).catch(() => {
    console.error('❌ Failed to load Email.png')
  })

  // 加载NPC_01角色图片
  npc01Img = new Image()
  import('@/assets/static/people/NPC_01.png').then(module => {
    npc01Img.src = module.default
    npc01Img.onload = () => {
      console.log('✅ NPC_01图片加载完成')
      checkAllLoaded()
    }
  }).catch(() => {
    console.error('❌ Failed to load NPC_01.png')
  })

  // 加载NPC_02角色图片
  npc02Img = new Image()
  import('@/assets/static/people/NPC_02.png').then(module => {
    npc02Img.src = module.default
    npc02Img.onload = () => {
      console.log('✅ NPC_02图片加载完成')
      checkAllLoaded()
    }
  }).catch(() => {
    console.error('❌ Failed to load NPC_02.png')
  })

  // 加载NPC_03角色图片
  npc03Img = new Image()
  import('@/assets/static/people/NPC_03.png').then(module => {
    npc03Img.src = module.default
    npc03Img.onload = () => {
      console.log('✅ NPC_03图片加载完成')
      checkAllLoaded()
    }
  }).catch(() => {
    console.error('❌ Failed to load NPC_03.png')
  })
}

// 检查所有资源是否加载完成
const checkAllLoaded = () => {
  const catFramesLoaded = loaded === allFrames.length
  const backgroundLoaded = bgImg && bgImg.complete
  const agentLoaded = agentImg && agentImg.complete
  const agentChatLoaded = agentChatImg && agentChatImg.complete
  const emailLoaded = emailImg && emailImg.complete
  const npc01Loaded = npc01Img && npc01Img.complete
  const npc02Loaded = npc02Img && npc02Img.complete
  const npc03Loaded = npc03Img && npc03Img.complete
  
  if (catFramesLoaded && backgroundLoaded && agentLoaded && agentChatLoaded && 
      emailLoaded && npc01Loaded && npc02Loaded && npc03Loaded) {
    console.log('🎉 所有资源加载完成！开始游戏...')
    start()
  }
}

const initBackgroundImage = () => {
  bgImg = new Image()
  import('@/assets/static/main_scence/main_scence.png').then(module => {
    bgImg.src = module.default
    bgImg.onload = () => {
      console.log('背景图片加载完成')
      checkAllLoaded()
    }
  }).catch(() => {
    console.error('Failed to load background image: main_scence.png')
  })
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
  preloadAllNPCImages()
  initBackgroundImage()
  preloadDialogBackground() // 预加载弹窗背景并获取尺寸

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
  
  // 清理聊天相关资源
  stopStreaming()
})
</script>

<style scoped>
.main-scene-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #000;
  overflow: hidden;
}

#mainBg, #catCanvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: block;
}

#mainBg { 
  z-index: 0; 
}

#catCanvas { 
  z-index: 1; 
  cursor: crosshair;
}

/* AI对话气泡样式 */
.chat-bubble {
  position: absolute;
  min-width: 220px;
  max-width: 320px;
  background: #f5ecd7;
  border: 2px solid #e2cfa5;
  border-radius: 18px 18px 18px 0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  padding: 12px 16px 8px 16px;
  z-index: 1000;
  display: none;
  font-size: 15px;
  color: #5a4a2c;
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
  border-top: 16px solid #f5ecd7;
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
  border: 1px solid #e2cfa5;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 14px;
  resize: none;
  background: #f9f6ef;
  color: #5a4a2c;
  outline: none;
  font-family: Arial, sans-serif;
}

.chat-bubble button {
  background: #e2cfa5;
  color: #5a4a2c;
  border: none;
  border-radius: 6px;
  padding: 0 14px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  font-family: Arial, sans-serif;
}

.chat-bubble button:hover {
  background: #d1b97a;
}

.message {
  margin-bottom: 8px;
}

.message-content p {
  margin: 4px 0;
}

/* 弹窗样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.dialog-main {
  position: relative;
  /* 使用CSS变量来适应背景图片的实际尺寸 */
  width: var(--dialog-width, 900px);
  height: var(--dialog-height, 600px);
  
  background-image: url('@/assets/static/agent_scence/弹窗背景.png');
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.dialog-character {
  flex: 1;
  /* 左侧角色区域，背景已经通过dialog-main设置 */
}

.dialog-chat {
  /* 对话框尺寸调整 - 可以修改这些值来调整大小和位置 */
  width: 570px;  /* 缩小宽度，原来是400px左右 */
  height: 470px; /* 设置固定高度，不再是100% */
  
  /* 位置调整 - 可以修改这些值来移动对话框位置 */
  position: absolute;
  right: 40px;   /* 距离右边的距离，可调整 */
  top: 80px;     /* 距离顶部的距离，可调整来上移 */
  
  background-image: url('@/assets/static/agent_scence/对话UI-111Recovered-export1.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

/* 调试模式样式 */
.dialog-chat.debug-mode {
  border: 2px solid transparent;
}

.dialog-chat.debug-mode .chat-messages-area {
  background: transparent;
  border: 1px solid transparent;
}

.dialog-chat.debug-mode .chat-input-area {
  background: transparent;
  border: 1px solid transparent;
}

/* 聊天室ID信息 */
.chat-room-id {
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 9px;
  color: #999;
  opacity: 0.6;
  background: rgba(255, 255, 255, 0.7);
  padding: 2px 6px;
  border-radius: 10px;
  font-family: monospace;
}

/* 聊天消息区域（上半部分） */
.chat-messages-area {
  height: 290px; /* 固定高度，减少聊天区域高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-bottom: 50px;
  margin-top: -15px; /* 向上移动聊天区域 */
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 消息包装器 */
.message-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  max-width: 90%;
}

.user-message-wrapper {
  align-self: flex-end;
  flex-direction: row-reverse;
  max-width: 70%; /* 限制用户消息的最大宽度 */
}

.ai-message-wrapper {
  align-self: flex-start;
}

/* 头像样式 */
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.ai-avatar {
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: white;
}

.user-avatar {
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: white;
}

/* 消息气泡样式 */
.message-bubble {
  max-width: 100%;
  word-wrap: break-word;
  position: relative;
  animation: messageSlideIn 0.3s ease-out;
}

.ai-bubble {
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  border-radius: 16px 16px 16px 4px;
  padding: 10px 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(74, 144, 226, 0.2);
  backdrop-filter: blur(5px);
}

.user-bubble {
  background: linear-gradient(135deg, #4a90e2, #357abd);
  color: white;
  border-radius: 16px 16px 4px 16px;
  padding: 10px 14px;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
}

.message-content {
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 4px;
  white-space: pre-wrap;
}

.message-time {
  font-size: 10px;
  opacity: 0.7;
  text-align: right;
}

.ai-bubble .message-time {
  color: #666;
}

.user-bubble .message-time {
  color: rgba(255, 255, 255, 0.8);
}

/* 欢迎区域 */
.welcome-message {
  display: flex;
  justify-content: flex-start;
  margin: 10px 0;
}

/* 打字动画 */
.typing-indicator {
  opacity: 0.8;
}

.typing {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(74, 144, 226, 0.2) !important;
  padding: 12px 16px !important;
  backdrop-filter: blur(5px);
}

.typing-animation {
  display: flex;
  gap: 3px;
  align-items: center;
}

.typing-animation span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4a90e2;
  animation: typingDots 1.4s infinite ease-in-out;
}

.typing-animation span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-animation span:nth-child(3) {
  animation-delay: 0.4s;
}

/* 用户输入区域（下半部分） */
.chat-input-area {
  height: auto;
  min-height: 80px;
  display: flex;
  flex-direction: column;
}

.input-container {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 12px;
  background: transparent;
  border-radius: 12px;
}

.chat-textarea {
  flex: 1;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  resize: none;
  outline: none;
  font-family: inherit;
  background: rgba(255, 255, 255, 0.3);
  min-height: 20px;
  max-height: 80px;
  color: #333;
  backdrop-filter: blur(5px);
}

.chat-textarea:focus {
  background: rgba(255, 255, 255, 0.5);
}

.chat-textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.stop-button {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 60px;
  height: 36px;
}

.stop-button:hover {
  background: linear-gradient(135deg, #c0392b, #a93226);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

/* 关闭按钮 */
.dialog-close {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 35px;
  height: 35px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid #d1b97a;
  border-radius: 50%;
  font-size: 18px;
  font-weight: bold;
  color: #5a4a2c;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.dialog-close:hover {
  background: #f0f0f0;
  transform: scale(1.1);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

/* 弹窗底部图片 */
.dialog-bottom-image {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 120px; /* 可根据实际图片高度调整 */
  background-image: url('@/assets/static/main_scence/弹窗底部.png');
  background-size: contain;
  background-position: center bottom;
  background-repeat: no-repeat;
  pointer-events: none; /* 确保图片不会阻挡其他交互 */
  z-index: 10;
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.5);
}

/* 动画效果 */
@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes typingDots {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}


</style> 