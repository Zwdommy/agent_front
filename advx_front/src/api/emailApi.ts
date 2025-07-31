import myAxios from '../router/request'
import type { EmailRequest, EmailVO } from './types/user'
import type { BaseResponse } from './types/common'
import type { AxiosResponse } from 'axios'

/**
 * 发送验证码
 * @param emailRequest 邮箱请求参数
 */
export function sendVerificationCode(emailRequest: EmailRequest) {
  return myAxios.post<any, AxiosResponse<BaseResponse<EmailVO>>>('/email/verification-code/send', emailRequest)
}

/**
 * 校验验证码
 * @param emailRequest 邮箱和验证码请求参数
 */
export function checkVerificationCode(emailRequest: EmailRequest) {
  return myAxios.post<any, AxiosResponse<BaseResponse<boolean>>>('/email/verification-code/check', emailRequest)
} 