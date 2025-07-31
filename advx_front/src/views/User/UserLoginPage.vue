<template>
  <div class="login-container">
    <div class="background-image"></div>
    <div class="login-box">
      <img src="@/assets/images/UserPage/登录框.png" alt="登录框" class="login-image" />
      <div class="login-form">
        <img src="@/assets/images/UserPage/欢迎回家框.png" alt="欢迎回家框" class="Title_image"/>
        <div class="input-container">
          <div class="input-wrapper">
            <img src="@/assets/images/UserPage/输入框.png" alt="输入框" class="input-bg" />
            <input
              type="text"
              id="userAccount"
              placeholder="输入邮箱..."
              class="custom-input"
              @input="userAccount = $event.target.value"
              :value="userAccount"
            />
          </div>
          <div class="input-wrapper">
            <img src="@/assets/images/UserPage/输入框.png" alt="输入框" class="input-bg" />
            <input
              type="password"
              id="userPassword"
              placeholder="输入密码..."
              class="custom-input password-input"
              @input="userPassword = $event.target.value"
              :value="userPassword"
            />
          </div>
          <div class="remember-password">
            <span>忘记密码?</span>
          </div>

          <div class="third-party-login">
            <img src="@/assets/images/UserPage/微信按钮.png" alt="微信按钮" class="third-party-btn" @click="handleWechatLogin" />
            <img src="@/assets/images/UserPage/谷歌按钮.png" alt="谷歌按钮" class="third-party-btn" @click="handleGoogleLogin" />
          </div>

          <div class="login-button-container">
            <img src="@/assets/images/UserPage/登录按钮.png" alt="登录按钮" class="login-button-img" @click="handleLogin" />
          </div>

          <div class="register-tip">
            没有账号? <span class="register-link" @click="goToRegister">注册</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { userLogin } from '../../api/userApi';
import { useRouter } from 'vue-router';
import { useLoginUserStore } from '../../stores/userStore';

const userAccount = ref('');
const userPassword = ref('');
const router = useRouter();
const userStore = useLoginUserStore();

const handleLogin = async () => {
  if (!userAccount.value || !userPassword.value) {
    alert('请输入邮箱和密码');
    return;
  }

  try {
    const res = await userLogin({
      userAccount: userAccount.value,
      userPassword: userPassword.value
    });

    if (res.data && res.data.code === 0) {
      // 登录成功
      userStore.setLoginUser(res.data.data);
      // 存储用户信息到本地存储，以便导航守卫使用
      localStorage.setItem('user', JSON.stringify(res.data.data));
      router.push('/index');
    } else {
      // 登录失败
      alert(res.data?.message || '登录失败');
    }
  } catch (error) {
    console.error('登录请求异常', error);
    alert('登录失败，请稍后再试');
  }
};

const handleWechatLogin = () => {
  // 处理微信登录
  console.log('微信登录');
};

const handleGoogleLogin = () => {
  // 处理谷歌登录
  console.log('谷歌登录');
};

const goToRegister = () => {
  router.push('/user/register');
};
</script>

<style scoped>
.background-image {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('../../assets/images/UserPage/background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: -1;
}

.Title_image {
  width: 320px;
  height: 122px;
  margin-top: -90px;
  margin-bottom: 20px;
  position: relative;
}

.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.login-box {
  position: relative;
  width: 400px;
  height: 450px;
}

.login-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.login-form {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.input-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80%;
}

.input-wrapper {
  position: relative;
  width: 240px;
  height: 40px;
  margin-bottom: 15px;
  background-color: transparent;
}

/* 可以为第一个输入框单独设置样式 */
.input-wrapper:first-child {
  margin-bottom: 15px;
}

/* 可以为密码输入框单独设置样式 */
.input-wrapper:nth-child(2) {
  margin-top: 0px;
}

.input-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 0;
}

.custom-input {
  position: relative;
  width: 85%;
  height: 80%;
  margin-top: 4px;
  margin-left: 10%;
  padding: 0;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  -webkit-appearance: none;
  appearance: none;
  border: none;
  outline: none;
  font-size: 16px;
  color: #333;
  z-index: 1;
  box-shadow: none;
  opacity: 1;
}

/* 可以单独设置密码输入框的字体大小 */
.password-input {
  color: rgba(51, 51, 51, 0.7);
  text-shadow: 0 0 0 #333;
  -webkit-text-security: disc;
  font-size: 16px;
}

.custom-input::placeholder {
  color: #333;
  opacity: 0.7;
  font-size: 14px;
}

.remember-password {
  width: 240px;
  text-align: center;
  margin-bottom: 10px;
  font-size: 12px;
  color: #E8CFA6;
  cursor: pointer;
}

.third-party-login {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
  width: 240px;
}

.third-party-btn {
  width: 48px;
  height: 43px;
  margin: 0 15px;
  cursor: pointer;
}

.login-button-container {
  margin: 10px 0;
  cursor: pointer;
}

.login-button-img {
  width: 100px;
  height: auto;
  cursor: pointer;
}

.register-tip {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
  text-align: center;
}

.register-link {
  color: #E8CFA6;
  text-decoration: none;
  cursor: pointer;
  display: inline-block;
}

.register-link:hover {
  text-decoration: none;
}
</style>
