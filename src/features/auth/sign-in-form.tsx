"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInSchema } from "@/lib/validators";

type SignInInput = z.infer<typeof signInSchema>;

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" }
  });

  async function onSubmit(values: SignInInput) {
    setError("");
    const result = await signIn("credentials", {
      ...values,
      redirect: false
    });

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(searchParams.get("callbackUrl") ?? "/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-semibold">
          Email
        </label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email ? <p className="text-sm text-primary">{errors.email.message}</p> : null}
      </div>
      <div className="grid gap-2">
        <label htmlFor="password" className="text-sm font-semibold">
          Password
        </label>
        <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
        {errors.password ? <p className="text-sm text-primary">{errors.password.message}</p> : null}
      </div>
      {error ? <p className="rounded-md bg-primary/10 p-3 text-sm font-semibold text-primary">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Sign in
      </Button>
    </form>
  );
}
