/**
 * 聊天请求参数
 */
export interface ChatRequest {
  message: string;
  chatId: string;
}

/**
 * 聊天响应数据
 */
export interface ChatResponse {
  message: string;
  chatId: string;
  timestamp: number;
}

/**
 * 流式聊天响应数据
 */
export interface StreamChatResponse {
  content: string;
  isComplete: boolean;
  chatId: string;
} 