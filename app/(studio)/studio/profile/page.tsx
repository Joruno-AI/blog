/* eslint-disable @next/next/no-img-element */
"use client";

import { Button, Card, Description, Input, Label, Separator, Spinner, TextField } from "@heroui/react";
import { Camera, LockKeyhole, Save, ShieldCheck, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
    } catch (error) { toast.error(error instanceof Error ? error.message : "个人资料加载失败"); }
    finally { setIsPending(false); }
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);
  useEffect(() => { if (user?.name) setName(user.name); }, [user?.name]);

  if (isPending) return <div className="studio-empty-state min-h-[60vh]"><Spinner size="sm" />加载个人资料</div>;

  async function updateProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) { toast.error("请输入用户名"); return; }
    setLoading(true);
    try {
      const { error } = await authClient.updateUser({ name: name.trim() });
      if (error) throw new Error(error.message || "更新失败");
      toast.success("个人信息更新成功"); await refetch();
    } catch (error) { toast.error(error instanceof Error ? error.message : "请求出错"); }
    finally { setLoading(false); }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (!currentPassword || newPassword.length < 8) { toast.error("请填写当前密码，新密码至少 8 位"); return; }
    if (newPassword !== confirmPassword) { toast.error("两次输入的新密码不一致"); return; }
    setPasswordLoading(true);
    try {
      const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (error) throw new Error(error.message || "密码修改失败");
      toast.success("密码修改成功"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "请求出错"); }
    finally { setPasswordLoading(false); }
  }

  function uploadAvatar(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("请选择图片文件"); return; }
    setAvatarLoading(true); setUploadProgress(0);
    const formData = new FormData(); formData.append("file", file);
    const xhr = new XMLHttpRequest(); xhr.open("POST", "/api/media", true);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) setUploadProgress(Math.floor((event.loaded / event.total) * 100)); };
    xhr.onload = async () => {
      try {
        if (xhr.status < 200 || xhr.status >= 300) throw new Error("头像上传失败");
        const mediaData = JSON.parse(xhr.responseText) as { url?: string };
        if (!mediaData.url) throw new Error("上传结果缺少图片地址");
        const { error } = await authClient.updateUser({ image: mediaData.url });
        if (error) throw new Error(error.message || "更新头像失败");
        toast.success("头像已上传并同步"); await refetch();
      } catch (error) { toast.error(error instanceof Error ? error.message : "头像上传失败"); }
      finally { setAvatarLoading(false); if (fileInput.current) fileInput.current.value = ""; }
    };
    xhr.onerror = () => { toast.error("网络错误或上传失败"); setAvatarLoading(false); };
    xhr.send(formData);
  }

  return (
    <main className="studio-dashboard studio-profile-page">
      <section className="studio-page-heading"><div><p className="studio-eyebrow">Account</p><h1>个人中心</h1><p>管理个人信息、头像与账号安全选项。</p></div></section>
      <div className="studio-profile-grid">
        <Card className="studio-panel">
          <Card.Header className="studio-panel-heading"><span><Card.Title className="flex items-center gap-2 text-sm"><UserRound className="size-4" />基本信息</Card.Title><Card.Description className="mt-1 text-xs">头像和名称会显示在 Studio 的账户区域。</Card.Description></span></Card.Header>
          <Card.Content className="studio-form-content">
            <div className="studio-avatar-editor">
              <button aria-label="更换头像" disabled={avatarLoading} onClick={() => fileInput.current?.click()} type="button">
                {user?.image ? <img alt="用户头像" src={user.image} /> : <span><UserRound className="size-10" /></span>}
                <i>{avatarLoading ? <><Spinner color="current" size="sm" /><small>{uploadProgress < 100 ? `${uploadProgress}%` : "同步中"}</small></> : <><Camera className="size-5" /><small>更换头像</small></>}</i>
              </button>
              <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && uploadAvatar(event.target.files[0])} />
              <strong>{user?.name || "管理员"}</strong><small>{user?.email}</small>
            </div>
            <form className="grid gap-4" onSubmit={updateProfile}>
              <TextField isRequired value={name} onChange={setName}><Label>用户名</Label><Input placeholder="你的名字" /></TextField>
              <TextField isDisabled value={user?.email || ""}><Label>电子邮箱</Label><Input /><Description>作为登录凭证，当前不在此页面修改。</Description></TextField>
              <Button className="w-fit" isDisabled={loading} type="submit">{loading ? <Spinner color="current" size="sm" /> : <Save className="size-4" />}保存更改</Button>
            </form>
          </Card.Content>
        </Card>

        <Card className="studio-panel">
          <Card.Header className="studio-panel-heading"><span><Card.Title className="flex items-center gap-2 text-sm"><ShieldCheck className="size-4" />安全设置</Card.Title><Card.Description className="mt-1 text-xs">修改密码并注销其他设备上的会话。</Card.Description></span></Card.Header>
          <Card.Content className="studio-form-content">
            <p className="studio-security-note">修改密码后，其他设备需要重新登录。</p>
            <form className="grid gap-4" onSubmit={changePassword}>
              <PasswordField label="当前密码" value={currentPassword} placeholder="验证身份" onChange={setCurrentPassword} />
              <Separator />
              <PasswordField label="新密码" value={newPassword} placeholder="至少 8 位" onChange={setNewPassword} />
              <PasswordField label="确认新密码" value={confirmPassword} placeholder="再次输入新密码" onChange={setConfirmPassword} />
              <Button className="w-fit" isDisabled={passwordLoading} type="submit" variant="danger">{passwordLoading ? <Spinner color="current" size="sm" /> : <LockKeyhole className="size-4" />}修改密码</Button>
            </form>
          </Card.Content>
        </Card>
      </div>
    </main>
  );
}

function PasswordField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return <TextField type="password" value={value} onChange={onChange}><Label>{label}</Label><Input autoComplete="new-password" placeholder={placeholder} /></TextField>;
}
