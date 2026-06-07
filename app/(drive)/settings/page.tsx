"use client";

import {
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Folder,
  FolderOpen,
  Home,
  KeyRound,
  Loader2,
  LockKeyhole,
  Palette,
  Plus,
  ShieldCheck,
  Tag,
  Trash2,
  Upload,
  UserCircle
} from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { EmptyState, ErrorState, LoadingPanel, PageHeader } from "@/components/page-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useAsync } from "@/hooks/use-async";
import { useToast } from "@/hooks/use-toast";
import { davApi, fileApi, userApi } from "@/lib/api/services";
import type { Preferences } from "@/lib/api/types";
import { buildBreadcrumbs, joinCloudreveUri } from "@/lib/file-uri";
import { createQrDataUri } from "@/lib/qr";
import { formatBytes, formatDate, formatSiteName, formatStoragePolicyName, formatStoragePolicyType, formatUserGroup, getInitials } from "@/lib/utils";

const languageOptions = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English" }
];

const themeOptions = [
  { value: "system", label: "系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "黑暗" }
];

const THEME_STORAGE_KEY = "cloudreve.ui.theme";

const shareProfileOptions = [
  { value: "hide_share", label: "仅展示无密码分享链接" },
  { value: "all_share", label: "展示全部分享链接" },
  { value: "none", label: "不展示分享链接" }
];

function toProfileVisibility(value?: string | null) {
  return value ? value : "none";
}

function fromProfileVisibility(value: string) {
  return value === "none" ? "" : value;
}

function formatDavUri(uri: string) {
  return buildBreadcrumbs(uri).map((item) => item.label).join(" / ");
}

function getOtpUri(secret: string, issuer: string, account: string) {
  const label = `${issuer}:${account}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30"
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

function isFolder(fileType: number) {
  return fileType === 1;
}

async function getCloudreveMeta() {
  const response = await fetch("/api/cloudreve-meta", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("WebDAV 地址读取失败");
  }
  return (await response.json()) as { siteUrl?: string; davUrl?: string };
}

function PreferenceRow({
  title,
  description,
  checked,
  disabled,
  onCheckedChange
}: {
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-4">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function SettingsPage() {
  const { user, site, setUser } = useAuth();
  const { setTheme } = useTheme();
  const prefs = useAsync(() => userApi.preferences(), []);
  const capacity = useAsync(() => userApi.capacity(), []);
  const policies = useAsync(() => userApi.policies(), []);
  const dav = useAsync(() => davApi.list({ page_size: 50 }), []);
  const webdavMeta = useAsync(() => getCloudreveMeta(), []);
  const [nickname, setNickname] = React.useState(user?.nickname ?? "");
  const [language, setLanguage] = React.useState(user?.language ?? "zh-CN");
  const [preferredTheme, setPreferredTheme] = React.useState("system");
  const [profileVisibility, setProfileVisibility] = React.useState(toProfileVisibility(user?.share_links_in_profile ?? "hide_share"));
  const [versionMax, setVersionMax] = React.useState(0);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [saving, setSaving] = React.useState<string | null>(null);
  const [twoFaOpen, setTwoFaOpen] = React.useState(false);
  const [twoFaSecret, setTwoFaSecret] = React.useState("");
  const [twoFaCode, setTwoFaCode] = React.useState("");
  const [davOpen, setDavOpen] = React.useState(false);
  const [davName, setDavName] = React.useState("");
  const [davUri, setDavUri] = React.useState("cloudreve://my");
  const [davBrowseUri, setDavBrowseUri] = React.useState("cloudreve://my");
  const [davPickerOpen, setDavPickerOpen] = React.useState(false);
  const [davAdvancedOpen, setDavAdvancedOpen] = React.useState(false);
  const [davReadonly, setDavReadonly] = React.useState(false);
  const [davProxy, setDavProxy] = React.useState(true);
  const [davDisableSysFiles, setDavDisableSysFiles] = React.useState(false);
  const davBrowser = useAsync(
    () => fileApi.list({ uri: davBrowseUri, page_size: 100, order_by: "name", order_direction: "asc", toastError: false }),
    [davBrowseUri]
  );
  const { toast } = useToast();

  const davAccounts = dav.data?.accounts ?? [];
  const davUrl = webdavMeta.data?.davUrl ?? "";
  const davUrlText = webdavMeta.error ? "WebDAV 地址读取失败" : davUrl || "正在读取";
  const used = capacity.data?.used ?? 0;
  const total = capacity.data?.total ?? 0;
  const capacityPercent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const siteName = formatSiteName(site?.title);
  const otpUri = twoFaSecret ? getOtpUri(twoFaSecret, siteName, user?.email || user?.nickname || siteName) : "";
  const otpQr = otpUri ? createQrDataUri(otpUri) : "";
  const folderItems = (davBrowser.data?.files ?? []).filter((file) => isFolder(file.type));

  React.useEffect(() => {
    setNickname(user?.nickname ?? "");
    setLanguage(user?.language ?? "zh-CN");
    setProfileVisibility(toProfileVisibility(user?.share_links_in_profile ?? "hide_share"));
  }, [user]);

  React.useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) || user?.preferred_theme || "system";
      setPreferredTheme(storedTheme);
      setTheme(storedTheme);
    } catch {
      setPreferredTheme(user?.preferred_theme || "system");
      setTheme(user?.preferred_theme || "system");
    }
  }, [setTheme, user?.preferred_theme]);

  React.useEffect(() => {
    if (prefs.data) {
      setVersionMax(prefs.data.version_retention_max ?? 0);
    }
  }, [prefs.data]);

  async function copyText(text: string, title = "已复制") {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title });
    } catch {
      toast({ variant: "destructive", title: "复制失败", description: "请手动复制这项内容。" });
    }
  }

  async function updatePreferences(payload: Partial<Preferences> & Record<string, unknown>, message = "设置已保存") {
    setSaving(message);
    try {
      await userApi.updatePreferences(payload);
      toast({ title: message });
      prefs.reload();
    } finally {
      setSaving(null);
    }
  }

  function updateThemePreference(value: string) {
    setPreferredTheme(value);
    setTheme(value);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // Local preference only; ignore storage failures.
    }
    toast({ title: "主题偏好已更新" });
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("profile");
    try {
      await userApi.updatePreferences({
        nickname,
        language,
        share_links_in_profile: fromProfileVisibility(profileVisibility)
      });
      if (user) {
        setUser({ ...user, nickname, language, share_links_in_profile: fromProfileVisibility(profileVisibility) });
      }
      toast({ title: "资料已保存" });
    } finally {
      setSaving(null);
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("password");
    try {
      await userApi.updatePreferences({
        current_password: currentPassword,
        new_password: newPassword
      });
      setCurrentPassword("");
      setNewPassword("");
      toast({ title: "密码已更新" });
    } finally {
      setSaving(null);
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving("avatar");
    try {
      await userApi.updateAvatar(file);
      toast({ title: "头像已更新" });
    } finally {
      setSaving(null);
    }
  }

  async function openTwoFaDialog() {
    setSaving("2fa");
    try {
      const secret = await userApi.prepare2fa();
      setTwoFaSecret(secret);
      setTwoFaCode("");
      setTwoFaOpen(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "无法启用二步验证",
        description: error instanceof Error ? error.message : "请稍后重试。"
      });
    } finally {
      setSaving(null);
    }
  }

  async function enableTwoFa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = twoFaCode.trim();
    if (code.length < 6) {
      toast({ variant: "destructive", title: "请输入 6 位验证码" });
      return;
    }

    setSaving("2fa-confirm");
    try {
      await userApi.updatePreferences({
        two_fa_enabled: true,
        two_fa_code: code
      });
      toast({ title: "二步验证已启用" });
      setTwoFaOpen(false);
      prefs.reload();
    } finally {
      setSaving(null);
    }
  }

  function openCreateDav() {
    setDavName("");
    setDavUri("cloudreve://my");
    setDavBrowseUri("cloudreve://my");
    setDavReadonly(false);
    setDavProxy(true);
    setDavDisableSysFiles(false);
    setDavPickerOpen(false);
    setDavAdvancedOpen(false);
    setDavOpen(true);
  }

  async function createDav(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving("dav");
    try {
      await davApi.create({
        name: davName.trim(),
        uri: davUri,
        readonly: davReadonly,
        proxy: davProxy,
        disable_sys_files: davDisableSysFiles
      });
      toast({ title: "WebDAV 账号已创建" });
      setDavOpen(false);
      dav.reload();
    } finally {
      setSaving(null);
    }
  }

  async function deleteDav(id: string) {
    setSaving(id);
    try {
      await davApi.delete(id);
      toast({ title: "WebDAV 账号已删除" });
      dav.reload();
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="container page-enter grid gap-6 py-6">
      <PageHeader title="设置" description="管理个人资料、偏好、安全、存储空间和 WebDAV 账号。" />

      <Tabs defaultValue="profile">
        <TabsList className="h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <UserCircle className="mr-2 h-4 w-4" />
            个人资料
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Palette className="mr-2 h-4 w-4" />
            偏好
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <LockKeyhole className="mr-2 h-4 w-4" />
            密码和安全
          </TabsTrigger>
          <TabsTrigger value="storage" className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Database className="mr-2 h-4 w-4" />
            存储空间
          </TabsTrigger>
          <TabsTrigger value="webdav" className="rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <FolderOpen className="mr-2 h-4 w-4" />
            WebDAV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <form className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]" onSubmit={saveProfile}>
            <div className="grid max-w-3xl gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email">电子邮箱</Label>
                <Input id="email" value={user?.email ?? ""} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nickname">昵称</Label>
                <Input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium">UID</p>
                  <p className="mt-2 text-sm text-muted-foreground">{user?.id || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">注册时间</p>
                  <p className="mt-2 text-sm text-muted-foreground">{formatDate(user?.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">用户组</p>
                  <p className="mt-2 text-sm text-muted-foreground">{formatUserGroup(user?.group?.name)}</p>
                </div>
                <div className="grid gap-2">
                  <Label>个人主页</Label>
                  <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {shareProfileOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-fit" disabled={saving === "profile"}>
                {saving === "profile" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                保存资料
              </Button>
            </div>

            <div className="grid content-start gap-3">
              <Label>头像</Label>
              <div className="flex h-52 w-52 items-center justify-center rounded-lg bg-destructive text-destructive-foreground">
                <span className="text-7xl font-semibold">{getInitials(user?.nickname || user?.email).slice(0, 1).toLowerCase()}</span>
              </div>
              <Button type="button" variant="outline" asChild className="w-fit">
                <label>
                  {saving === "avatar" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  编辑
                  <input className="sr-only" type="file" accept="image/*" onChange={uploadAvatar} />
                </label>
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          {prefs.loading ? <LoadingPanel rows={3} /> : null}
          {prefs.error ? <ErrorState description={prefs.error.message} onRetry={prefs.reload} /> : null}
          {prefs.data ? (
            <div className="grid max-w-3xl gap-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>语言</Label>
                  <Select value={language} onValueChange={(value) => {
                    setLanguage(value);
                    if (user) {
                      setUser({ ...user, language: value });
                    }
                    updatePreferences({ language: value }, "语言已更新");
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">设置应用显示语言。</p>
                </div>
                <div className="grid gap-2">
                  <Label>暗色模式</Label>
                  <Select value={preferredTheme} onValueChange={updateThemePreference}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {themeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">选择站点主题偏好。</p>
                </div>
              </div>

              <div className="grid gap-3">
                <p className="font-medium">版本保留</p>
                <div className="rounded-md border p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={Boolean(prefs.data.version_retention_enabled)}
                      onCheckedChange={(checked) => updatePreferences({ version_retention_enabled: Boolean(checked) }, "版本保留已更新")}
                    />
                    <div>
                      <p className="text-sm font-medium">启用版本保留</p>
                      <p className="text-xs text-muted-foreground">启用后，对于符合条件的文件，系统会保留历史版本。</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <Label htmlFor="version-count">最大版本数量</Label>
                    <Input
                      id="version-count"
                      type="number"
                      min={0}
                      value={versionMax}
                      onChange={(event) => setVersionMax(Number(event.target.value))}
                      onBlur={() => updatePreferences({ version_retention_max: versionMax }, "版本数量已更新")}
                    />
                    <p className="text-xs text-muted-foreground">0 表示无限制。</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <p className="font-medium">视图设置</p>
                <PreferenceRow
                  title="同步到服务器"
                  description="记住各目录的视图设置，并同步到服务器。"
                  checked={!prefs.data.disable_view_sync}
                  onCheckedChange={(checked) => updatePreferences({ disable_view_sync: !checked }, "视图设置已更新")}
                />
                <PreferenceRow
                  title="自动展开树视图"
                  description="进入目录时，侧边文件树会跟随当前目录自动展开。"
                  checked={Boolean(prefs.data.auto_expand_tree)}
                  onCheckedChange={(checked) => updatePreferences({ auto_expand_tree: checked }, "树视图偏好已更新")}
                />
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="grid max-w-3xl gap-7">
            <form className="grid gap-3" onSubmit={savePassword}>
              <p className="font-medium">密码</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">当前密码</Label>
                  <Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">新密码</Label>
                  <Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                </div>
              </div>
              <Button type="submit" variant="outline" className="w-fit" disabled={saving === "password" || !currentPassword || !newPassword}>
                {saving === "password" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                重设密码
              </Button>
            </form>

            <div className="grid gap-3">
              <p className="font-medium">二步验证</p>
              <div className="flex items-center justify-between gap-4 rounded-md border p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <p className="font-medium">二步验证</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">启用后，登录时需要输入认证器 APP 中的 6 位验证码。</p>
                </div>
                {prefs.data?.two_fa_enabled ? (
                  <Badge variant="success">已启用</Badge>
                ) : (
                  <Button type="button" variant="outline" onClick={openTwoFaDialog} disabled={saving === "2fa"}>
                    {saving === "2fa" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    启用二步验证
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <p className="font-medium">最近登录活动</p>
              <div className="rounded-md border">
                <div className="grid grid-cols-2 border-b px-4 py-3 text-sm font-medium">
                  <span>登录方式</span>
                  <span>时间</span>
                </div>
                {prefs.data?.login_activity?.length ? (
                  <div className="divide-y">
                    {prefs.data.login_activity.slice(0, 5).map((item, index) => (
                      <div key={index} className="grid grid-cols-2 px-4 py-3 text-sm">
                        <span>密码</span>
                        <span>{typeof item === "object" && item && "created_at" in item ? formatDate(String(item.created_at)) : "-"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">没有记录</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="storage" className="mt-6">
          <div className="grid max-w-4xl gap-7">
            <div className="grid gap-3">
              <p className="font-medium">容量配额</p>
              {capacity.loading ? <LoadingPanel rows={1} /> : null}
              {capacity.error ? <ErrorState description={capacity.error.message} onRetry={capacity.reload} /> : null}
              {capacity.data ? (
                <div className="grid gap-3">
                  <Progress value={capacityPercent} className="h-2.5" />
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>已使用：{formatBytes(used)}</span>
                    <span>基础容量：{formatBytes(Math.max(total - (capacity.data.storage_pack_total ?? 0), 0))}</span>
                    <span>扩容容量：{formatBytes(capacity.data.storage_pack_total ?? 0)}</span>
                    <span>总容量：{formatBytes(total)}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3">
              <p className="font-medium">有效扩容</p>
              <div className="rounded-md border">
                <div className="grid grid-cols-3 border-b px-4 py-3 text-sm font-medium">
                  <span>名称</span>
                  <span>大小</span>
                  <span>过期日期</span>
                </div>
                {prefs.data?.storage_packs?.length ? (
                  <div className="divide-y">
                    {prefs.data.storage_packs.map((pack, index) => (
                      <div key={index} className="grid grid-cols-3 px-4 py-3 text-sm">
                        <span>容量包</span>
                        <span>{typeof pack === "object" && pack && "size" in pack ? formatBytes(Number(pack.size)) : "-"}</span>
                        <span>{typeof pack === "object" && pack && "expires" in pack ? formatDate(String(pack.expires)) : "-"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">没有记录</p>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <p className="font-medium">可用存储策略</p>
              {policies.loading ? <LoadingPanel rows={2} /> : null}
              {policies.error ? <ErrorState description={policies.error.message} onRetry={policies.reload} /> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {policies.data?.map((policy) => (
                  <Card key={policy.id} className="soft-card">
                    <CardHeader>
                      <CardTitle className="text-base">{formatStoragePolicyName(policy.name, policy.type)}</CardTitle>
                      <CardDescription>{formatStoragePolicyType(policy.type)}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">单文件上限</span>
                        <span>{policy.max_size ? formatBytes(policy.max_size) : "不限"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">上传方式</span>
                        <span>{policy.relay || policy.type === "local" ? "中转上传" : "直传"}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="webdav" className="mt-6">
          <div className="mb-4 flex justify-end">
            <Button onClick={openCreateDav}>
              <Plus className="mr-2 h-4 w-4" />
              新建 WebDAV
            </Button>
          </div>
          {dav.loading ? <LoadingPanel rows={3} /> : null}
          {dav.error ? <ErrorState description={dav.error.message} onRetry={dav.reload} /> : null}
          {!dav.loading && !dav.error && !davAccounts.length ? <EmptyState title="暂无 WebDAV 账号" /> : null}
          <div className="grid gap-3">
            {davAccounts.map((account) => (
              <Card key={account.id} className="soft-card">
                <CardContent className="grid gap-4 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">创建 {formatDate(account.created_at)}</p>
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => deleteDav(account.id)} disabled={saving === account.id} aria-label="删除 WebDAV">
                      {saving === account.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">服务地址</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate font-medium">{davUrlText}</p>
                        {davUrl ? (
                          <Button variant="outline" size="icon" onClick={() => copyText(davUrl, "WebDAV 地址已复制")} aria-label="复制 WebDAV 地址">
                            <Copy className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">用户名</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate font-medium">{account.id}</p>
                        <Button variant="outline" size="icon" onClick={() => copyText(account.id, "用户名已复制")} aria-label="复制 WebDAV 用户名">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">密码</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate font-medium">••••••••••••</p>
                        <Button variant="outline" size="icon" onClick={() => copyText(account.password, "密码已复制")} aria-label="复制 WebDAV 密码">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">绑定目录</p>
                      <p className="mt-1 truncate font-medium">{formatDavUri(account.uri)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={twoFaOpen} onOpenChange={setTwoFaOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>启用二步验证</DialogTitle>
          </DialogHeader>
          <form className="grid gap-5" onSubmit={enableTwoFa}>
            <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
              <div className="flex min-h-44 items-center justify-center rounded-md border bg-white p-4">
                {otpQr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={otpQr} alt="二步验证二维码" className="h-40 w-40" />
                ) : (
                  <span className="text-center text-xs text-muted-foreground">正在生成二维码...</span>
                )}
              </div>
              <div className="grid gap-3 text-sm">
                <p className="text-muted-foreground">请使用任意二步验证 APP 扫描二维码或添加下方密钥，然后填写认证器给出的 6 位验证码。</p>
                <div className="grid gap-2">
                  <Label>密钥</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={twoFaSecret} />
                    <Button type="button" variant="outline" size="icon" onClick={() => copyText(twoFaSecret, "密钥已复制")} aria-label="复制密钥">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button type="button" variant="outline" className="w-fit" onClick={() => copyText(otpUri, "认证器 URI 已复制")}>
                  <Copy className="mr-2 h-4 w-4" />
                  复制认证器 URI
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="two-fa-code">6 位验证码</Label>
              <Input
                id="two-fa-code"
                value={twoFaCode}
                onChange={(event) => setTwoFaCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="000000"
                className="max-w-xs text-lg tracking-[0.5em]"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTwoFaOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={saving === "2fa-confirm" || twoFaCode.length < 6}>
                {saving === "2fa-confirm" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                启用
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={davOpen} onOpenChange={setDavOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>创建 WebDAV 账号</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={createDav}>
            <div className="grid gap-2">
              <Label htmlFor="dav-name">备注名</Label>
              <div className="relative">
                <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="dav-name" value={davName} onChange={(event) => setDavName(event.target.value)} className="pl-9" required />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>相对根目录</Label>
              <button
                type="button"
                className="flex h-14 items-center justify-between rounded-md border bg-background px-3 text-left text-sm hover:bg-muted/50"
                onClick={() => {
                  setDavBrowseUri(davUri);
                  setDavPickerOpen((value) => !value);
                }}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Home className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{formatDavUri(davUri)}</span>
                </span>
                {davPickerOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
              {davPickerOpen ? (
                <div className="rounded-md border">
                  <div className="flex flex-wrap items-center gap-1 border-b p-2">
                    {buildBreadcrumbs(davBrowseUri).map((crumb) => (
                      <Button key={crumb.uri} type="button" variant="ghost" size="sm" onClick={() => setDavBrowseUri(crumb.uri)}>
                        {crumb.label}
                      </Button>
                    ))}
                  </div>
                  <div className="max-h-56 overflow-y-auto p-2">
                    {davBrowser.loading ? <LoadingPanel rows={2} /> : null}
                    {davBrowser.error ? <p className="p-3 text-sm text-destructive">{davBrowser.error.message}</p> : null}
                    {!davBrowser.loading && !davBrowser.error && !folderItems.length ? (
                      <p className="p-3 text-center text-sm text-muted-foreground">当前目录没有子文件夹</p>
                    ) : null}
                    <div className="grid gap-1">
                      {folderItems.map((folder) => (
                        <button
                          key={folder.path}
                          type="button"
                          className="flex items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => setDavBrowseUri(folder.path || joinCloudreveUri(davBrowseUri, folder.name))}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate">{folder.name}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end border-t p-2">
                    <Button type="button" size="sm" onClick={() => {
                      setDavUri(davBrowseUri);
                      setDavPickerOpen(false);
                    }}>
                      使用此目录
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              <button
                type="button"
                className="flex h-10 items-center justify-between rounded-md bg-muted px-3 text-left text-sm font-medium"
                onClick={() => setDavAdvancedOpen((value) => !value)}
              >
                高级选项
                {davAdvancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {davAdvancedOpen ? (
                <div className="grid gap-3 rounded-md border p-3">
                  <PreferenceRow title="只读" checked={davReadonly} onCheckedChange={setDavReadonly} />
                  <PreferenceRow title="反代下载" description="通过服务端中转 WebDAV 下载请求。" checked={davProxy} onCheckedChange={setDavProxy} />
                  <PreferenceRow title="隐藏系统文件" description="不暴露系统生成的辅助文件。" checked={davDisableSysFiles} onCheckedChange={setDavDisableSysFiles} />
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDavOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={saving === "dav" || !davName.trim()}>
                {saving === "dav" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                确定
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
