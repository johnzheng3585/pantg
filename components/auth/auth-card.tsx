"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, RefreshCcw } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api/request";
import { authApi, siteApi } from "@/lib/api/services";
import type { CaptchaResponse, LoginResponse, SiteLoginConfig } from "@/lib/api/types";
import { useAuth } from "@/contexts/auth-context";
import { formatSiteName } from "@/lib/utils";

type Mode = "login" | "register" | "forgot";

export function AuthCard({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { saveSession, site } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [captcha, setCaptcha] = React.useState("");
  const [captchaData, setCaptchaData] = React.useState<CaptchaResponse | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [twoFaSession, setTwoFaSession] = React.useState<string | null>(null);
  const [otp, setOtp] = React.useState("");
  const [captchaRequired, setCaptchaRequired] = React.useState(false);

  const next = searchParams.get("next") || "/dashboard";

  const loadCaptcha = React.useCallback(async () => {
    try {
      const data = await siteApi.captcha();
      setCaptchaData(data);
      setCaptcha("");
    } catch {
      setCaptchaData(null);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;

    async function loadLoginConfig() {
      try {
        const config = await siteApi.config<SiteLoginConfig>("login");
        const required =
          mode === "login" ? Boolean(config.login_captcha) : mode === "register" ? Boolean(config.reg_captcha) : Boolean(config.forget_captcha);

        if (mounted) {
          setCaptchaRequired(required);
          if (required) {
            loadCaptcha();
          } else {
            setCaptchaData(null);
            setCaptcha("");
          }
        }
      } catch {
        if (mounted) {
          setCaptchaRequired(true);
          loadCaptcha();
        }
      }
    }

    loadLoginConfig();

    return () => {
      mounted = false;
    };
  }, [loadCaptcha, mode]);

  function getSubmitError(error: unknown) {
    if (error instanceof ApiError && (error.code === 40026 || error.code === 40027)) {
      return "验证码错误或已过期，请刷新验证码后重新输入。";
    }

    return error instanceof Error ? error.message : "请稍后重试。";
  }

  async function handleLogin(formEmail: string, formPassword: string, formCaptcha: string) {
    const result = await authApi.login({
      email: formEmail,
      password: formPassword,
      captcha: formCaptcha || undefined,
      ticket: captchaData?.ticket
    });

    if (typeof result === "string") {
      setTwoFaSession(result);
      toast({ title: "需要二次验证", description: "请输入认证器中的 6 位动态验证码。" });
      return;
    }

    saveSession(result as LoginResponse);
    router.replace(next);
  }

  async function handle2fa(formOtp: string) {
    if (!twoFaSession) {
      return;
    }

    const session = await authApi.finish2fa({ session_id: twoFaSession, otp: formOtp });
    saveSession(session);
    router.replace(next);
  }

  async function handleRegister(formEmail: string, formPassword: string, formCaptcha: string) {
    const result = await authApi.signUp({
      email: formEmail,
      password: formPassword,
      captcha: formCaptcha || undefined,
      ticket: captchaData?.ticket
    });

    toast({
      title: typeof result === "string" ? "注册请求已提交" : "注册成功",
      description: typeof result === "string" ? "请继续完成站点要求的验证。" : "现在可以使用新账号登录。"
    });
    router.push("/login");
  }

  async function handleForgot(formEmail: string, formCaptcha: string) {
    await authApi.sendResetEmail({
      email: formEmail,
      captcha: formCaptcha || undefined,
      ticket: captchaData?.ticket
    });
    toast({ title: "邮件已发送", description: "请检查邮箱中的重置密码链接。" });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formEmail = String(formData.get("email") ?? "");
    const formPassword = String(formData.get("password") ?? "");
    const formCaptcha = String(formData.get("captcha") ?? "").trim();
    const formOtp = String(formData.get("otp") ?? "").trim();

    setLoading(true);
    try {
      if (twoFaSession) {
        await handle2fa(formOtp);
      } else if (mode === "login") {
        await handleLogin(formEmail, formPassword, formCaptcha);
      } else if (mode === "register") {
        await handleRegister(formEmail, formPassword, formCaptcha);
      } else {
        await handleForgot(formEmail, formCaptcha);
      }
    } catch (error) {
      if (error instanceof ApiError && (error.code === 40026 || error.code === 40027)) {
        setCaptchaRequired(true);
      }

      toast({
        variant: "destructive",
        title: "提交失败",
        description: getSubmitError(error)
      });
    } finally {
      setLoading(false);
      if (!twoFaSession && captchaRequired) {
        loadCaptcha();
      }
    }
  }

  const siteName = formatSiteName(site?.title);
  const title = mode === "login" ? `登录 ${siteName}` : mode === "register" ? "创建账号" : "找回密码";
  const description =
    mode === "login"
      ? `登录后即可访问 ${siteName}。`
      : mode === "register"
        ? "使用站点开放注册创建账号。"
        : "向已注册邮箱发送重置密码链接。";

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login" asChild>
              <Link href="/login">登录</Link>
            </TabsTrigger>
            <TabsTrigger value="register" asChild>
              <Link href="/register">注册</Link>
            </TabsTrigger>
            <TabsTrigger value="forgot" asChild>
              <Link href="/forgot-password">找回</Link>
            </TabsTrigger>
          </TabsList>
          <TabsContent value={mode} />
        </Tabs>

        <form className="grid gap-4" onSubmit={onSubmit}>
          {twoFaSession ? (
            <div className="grid gap-2">
              <Label htmlFor="otp">二次验证码</Label>
              <Input
                id="otp"
                name="otp"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                inputMode="numeric"
                placeholder="000000"
                required
              />
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              {mode !== "forgot" ? (
                <div className="grid gap-2">
                  <Label htmlFor="password">密码</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={6}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-10 w-10"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ) : null}
              {captchaRequired ? (
                <div className="grid gap-2">
                  <Label htmlFor="captcha">验证码</Label>
                  <div className="grid gap-2 min-[520px]:grid-cols-[minmax(0,1fr)_160px_40px]">
                    <Input
                      id="captcha"
                      name="captcha"
                      value={captcha}
                      onChange={(event) => setCaptcha(event.target.value)}
                      placeholder="输入图形验证码"
                      className="min-w-0"
                      required
                    />
                    {captchaData ? (
                      <button
                        type="button"
                        className="h-10 w-full overflow-hidden rounded-md border bg-muted min-[520px]:w-40"
                        onClick={loadCaptcha}
                        aria-label="刷新验证码"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={captchaData.image} alt="验证码" className="h-full w-full object-contain" />
                      </button>
                    ) : (
                      <div className="h-10 w-full rounded-md bg-muted min-[520px]:w-40" />
                    )}
                    <Button type="button" variant="outline" size="icon" onClick={loadCaptcha} aria-label="刷新验证码" className="h-10 w-full min-[520px]:w-10">
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {twoFaSession ? "完成验证" : mode === "login" ? "登录" : mode === "register" ? "注册" : "发送重置邮件"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
