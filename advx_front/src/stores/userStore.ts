import { defineStore } from "pinia";
import { ref } from "vue";
import { getCurrentUser } from "../api/userApi";
import type { LoginUserVO } from "../api/types/user";
import type { BaseResponse } from "../api/types/common";
import type { AxiosResponse } from "axios";

export const useLoginUserStore = defineStore("loginUser", () => {
  const loginUser = ref<LoginUserVO>({
    id: 0,
    userName: "未登录",
    userRole: "",
    createTime: new Date(),
  });

  async function fetchLoginUser() {
    try {
      const res: AxiosResponse<BaseResponse<LoginUserVO>> = await getCurrentUser();
      if (res.data && res.data.code === 0 && res.data.data) {
      loginUser.value = res.data.data;
      }
    } catch (error) {
      console.error("获取当前用户信息失败", error);
    }
  }

  function setLoginUser(newLoginUser: LoginUserVO) {
    loginUser.value = newLoginUser;
  }

  return { loginUser, setLoginUser, fetchLoginUser };
});
