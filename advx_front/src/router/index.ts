import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import UserLoginPage from '../views/User/UserLoginPage.vue'
import UserRegisterPage from '../views/User/UserRegisterPage.vue'
import IndexPage from '../views/IndexPage.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/user/login'
    },
    {
      path: '/user/login',
      name: 'login',
      component: UserLoginPage,
    },
    {
      path: '/user/register',
      name: 'register',
      component: UserRegisterPage,
    },
    {
      path: '/index',
      name: 'index',
      component: IndexPage,
      meta: { requiresAuth: true }
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/cat-animation',
      name: 'cat-animation',
      component: () => import('../views/CatAnimationPage.vue'),
    },
    {
      path: '/main-scene',
      name: 'main-scene',
      component: () => import('../views/MainScenePage.vue'),
    },
    {
      path: '/management',
      name: 'management',
      component: () => import('../views/ManagementPage.vue'),
    },
    {
      path: '/consult',
      name: 'consult',
      component: () => import('../views/ConsultPage.vue'),
    },
    {
      path: '/product',
      name: 'product',
      component: () => import('../views/ProductPage.vue'),
    },
    {
      path: '/promotion',
      name: 'promotion',
      component: () => import('../views/PromotionPage.vue'),
    },
    {
      path: '/finance',
      name: 'finance',
      component: () => import('../views/FinancePage.vue'),
    },
  ],
})

// 导航守卫
router.beforeEach((to, from, next) => {
  // 检查是否需要登录权限
  if (to.meta.requiresAuth) {
    // 这里可以检查用户是否已登录
    const userStore = JSON.parse(localStorage.getItem('user') || '{}')
    if (userStore && userStore.id) {
      next()
    } else {
      next('/user/login')
    }
  } else {
    next()
  }
})

export default router
