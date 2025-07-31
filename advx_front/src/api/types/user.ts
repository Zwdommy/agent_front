/**
 * 用户注册请求
 */
export interface UserRegisterRequest {
  userAccount: string;
  userPassword: string;
  checkPassword: string;
  email: string;
  code: string;
}

/**
 * 用户登录请求
 */
export interface UserLoginRequest {
  userAccount: string;
  userPassword: string;
}

/**
 * 用户更新请求
 */
export interface UserUpdateRequest {
  id: number;
  userName?: string;
  userAvatar?: string;
  userProfile?: string;
  userPassword?: string;
  email?: string;
}

/**
 * 用户查询请求
 */
export interface UserQueryRequest {
  current: number;
  pageSize: number;
  id?: number;
  userName?: string;
  userProfile?: string;
  userRole?: string;
}

/**
 * 用户视图对象
 */
export interface UserVO {
  id: number;
  userName: string;
  userAvatar?: string;
  userProfile?: string;
  userRole: string;
  createTime: Date;
}

/**
 * 登录用户视图对象
 */
export interface LoginUserVO {
  id: number;
  userName: string;
  userAvatar?: string;
  userProfile?: string;
  userRole: string;
  createTime: Date;
}

/**
 * Email请求参数
 */
export interface EmailRequest {
  email?: string;
  code?: string;
}

/**
 * Email返回信息
 */
export interface EmailVO {
  email?: string;
  expireTime?: Date;
} 