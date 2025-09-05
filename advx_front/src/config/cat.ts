// 小猫动画与场景的集中配置

export const FRAME_RATE = 24
export const IMAGE_WIDTH = 140
export const IMAGE_HEIGHT = 140
export const MOVE_SPEED = 32

// 世界缩放：以背景图高为基准放大倍数
export const WORLD_SCALE_FACTOR = 7

// 构图的水平偏移（相对于视窗宽度的比例）
export const HORIZONTAL_OFFSET_RATIO = 0.13

// 碰撞：道路顶部厚度（相对于绘制后背景高度的比例）
export const ROAD_TOP_THICKNESS_RATIO = 1 / 18

// 帧索引
export const RIGHT_FRAMES = [0, 2, 4, 6, 8, 10, 12]
export const LEFT_FRAMES = [1, 3, 5, 7, 9, 11, 13]

export type Direction = 'left' | 'right'

