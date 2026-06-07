"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Files,
  HardDrive,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  Trash2,
  Workflow,
  X
} from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { cn, formatSiteName, formatUserGroup, getInitials } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/files", label: "文件", icon: Files },
  { href: "/trash", label: "回收站", icon: Trash2 },
  { href: "/shares", label: "分享", icon: Link2 },
  { href: "/workflow", label: "离线任务", icon: Workflow },
  { href: "/billing", label: "商城", icon: ShoppingBag }
];

function getPageTitle(pathname: string) {
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return "设置";
  }

  return navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label ?? "";
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, site } = useAuth();

  return (
    <>
      <div
        className={cn("fixed inset-0 z-40 bg-black/50 md:hidden", open ? "block" : "hidden")}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col border-r bg-background transition-transform md:static md:z-auto md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardDrive className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{formatSiteName(site?.title)}</p>
              <p className="text-xs text-muted-foreground">个人网盘</p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose} aria-label="关闭导航">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <Separator />
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    active && "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <Separator />
        <Link
          href="/settings"
          onClick={onClose}
          className={cn(
            "flex items-center gap-3 p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground",
            (pathname === "/settings" || pathname.startsWith("/settings/")) && "bg-primary/10 text-primary"
          )}
          aria-label="打开用户设置"
        >
          <Avatar>
            <AvatarImage src="" />
            <AvatarFallback>{getInitials(user?.nickname || user?.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.nickname || user?.email || "网盘用户"}</p>
            <p className="truncate text-xs text-muted-foreground">{formatUserGroup(user?.group?.name) || user?.id}</p>
          </div>
        </Link>
      </aside>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [keyword, setKeyword] = React.useState("");
  const { theme, setTheme } = useTheme();
  const { signOut, site } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    const siteName = formatSiteName(site?.title);
    const pageTitle = getPageTitle(pathname);
    document.title = pageTitle ? `${pageTitle} - ${siteName}` : siteName;
  }, [pathname, site?.title]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = keyword.trim();
    if (!trimmed) {
      return;
    }
    router.push(`${pathname.startsWith("/trash") ? "/trash" : "/files"}?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)} aria-label="打开导航">
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => router.back()} aria-label="返回">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <form className="relative mr-auto max-w-2xl flex-1" onSubmit={handleSearch}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索文件名"
              className="h-10 pl-9"
            />
          </form>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="切换主题"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="退出登录">
            <LogOut className="h-5 w-5" />
          </Button>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
