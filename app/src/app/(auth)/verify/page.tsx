import { VerifyButton } from "@/components/auth/verifyButton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerifyPage() {
  return (
    <>
      <Link href={"/dashboard"} className="absolute top-3 left-3 text-2xl">
        <ArrowLeft />
      </Link>
      <div className="flex flex-col justify-center items-center min-h-screen gap-5">
        <div className="flex flex-col gap-1 max-w-lg text-center">
          <h1 className="text-4xl">Verify your account</h1>
          <p className="text-sm opacity-50">
            To continue to the website you need to verify your account. This means you need to
            confirm your email address.
          </p>
        </div>
        <VerifyButton />
      </div>
    </>
  );
}
