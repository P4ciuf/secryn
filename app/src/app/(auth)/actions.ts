"use server";

import { signIn, signOut } from "@/auth";
import { AuthService } from "@/services/auth";
import { serverActionHandler } from "@/utils/serverAction";

export const loginAction = serverActionHandler(async (email: string, password: string) => {
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
});

export const registerAction = serverActionHandler(
  async (data: { email: string; password: string; username?: string }) => {
    const authService = await AuthService.Instance(null);
    await authService.register(data);
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: "/dashboard",
    });
  },
);

export const logoutAction = serverActionHandler(async () => {
  await signOut({ redirectTo: "/login" });
});
