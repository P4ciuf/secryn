"use client";

import { useActionState } from "react";
import { verifyAccountAction } from "@/app/(auth)/actions";
import { ServerActionResult } from "@/types/serverAction";

export function VerifyButton() {
  const [state, formAction] = useActionState<ServerActionResult<void>>(verifyAccountAction, {
    success: false,
    error: "",
  });

  return (
    <button
      onClick={async () => await formAction()}
      disabled={state.success}
      className="w-full max-w-80 p-6 cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-full font-medium transition-colors flex items-center justify-center gap-2 text-2xl"
    >
      {state.success ? "verified" : "verify your profile"}
    </button>
  );
}
