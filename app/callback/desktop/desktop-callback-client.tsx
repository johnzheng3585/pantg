"use client";

import { ArrowRight, Copy, MonitorCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

function buildDesktopCallbackUrl(search: string) {
  return `cloudreve://callback/desktop${search}`;
}

export function DesktopCallbackClient() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const search = React.useMemo(() => {
    const params = searchParams.toString();
    return params ? `?${params}` : "";
  }, [searchParams]);
  const callbackUrl = React.useMemo(() => buildDesktopCallbackUrl(search), [search]);

  React.useEffect(() => {
    if (!search) return;
    window.location.href = callbackUrl;
  }, [callbackUrl, search]);

  const copyCallback = React.useCallback(async () => {
    await navigator.clipboard.writeText(callbackUrl);
    toast({
      title: "已复制回调链接",
      description: "如果桌面端没有自动响应，可以手动打开这个链接。"
    });
  }, [callbackUrl, toast]);

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center justify-center">
        <Card className="w-full">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <MonitorCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">正在打开糖果盘桌面端</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  授权已返回到网站，正在交给桌面客户端完成同步配置。
                </p>
              </div>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              如果浏览器询问是否允许打开外部应用，请选择允许。
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <a href={callbackUrl}>
                  打开桌面端
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button variant="outline" onClick={copyCallback}>
                <Copy className="mr-2 h-4 w-4" />
                复制回调
              </Button>
            </div>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/">返回首页</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
