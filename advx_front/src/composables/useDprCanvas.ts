export function setupDprCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  logicalWidth: number,
  logicalHeight: number,
) {
  const dpr = window.devicePixelRatio || 1
  canvas.width = logicalWidth * dpr
  canvas.height = logicalHeight * dpr
  canvas.style.width = logicalWidth + 'px'
  canvas.style.height = logicalHeight + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}


