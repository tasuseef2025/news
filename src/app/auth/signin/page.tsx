import { Suspense } from "react";
import { SignInForm } from "@/features/auth/sign-in-form";

export const metadata = {
  title: "Sign in",
  description: "Sign in to the Newsroom editorial dashboard."
};

export default function SignInPage() {
  return (
    <main className="container grid min-h-[70vh] place-items-center py-12">
      <section className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase text-primary">Editorial access</p>
          <h1 className="text-3xl font-black">Sign in</h1>
        </div>
        <Suspense>
          <SignInForm />
        </Suspense>
      </section>
    </main>
  );
}
