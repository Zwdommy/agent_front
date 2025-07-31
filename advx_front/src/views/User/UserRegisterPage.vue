<template>
  <div class="register-container">
    <div class="background-image"></div>
    <div class="register-box">
      <img src="@/assets/images/UserPage/登录框.png" alt="登录框" class="register-image" />
      <div class="register-form">
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
          <div class="input-wrapper">
            <img src="@/assets/images/UserPage/输入框.png" alt="输入框" class="input-bg" />
            <input
              type="password"
              id="checkPassword"
              placeholder="确认密码..."
              class="custom-input password-input"
              @input="checkPassword = $event.target.value"
              :value="checkPassword"
            />
          </div>
          <div class="code-container">
            <div class="code-input-wrapper">
              <img src="@/assets/images/UserPage/验证码输入框.png" alt="验证码输入框" class="code-input-bg" />
              <input
                type="text"
                id="code"
                placeholder="验证码..."
                class="code-input"
                @input="code = $event.target.value"
                :value="code"
              />
            </div>
            <div class="send-button-wrapper" @click="getVerificationCode">
              <img src="@/assets/images/UserPage/发送按钮.png" alt="发送按钮" class="send-button-img" />
            </div>
          </div>

          <div class="register-button-container">
            <img src="@/assets/images/UserPage/注册按钮.png" alt="注册按钮" class="register-button-img" @click="handleRegister" />
          </div>

          <div class="login-tip">
            已有账号? <span class="login-link" @click="goToLogin">登录</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { userRegister } from '../../api/userApi';
import { sendVerificationCode } from '../../api/emailApi';
import { useRouter } from 'vue-router';

const userAccount = ref('');
const userPassword = ref('');
const checkPassword = ref('');
const code = ref('');
const router = useRouter();

const getVerificationCode = async () => {
  if (!userAccount.value) {
    alert('请先输入邮箱');
    return;
  }

  try {
    const res = await sendVerificationCode({
      email: userAccount.value
    });

    if (res.data && res.data.code === 0) {
      alert('验证码已发送到您的邮箱，请查收');
    } else {
      alert(res.data?.message || '验证码发送失败');
    }
  } catch (error) {
    console.error('验证码发送请求异常', error);
    alert('验证码发送失败，请稍后再试');
  }
};

const handleRegister = async () => {
  if (!userAccount.value || !userPassword.value || !checkPassword.value || !code.value) {
    alert('请填写所有信息');
    return;
  }

  if (userPassword.value !== checkPassword.value) {
    alert('两次输入的密码不一致');
    return;
  }

  try {
    const res = await userRegister({
      userAccount: userAccount.value,
      userPassword: userPassword.value,
      checkPassword: checkPassword.value,
      email: userAccount.value,
      code: code.value
    });

    if (res.data && res.data.code === 0) {
      // 注册成功
      alert('注册成功，请登录');
      router.push('/user/login');
    } else {
      // 注册失败
      alert(res.data?.message || '注册失败');
    }
  } catch (error) {
    console.error('注册请求异常', error);
    alert('注册失败，请稍后再试');
  }
};

const goToLogin = () => {
  router.push('/user/login');
};
</script>

<style scoped>
.background-image {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url('@/assets/images/UserPage/background.jpg');
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

.register-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.register-box {
  position: relative;
  width: 400px;
  height: 450px;
}

.register-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.register-form {
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

.code-container {
  display: flex;
  align-items: center;
  width: 240px;
  margin-bottom: 15px;
  justify-content: flex-start;
  padding-left: 0;
  position: relative;
  left: 0;
  /* 可以调整的位置参数 */
  /* left: 0px; 向右移动为正值，向左移动为负值 */
  /* top: 0px; 向下移动为正值，向上移动为负值 */
  /* margin-left: 0px; 左边距，增加为正值 */
  /* margin-right: 0px; 右边距，增加为正值 */
  /* margin-top: 0px; 上边距，增加为正值 */
  /* margin-bottom: 0px; 下边距，增加为正值 */
  /* transform: translate(0px, 0px); 第一个值是水平移动(右为正)，第二个是垂直移动(下为正) */
}

.code-input-wrapper {
  position: relative;
  width: 140px;
  height: 35px;
  /* 可以调整的位置参数 */
  left: 10px; /* 已取消注释，向右移动50px */
  /* top: 0px; */
  /* margin-left: 0px; */
}

.code-input-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 0;
}

.code-input {
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
  font-size: 14px;
  color: #333;
  z-index: 1;
  box-shadow: none;
  opacity: 1;
}

.send-button-wrapper {
  width: 60px;
  height: 35px;
  cursor: pointer;
  margin-left: 10px;
  /* 可以调整的位置参数 */
  /* margin-left: 10px; 调整与验证码输入框的距离 */
  /* position: relative; */
  /* left: 0px; */
  /* top: 0px; */
}

.send-button-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.register-button-container {
  margin: 10px 0;
  cursor: pointer;
  display: flex;
  justify-content: center;
}

.register-button-img {
  width: 120px;
  height: auto;
  cursor: pointer;
}

.login-tip {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
  text-align: center;
}

.login-link {
  color: #E8CFA6;
  text-decoration: none;
  cursor: pointer;
  display: inline-block;
}

.login-link:hover {
  text-decoration: none;
}
</style>
