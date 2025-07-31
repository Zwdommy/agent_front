import myAxios from '../router/request'
import type { 
  UserRegisterRequest, 
  UserLoginRequest, 
  UserUpdateRequest, 
  UserQueryRequest, 
  UserVO, 
  LoginUserVO 
} from './types/user'
import type { BaseResponse, PageInfo } from './types/common'
import type { AxiosResponse } from 'axios'

/**
 * 用户注册
 * @param userRegisterRequest 注册请求参数
 */
export function userRegister(userRegisterRequest: UserRegisterRequest) {
  return myAxios.post<any, AxiosResponse<BaseResponse<UserVO>>>('/user/register', userRegisterRequest)
}

/**
 * 用户登录
 * @param userLoginRequest 登录请求参数
 */
export function userLogin(userLoginRequest: UserLoginRequest) {
  return myAxios.post<any, AxiosResponse<BaseResponse<LoginUserVO>>>('/user/login', userLoginRequest)
}

/**
 * 获取当前登录用户信息
 */
export function getCurrentUser() {
  return myAxios.get<any, AxiosResponse<BaseResponse<LoginUserVO>>>('/user/get/login')
}

/**
 * 用户登出
 */
export function userLogout() {
  return myAxios.post<any, AxiosResponse<BaseResponse<boolean>>>('/user/logout')
}

/**
 * 根据ID获取用户信息（管理员专用）
 * @param id 用户ID
 */
export function getUserById(id: number) {
  return myAxios.get<any, AxiosResponse<BaseResponse<UserVO>>>('/user/get', {
    params: { id }
  })
}

/**
 * 根据ID获取用户脱敏信息
 * @param id 用户ID
 */
export function getUserVOById(id: number) {
  return myAxios.get<any, AxiosResponse<BaseResponse<UserVO>>>('/user/get/vo', {
    params: { id }
  })
}

/**
 * 更新用户信息
 * @param userUpdateRequest 用户更新信息
 */
export function updateUser(userUpdateRequest: UserUpdateRequest) {
  return myAxios.post<any, AxiosResponse<BaseResponse<boolean>>>('/user/update', userUpdateRequest)
}

/**
 * 分页获取用户列表（管理员专用）
 * @param userQueryRequest 查询参数
 */
export function listUserVOByPage(userQueryRequest: UserQueryRequest) {
  return myAxios.post<any, AxiosResponse<BaseResponse<PageInfo<UserVO>>>>('/user/list/page/vo', userQueryRequest)
} 