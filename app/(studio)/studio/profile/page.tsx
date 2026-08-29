/* eslint-disable @next/next/no-img-element */
"use client";

import { Camera, Loader2, LockKeyhole, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth/client";

type ProfileUser = { name: string; email: string; image?: string | null };

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refetch = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/get-session", { cache: "no-store" });
      if (!response.ok) throw new Error("个人资料加载失败");
      const payload = await response.json() as { user?: ProfileUser } | null;
      setUser(payload?.user ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "个人资料加载失败");
    } finally {
      setIsPending(false);
    }
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  if (isPending) {
    return <div className="flex h-[calc(100vh-64px)] items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" />加载个人资料</div>;
  }

  async function updateProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("请输入用户名");
      return;
    }
    setLoading(true);
    try {
      const { error } = await authClient.updateUser({ name: name.trim() });
      if (error) throw new Error(error.message || "更新失败");
      toast.success("个人信息更新成功");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "请求出错");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!currentPassword || newPassword.length < 8) {
      toast.error("请填写当前密码，新密码至少 8 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (error) throw new Error(error.message || "密码修改失败");
      toast.success("密码修改成功");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "请求出错");
    } finally {
      setPasswordLoading(false);
    }
  }

  function uploadAvatar(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    setAvatarLoading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media", true);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setUploadProgress(Math.floor((event.loaded / event.total) * 100));
    };
    xhr.onload = async () => {
      try {
        if (xhr.status < 200 || xhr.status >= 300) throw new Error("头像上传失败");
        const mediaData = JSON.parse(xhr.responseText) as { url?: string };
        if (!mediaData.url) throw new Error("上传结果缺少图片地址");
        const { error } = await authClient.updateUser({ image: mediaData.url });
        if (error) throw new Error(error.message || "更新头像失败");
        toast.success("头像已上传并同步");
        await refetch();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "头像上传失败");
      } finally {
        setAvatarLoading(false);
        if (fileInput.current) fileInput.current.value = "";
      }
    };
    xhr.onerror = () => {
      toast.error("网络错误或上传失败");
      setAvatarLoading(false);
    };
    xhr.send(formData);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 md:p-6">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Account</p>
        <h1 className="text-2xl font-semibold tracking-tight">个人中心</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理个人信息、头像与账号安全选项。</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-sm"><UserRound className="size-4" />基本信息</CardTitle>
            <CardDescription>头像和名称会显示在 Studio 的账户区域。</CardDescription>
          </CardHeader>
          <CardContent className="p-5 md:p-6">
            <div className="mb-7 flex flex-col items-center">
              <button type="button" className="group relative size-24 overflow-hidden rounded-full border bg-muted shadow-sm" onClick={() => fileInput.current?.click()} disabled={avatarLoading} aria-label="更换头像">
                {user?.image ? <img src={user.image} className="size-full object-cover" alt="用户头像" /> : <span className="flex size-full items-center justify-center bg-primary text-primary-foreground"><UserRound className="size-10" /></span>}
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {avatarLoading ? <><Loader2 className="size-5 animate-spin" /><small>{uploadProgress < 100 ? `${uploadProgress}%` : "同步中"}</small></> : <><Camera className="size-5" /><small>更换头像</small></>}
                </span>
              </button>
              <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && uploadAvatar(event.target.files[0])} />
              <p className="mt-3 font-medium">{user?.name || "管理员"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            <form className="grid gap-4" onSubmit={updateProfile}>
              <div className="grid gap-2">
                <Label htmlFor="profile-name">用户名</Label>
                <div className="relative"><UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="profile-name" className="pl-9" value={name} placeholder="你的名字" onChange={(event) => setName(event.target.value)} /></div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profile-email">电子邮箱</Label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="profile-email" className="pl-9" value={user?.email || ""} disabled /></div>
                <p className="text-xs text-muted-foreground">电子邮箱作为登录凭证，当前不在此页面修改。</p>
              </div>
              <Button className="mt-2 w-fit" type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Save />}保存更改</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 shadow-none">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="size-4" />安全设置</CardTitle>
            <CardDescription>修改密码并注销其他设备上的会话。</CardDescription>
          </CardHeader>
          <CardContent className="p-5 md:p-6">
            <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">修改密码后，其他设备需要重新登录。</div>
            <form className="grid gap-4" onSubmit={changePassword}>
              <PasswordField id="current-password" label="当前密码" value={currentPassword} placeholder="验证身份" onChange={setCurrentPassword} />
              <Separator />
              <PasswordField id="new-password" label="新密码" value={newPassword} placeholder="至少 8 位" onChange={setNewPassword} />
              <PasswordField id="confirm-password" label="确认新密码" value={confirmPassword} placeholder="再次输入新密码" onChange={setConfirmPassword} />
              <Button variant="destructive" className="mt-2 w-fit" type="submit" disabled={passwordLoading}>{passwordLoading ? <Loader2 className="animate-spin" /> : <LockKeyhole />}修改密码</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function PasswordField({ id, label, value, placeholder, onChange }: { id: string; label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id={id} type="password" autoComplete="new-password" className="pl-9" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div>
    </div>
  );
}
