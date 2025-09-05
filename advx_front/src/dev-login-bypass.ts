// 开发用：登录绕过（可拔插）
// 删除本文件即可关闭该功能。

interface DevLoginUser {
  id: number
  userName: string
  userRole: string
  createTime: string
}

function ensureDevLogin() {
  try {
    const currentPath = window.location.pathname
    const stored = localStorage.getItem('user')
    const hasUser = !!stored

    if (!hasUser) {
      const fakeUser: DevLoginUser = {
        id: 1,
        userName: '开发账号',
        userRole: 'admin',
        createTime: new Date().toISOString(),
      }
      localStorage.setItem('user', JSON.stringify(fakeUser))
    }

    // 若当前在登录页，则跳转到受保护首页
    if (currentPath === '/' || currentPath.startsWith('/user/login')) {
      const redirect = new URLSearchParams(window.location.search).get('redirect')
      window.location.replace(redirect || '/cat-animation')
    }
  } catch {
    // 忽略任何本地存储异常
  }
}

// 尽早执行
ensureDevLogin()


