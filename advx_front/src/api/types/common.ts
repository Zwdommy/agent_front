/**
 * 通用返回类
 */
export interface BaseResponse<T> {
  code: number;
  data: T;
  message: string;
  description: string;
}

/**
 * 分页信息
 */
export interface PageInfo<T> {
  current: number;
  pageSize: number;
  total: number;
  records: T[];
} 