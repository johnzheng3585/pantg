"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CloudUpload,
  DownloadCloud,
  Files,
  Folder,
  Globe2,
  HardDrive,
  KeyRound,
  Link2,
  Lock,
  Moon,
  Play,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Workflow,
  Zap
} from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { siteApi } from "@/lib/api/services";
import { getTokenPair } from "@/lib/api/token-store";
import type { SiteBasicConfig } from "@/lib/api/types";
import { cn, formatSiteName } from "@/lib/utils";

const highlights = [
  { label: "文件管理", icon: Files },
  { label: "分享链接", icon: Share2 },
  { label: "离线任务", icon: Workflow },
  { label: "WebDAV", icon: Globe2 }
];

const featureCards = [
  {
    title: "清晰的文件工作台",
    description: "列表、网格、面包屑、右键菜单和拖拽上传都在一个界面里完成。",
    icon: Folder
  },
  {
    title: "安全分享与访问",
    description: "创建分享链接、管理分享记录，并为访问控制保留清晰入口。",
    icon: ShieldCheck
  },
  {
    title: "远程任务不中断",
    description: "离线下载和工作流进度集中查看，下载位置可直接选择文件夹。",
    icon: DownloadCloud
  }
];

const previewFiles = [
  { name: "项目资料", type: "文件夹", accent: "bg-sky-500" },
  { name: "设计稿.png", type: "图片", accent: "bg-emerald-500" },
  { name: "合同文档.docx", type: "文档", accent: "bg-amber-500" },
  { name: "演示文件.pptx", type: "演示", accent: "bg-rose-500" }
];

export default function GuestLandingPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [siteName, setSiteName] = React.useState("个人网盘");
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    setIsAuthenticated(Boolean(getTokenPair()));

    let mounted = true;
    siteApi
      .config<SiteBasicConfig>("basic", { timeoutMs: 6000 })
      .then((config) => {
        if (!mounted) {
          return;
        }
        const nextName = formatSiteName(config.title);
        setSiteName(nextName);
        document.title = nextName;
      })
      .catch(() => {
        document.title = "个人网盘";
      });

    return () => {
      mounted = false;
    };
  }, []);

  const primaryHref = isAuthenticated ? "/dashboard" : "/login";
  const primaryText = isAuthenticated ? "进入网盘" : "登录使用";

  return (
    <main className="min-h-dvh overflow-hidden bg-background text-foreground">
      <section className="border-b bg-background">
        <div className="container page-enter flex min-h-dvh flex-col py-5 lg:py-6">
          <header className="flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                <HardDrive className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{siteName}</p>
                <p className="text-xs text-muted-foreground">现代化网盘用户端</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                aria-label="切换暗色模式"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
              <Button variant="outline" asChild className="hidden sm:inline-flex">
                <Link href="/login">登录</Link>
              </Button>
              <Button asChild>
                <Link href={primaryHref}>
                  {primaryText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </header>

          <div className="grid flex-1 gap-10 pt-14 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:pt-8">
            <div className="grid max-w-2xl gap-7 pb-4 lg:pb-14">
              <Badge variant="secondary" className="w-fit gap-2 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5" />
                面向用户的网盘入口
              </Badge>
              <div className="grid gap-4">
                <h1 className="max-w-[760px] text-balance text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
                  用更轻快的方式管理文件、分享与离线任务
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                  这是连接现有后端接口的用户前端。游客可以先了解能力，登录后进入仪表盘、文件管理器、分享、商城和设置。
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href={primaryHref}>
                    {primaryText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/register">
                    创建账号
                    <KeyRound className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {highlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-2 rounded-md border bg-card/70 px-3 py-2 text-sm shadow-sm backdrop-blur">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative pb-10 lg:pb-14">
              <div className="landing-preview mx-auto max-w-3xl rounded-lg border bg-card shadow-2xl shadow-primary/10">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="relative hidden w-64 sm:block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <div className="h-9 rounded-md border bg-background pl-9 pr-3 text-sm leading-9 text-muted-foreground">搜索文件名</div>
                </div>
              </div>
              <div className="grid min-h-[420px] md:grid-cols-[180px_1fr]">
                <aside className="hidden border-r bg-muted/35 p-3 md:block">
                  <div className="mb-4 flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                    <Files className="h-4 w-4" />
                    我的文件
                  </div>
                  {["分享", "离线任务", "商城", "设置"].map((item) => (
                    <div key={item} className="mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                      {item}
                    </div>
                  ))}
                </aside>
                <div className="grid content-start gap-4 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold">文件管理器</p>
                      <p className="text-sm text-muted-foreground">拖拽上传、右键操作、缩略图预览</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Folder className="mr-2 h-4 w-4" />
                        新建文件夹
                      </Button>
                      <Button size="sm">
                        <CloudUpload className="mr-2 h-4 w-4" />
                        上传
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-dashed bg-background/70 p-4">
                    <div className="mb-4 grid gap-3 sm:grid-cols-3">
                      <Metric label="可用容量" value="1.0 GB" icon={HardDrive} />
                      <Metric label="分享链接" value="0" icon={Link2} />
                      <Metric label="工作流" value="就绪" icon={Zap} />
                    </div>
                    <div className="grid gap-2">
                      {previewFiles.map((file, index) => (
                        <div
                          key={file.name}
                          className={cn(
                            "landing-file-row flex items-center justify-between rounded-md border bg-card px-3 py-3 shadow-sm",
                            index === 1 && "landing-delay-1",
                            index === 2 && "landing-delay-2",
                            index === 3 && "landing-delay-3"
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={cn("flex h-9 w-9 items-center justify-center rounded-md text-white", file.accent)}>
                              <Folder className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{file.type}</p>
                            </div>
                          </div>
                          <Check className="h-4 w-4 text-success" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container grid gap-5 py-10 md:grid-cols-3">
        {featureCards.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="soft-card">
              <CardContent className="grid gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="grid gap-2">
                  <h2 className="text-lg font-semibold">{feature.title}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="container pb-12">
        <div className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="text-xl font-semibold">准备开始管理你的文件？</h2>
            <p className="mt-1 text-sm text-muted-foreground">登录后即可进入完整用户端，所有数据都来自当前后端接口。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => router.push("/login")}>
              <Play className="mr-2 h-4 w-4" />
              立即登录
            </Button>
            <Button onClick={() => router.push("/dashboard")}>
              进入网盘
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t py-6">
        <div className="container flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{siteName}</span>
          <span className="inline-flex items-center gap-2">
            <Lock className="h-4 w-4" />
            接口直连，登录后访问私有资源
          </span>
        </div>
      </footer>
    </main>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
