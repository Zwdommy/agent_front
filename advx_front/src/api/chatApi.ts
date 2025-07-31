import myAxios from '../router/request'
import type { ChatRequest, ChatResponse, StreamChatResponse } from './types/chat'
import type { BaseResponse } from './types/common'
import type { AxiosResponse } from 'axios'

/**
 * 同步聊天接口
 * @param chatRequest 聊天请求参数
 */
export function doChatSync(chatRequest: ChatRequest) {
  return myAxios.get<any, AxiosResponse<BaseResponse<string>>>(
    '/common_chat/chat/sync',
    {
      params: {
        message: chatRequest.message,
        chatId: chatRequest.chatId
      }
    }
  )
}

/**
 * 流式聊天接口 (Server-Sent Events)
 * @param chatRequest 聊天请求参数
 * @param onMessage 接收消息的回调函数
 * @param onError 错误处理回调函数
 * @param onComplete 完成时的回调函数
 * @returns EventSource实例，可用于关闭连接
 */
export function doChatSSE(
  chatRequest: ChatRequest,
  onMessage: (data: string) => void,
  onError?: (error: Event) => void,
  onComplete?: () => void
): EventSource {
  // 构建SSE URL
  const baseURL = myAxios.defaults.baseURL || ''
  const url = new URL(`${baseURL}/common_chat/chat/sse`)
  url.searchParams.append('message', chatRequest.message)
  url.searchParams.append('chatId', chatRequest.chatId)

  // 创建EventSource连接
  const eventSource = new EventSource(url.toString())

  // 处理消息
  eventSource.onmessage = (event) => {
    try {
      const data = event.data
      onMessage(data)
      
      // 检查是否是结束标记（可根据实际情况调整）
      if (data === '[DONE]' || data === 'data: [DONE]') {
        eventSource.close()
        onComplete?.()
      }
    } catch (error) {
      console.error('解析SSE消息失败:', error)
      onError?.(event)
    }
  }

  // 处理错误
  eventSource.onerror = (event) => {
    console.error('SSE连接错误:', event)
    onError?.(event)
    eventSource.close()
  }

  // 处理连接打开
  eventSource.onopen = () => {
    console.log('SSE连接已建立')
  }

  return eventSource
}

/**
 * 使用fetch实现的流式聊天接口（备选方案）
 * @param chatRequest 聊天请求参数
 * @param onMessage 接收消息的回调函数
 * @param onError 错误处理回调函数
 * @param onComplete 完成时的回调函数
 * @returns Promise<void>
 */
export async function doChatStream(
  chatRequest: ChatRequest,
  onMessage: (data: string) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void
): Promise<void> {
  try {
    const baseURL = myAxios.defaults.baseURL || ''
    const url = new URL(`${baseURL}/common_chat/chat/sse`)
    url.searchParams.append('message', chatRequest.message)
    url.searchParams.append('chatId', chatRequest.chatId)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法获取响应流')
    }

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        onComplete?.()
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.trim() === '') continue
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            onComplete?.()
            return
          }
          onMessage(data)
        }
      }
    }
  } catch (error) {
    console.error('流式聊天请求失败:', error)
    onError?.(error as Error)
  }
} 