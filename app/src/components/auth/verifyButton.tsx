"use client";

import { useActionState } from "react";
import { verifyAccountAction } from "@/app/(auth)/actions";
import { ServerActionResult } from "@/types/serverAction";

/** Props for {@link VerifyButton}. */
interface VerifyButtonProps {
  /** The verification token extracted from the URL path segment. */
  token: string;
}

/**
 * Button that triggers account verification via
 * {@link verifyAccountAction}. Uses React 19's {@link useActionState} to
 * track the server action's outcome, which also means no manual `useEffect`
 * or `useState` is needed for the pending / success states.
 *
 * Once verified the button becomes disabled and its label switches to
 * "verified" so the user cannot re-submit.
 *
 * @param token - Verification token forwarded to the server action.
 */
export function VerifyButton({ token }: VerifyButtonProps) {
  const [state, formAction] = useActionState<ServerActionResult<void>>(
    async () => await verifyAccountAction(token),
    {
      success: false,
      error: "",
    },
  );

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
