"use client";

import { Button, Card, Input, Label, Spinner, TextField } from "@heroui/react";
import { LockKeyhole, Mail, Rocket } from "lucide-react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { motion } from "framer-motion";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { safeInternalCallbackUrl } from "@/lib/auth/callback-url";
import { signIn } from "@/lib/auth/client";

const AuthBackground = dynamic(() => import("@/components/ui/Background").then((module) => module.AuthBackground), { ssr: false });

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = safeInternalCallbackUrl(searchParams.get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("请输入邮箱和访问密码");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn.email({ email: email.trim(), password });
      if (result.error) throw new Error(result.error.message || "登录失败");
      if (!result.data?.token && !result.data?.user) throw new Error("登录失败，请稍后重试");
      window.location.assign(callbackUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "登录失败，请稍后重试");
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-[420px]">
      <Card className="overflow-hidden border-white/20 bg-background/70 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-background/60">
        <Card.Content className="p-7 sm:p-9">
          <div className="mb-8 text-center">
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.15 }} className="group mb-5 inline-flex size-14 items-center justify-center rounded-2xl border bg-primary/10 text-primary">
              <Rocket className="size-7 transition-transform duration-300 group-hover:rotate-12" />
            </motion.div>
            <h1 className="text-2xl font-semibold tracking-tight">欢迎回来</h1>
            <p className="mt-2 text-sm text-muted-foreground">登录到 Joruno 内容工作台</p>
          </div>

          {error ? <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} role="alert" className="mb-5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</motion.div> : null}

          <form className="grid gap-4" onSubmit={submit}>
            <TextField type="email" value={email} onChange={setEmail}><Label>邮箱地址</Label><div className="studio-login-field"><Mail className="size-4" /><Input autoComplete="username" placeholder="admin@example.com" autoFocus /></div></TextField>
            <TextField type="password" value={password} onChange={setPassword}><Label>访问密码</Label><div className="studio-login-field"><LockKeyhole className="size-4" /><Input autoComplete="current-password" placeholder="请输入密码" /></div></TextField>
            <p className="text-xs text-muted-foreground">忘记密码请联系平台管理员。</p>
            <Button className="mt-1 h-11 w-full" type="submit" isDisabled={loading}>{loading ? <Spinner color="current" size="sm" /> : null}登录</Button>
          </form>
        </Card.Content>
      </Card>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <AuthBackground>
      <div className="fixed right-6 top-6 z-[100]">
        <AnimatedThemeToggler className="size-10 rounded-xl border bg-background/70 shadow-sm backdrop-blur-md transition-transform hover:scale-105 active:scale-95" />
      </div>
      <Suspense fallback={<div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" />加载登录页</div>}>
        <LoginForm />
      </Suspense>
    </AuthBackground>
  );
}
