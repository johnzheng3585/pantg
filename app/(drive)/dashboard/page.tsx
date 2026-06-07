"use client";

import Link from "next/link";
import { ArrowRight, Clock3, FolderPlus, HardDrive, Link2, Plus, ShoppingBag, Upload, UserCircle, Workflow } from "lucide-react";

import { EmptyState, ErrorState, PageHeader } from "@/components/page-state";
import { FileIcon } from "@/components/file-manager/file-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useAsync } from "@/hooks/use-async";
import { fileApi, shareApi, userApi, workflowApi } from "@/lib/api/services";
import { fileRouteFromUri } from "@/lib/file-uri";
import { formatBytes, formatDate, formatTaskStatus, formatUserGroup, formatWorkflowType, isFailedStatus, isFinishedStatus } from "@/lib/utils";
import type { FileResponse } from "@/lib/api/types";

function StatCard({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="mt-1 truncate text-lg font-semibold">{value}</div>
          {detail ? <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function fileHref(file: FileResponse, parentPath?: string) {
  return fileRouteFromUri(file.type === 1 ? file.path : parentPath || "cloudreve://my");
}

export default function DashboardPage() {
  const { user } = useAuth();
  const capacity = useAsync(() => userApi.capacity(), []);
  const recentFiles = useAsync(() => fileApi.list({ uri: "cloudreve://my", page_size: 50, order_by: "updated_at", order_direction: "desc", toastError: false }), []);
  const shares = useAsync(() => shareApi.listMine({ page_size: 50, toastError: false }), []);
  const tasks = useAsync(() => workflowApi.list({ page_size: 50, category: "general", toastError: false }), []);

  const used = capacity.data?.used ?? 0;
  const total = capacity.data?.total ?? 0;
  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const recentFileItems = (recentFiles.data?.files ?? []).slice(0, 8);
  const shareItems = (shares.data?.shares ?? []).slice(0, 5);
  const taskItems = (tasks.data?.tasks ?? []).slice(0, 5);
  const activeTasks = taskItems.filter((task) => task.status !== "completed").length;

  return (
    <div className="container page-enter grid gap-6 py-6">
      <PageHeader
        title={`你好，${user?.nickname || user?.email || "网盘用户"}`}
        description="容量、文件和任务状态都在这里汇总。"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/files">
                <FolderPlus className="mr-2 h-4 w-4" />
                打开文件
              </Link>
            </Button>
            <Button asChild>
              <Link href="/files">
                <Upload className="mr-2 h-4 w-4" />
                上传
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="soft-card md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HardDrive className="h-4 w-4" />
                  存储容量
                </CardTitle>
                <CardDescription>当前账号可用空间</CardDescription>
              </div>
              <Badge variant={percent > 85 ? "warning" : "secondary"}>{percent}%</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {capacity.loading ? (
              <Skeleton className="h-20 w-full" />
            ) : capacity.error ? (
              <p className="text-sm text-destructive">{capacity.error.message}</p>
            ) : (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <span className="text-3xl font-semibold">{formatBytes(used)}</span>
                  <span className="text-sm text-muted-foreground">总量 {formatBytes(total)}</span>
                </div>
                <Progress value={percent} className="h-2.5" />
                <p className="text-xs text-muted-foreground">存储包容量：{formatBytes(capacity.data?.storage_pack_total ?? 0)}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <StatCard icon={UserCircle} label="用户组" value={formatUserGroup(user?.group?.name)} detail={user?.email || user?.id || "-"} />
        <StatCard icon={Workflow} label="进行中任务" value={activeTasks} detail={`${taskItems.length} 个最近任务`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Button className="h-12 justify-start" asChild>
          <Link href="/files">
            <Upload className="mr-2 h-4 w-4" />
            上传文件
          </Link>
        </Button>
        <Button variant="outline" className="h-12 justify-start" asChild>
          <Link href="/files">
            <FolderPlus className="mr-2 h-4 w-4" />
            管理文件
          </Link>
        </Button>
        <Button variant="outline" className="h-12 justify-start" asChild>
          <Link href="/shares">
            <Link2 className="mr-2 h-4 w-4" />
            我的分享
          </Link>
        </Button>
        <Button variant="outline" className="h-12 justify-start" asChild>
          <Link href="/workflow">
            <Workflow className="mr-2 h-4 w-4" />
            离线任务
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="soft-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">最近文件</CardTitle>
              <CardDescription>根目录按更新时间排序</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/files">
                全部文件
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentFiles.loading ? (
              <Skeleton className="h-52 w-full" />
            ) : recentFiles.error ? (
              <ErrorState description={recentFiles.error.message} onRetry={recentFiles.reload} />
            ) : recentFileItems.length ? (
              <div className="divide-y rounded-md border">
                {recentFileItems.map((file) => (
                  <Link
                    key={file.path}
                    href={fileHref(file, recentFiles.data?.parent.path)}
                    className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-sm hover:bg-muted/50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <FileIcon file={file} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{file.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {file.type === 1 ? "文件夹" : formatBytes(file.size)}
                      </span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDate(file.updated_at)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="暂无文件" description="上传文件后，最近活动会显示在这里。" compact />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
        <Card className="soft-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">我的分享</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/shares">查看</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {shares.loading ? (
              <Skeleton className="h-28 w-full" />
            ) : shareItems.length ? (
              <div className="grid gap-2">
                {shareItems.map((share) => (
                  <div key={share.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{share.name || share.id}</span>
                    <Badge variant={share.expired ? "destructive" : "secondary"}>{share.visited ?? 0} 次</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无分享。</p>
            )}
          </CardContent>
        </Card>
        <Card className="soft-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">任务状态</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/workflow">查看</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.loading ? (
              <Skeleton className="h-28 w-full" />
            ) : taskItems.length ? (
              <div className="grid gap-2">
                {taskItems.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{task.summary?.props?.download?.name || formatWorkflowType(task.type)}</span>
                    <Badge variant={isFinishedStatus(task.status) ? "success" : isFailedStatus(task.status) ? "destructive" : "outline"}>{formatTaskStatus(task.status)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暂无任务。</p>
            )}
          </CardContent>
        </Card>
        <Card className="soft-card">
          <CardHeader>
            <CardTitle className="text-base">账户</CardTitle>
            <CardDescription>{formatUserGroup(user?.group?.name)}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">积分</span>
              <span className="flex items-center gap-1.5">
                <span>{user?.credit ?? "-"}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <Link href="/billing" aria-label="购买积分">
                    <Plus className="h-4 w-4" />
                  </Link>
                </Button>
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">注册时间</span>
              <span>{formatDate(user?.created_at)}</span>
            </div>
            <Button variant="outline" className="mt-2 justify-start" asChild>
              <Link href="/billing">
                <ShoppingBag className="mr-2 h-4 w-4" />
                商城
              </Link>
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
