"use client";

import { ChevronRight, Copy, ExternalLink, FolderOpen, Loader2, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import { FileIcon } from "@/components/file-manager/file-icon";
import { EmptyState, ErrorState, LoadingPanel, PageHeader } from "@/components/page-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAsync } from "@/hooks/use-async";
import { fileApi, shareApi } from "@/lib/api/services";
import type { FileResponse } from "@/lib/api/types";
import { buildBreadcrumbs } from "@/lib/file-uri";
import { getFrontendShareUrl } from "@/lib/share-url";
import { cn, formatBytes, formatDate } from "@/lib/utils";

function randomSharePassword() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function formatTargetPath(uri?: string | null) {
  if (!uri) {
    return "我的文件";
  }

  return buildBreadcrumbs(uri)
    .map((item) => item.label)
    .join(" / ");
}

function ShareTargetPicker({
  value,
  onChange
}: {
  value: FileResponse | null;
  onChange: (file: FileResponse) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [browseUri, setBrowseUri] = React.useState("cloudreve://my");
  const [parent, setParent] = React.useState<FileResponse | null>(null);
  const [files, setFiles] = React.useState<FileResponse[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);
    fileApi
      .list({ uri: browseUri, page_size: 100, order_by: "name", order_direction: "asc", toastError: false })
      .then((data) => {
        if (!mounted) {
          return;
        }
        setParent(data.parent);
        setFiles(data.files ?? []);
      })
      .catch((nextError) => {
        if (!mounted) {
          return;
        }
        setParent(null);
        setFiles([]);
        setError(nextError instanceof Error ? nextError.message : "文件列表加载失败");
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [browseUri, open]);

  return (
    <div className="grid gap-2">
      <Label>选择文件或文件夹</Label>
      <button
        type="button"
        className="flex min-h-12 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-muted/50"
        onClick={() => setOpen((next) => !next)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            {value ? <FileIcon file={value} className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{value?.name ?? "请选择要分享的项目"}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {value ? `${value.type === 1 ? "文件夹" : formatBytes(value.size)} · ${formatTargetPath(value.path)}` : "从我的文件中选择一个文件或文件夹"}
            </span>
          </span>
        </span>
        <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
      </button>

      {open ? (
        <div className="rounded-md border bg-card">
          <div className="flex flex-wrap items-center gap-1 border-b p-2">
            {buildBreadcrumbs(browseUri).map((crumb) => (
              <Button key={crumb.uri} type="button" variant="ghost" size="sm" onClick={() => setBrowseUri(crumb.uri)}>
                {crumb.label}
              </Button>
            ))}
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {loading ? <LoadingPanel rows={3} /> : null}
            {error ? <p className="p-3 text-sm text-destructive">{error}</p> : null}
            {!loading && !error && !files.length ? <p className="p-3 text-center text-sm text-muted-foreground">当前目录为空</p> : null}
            <div className="grid gap-1">
              {files.map((file) => {
                const selected = value?.path === file.path;
                return (
                  <div
                    key={file.path}
                    className={cn("flex items-center gap-1 rounded-md", selected && "bg-primary/10 text-primary")}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => onChange(file)}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <FileIcon file={file} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{file.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {file.type === 1 ? "文件夹" : formatBytes(file.size)}
                        </span>
                      </span>
                    </button>
                    {file.type === 1 ? (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setBrowseUri(file.path)} aria-label={`进入 ${file.name}`}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t p-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!parent}
              onClick={() => {
                if (parent) {
                  onChange(parent);
                  setOpen(false);
                }
              }}
            >
              选择当前文件夹
            </Button>
            {value ? (
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                使用所选项目
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SharesPage() {
  const shares = useAsync(() => shareApi.listMine({ page_size: 50, order_by: "id", order_direction: "desc" }), []);
  const shareItems = shares.data?.shares ?? [];
  const [open, setOpen] = React.useState(false);
  const [target, setTarget] = React.useState<FileResponse | null>(null);
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [expire, setExpire] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [createdUrl, setCreatedUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (isPrivate && !password) {
      setPassword(randomSharePassword());
    }
  }, [isPrivate, password]);

  function openCreateDialog() {
    setTarget(null);
    setIsPrivate(false);
    setPassword("");
    setExpire("");
    setPrice("");
    setCreatedUrl("");
    setOpen(true);
  }

  async function createShare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) {
      toast({ variant: "destructive", title: "请选择文件或文件夹" });
      return;
    }

    const sharePassword = isPrivate ? password.trim() || randomSharePassword() : "";
    if (isPrivate && sharePassword !== password) {
      setPassword(sharePassword);
    }

    setLoading(true);
    try {
      const url = await shareApi.create({
        uri: target.path,
        is_private: isPrivate,
        password: sharePassword || undefined,
        expire: expire ? Number(expire) * 86400 : undefined,
        price: price ? Number(price) : undefined,
        share_view: true
      });
      const frontendUrl = getFrontendShareUrl(url, sharePassword) || url || "";
      setCreatedUrl(frontendUrl);
      toast({ title: "分享已创建" });
      shares.reload();
    } finally {
      setLoading(false);
    }
  }

  async function copyCreatedUrl() {
    if (!createdUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(createdUrl);
      toast({ title: "分享链接已复制" });
    } catch {
      toast({ variant: "destructive", title: "复制失败", description: "请手动复制分享链接。" });
    }
  }

  async function deleteShare(id: string) {
    setDeletingId(id);
    try {
      await shareApi.delete(id);
      toast({ title: "分享已删除" });
      shares.reload();
    } finally {
      setDeletingId(null);
    }
  }

  async function copyShareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "分享链接已复制" });
    } catch {
      toast({ variant: "destructive", title: "复制失败", description: "请手动复制分享链接。" });
    }
  }

  return (
    <div className="container page-enter grid gap-5 py-6">
      <PageHeader
        title="分享管理"
        description="创建、查看和删除你的分享链接。"
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            创建分享
          </Button>
        }
      />

      {shares.loading ? <LoadingPanel rows={4} /> : null}
      {shares.error ? <ErrorState description={shares.error.message} onRetry={shares.reload} /> : null}
      {!shares.loading && !shares.error && !shareItems.length ? <EmptyState title="暂无分享链接" /> : null}
      <div className="grid gap-3">
        {shareItems.map((share) => {
          const frontendUrl = getFrontendShareUrl(share.url || share.id, share.password);
          return (
          <Card key={share.id} className="soft-card">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{share.name || share.id}</p>
                  <Badge variant={share.expired ? "destructive" : "secondary"}>{share.expired ? "已过期" : "有效"}</Badge>
                  {share.is_private || share.password_protected ? <Badge variant="outline">私密</Badge> : null}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{frontendUrl || share.source_uri}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  访问 {share.visited} · 下载 {share.downloaded ?? 0} · 创建 {formatDate(share.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {frontendUrl ? (
                  <>
                    <Button variant="outline" size="icon" onClick={() => copyShareUrl(frontendUrl)} aria-label="复制链接">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" asChild aria-label="打开链接">
                      <a href={frontendUrl}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </>
                ) : null}
                <Button variant="destructive" size="icon" onClick={() => deleteShare(share.id)} disabled={deletingId === share.id} aria-label="删除分享">
                  {deletingId === share.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>创建分享链接</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={createShare}>
            <ShareTargetPicker value={target} onChange={setTarget} />
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>私密分享</Label>
                <p className="text-xs text-muted-foreground">开启后会生成提取码并附加到复制链接。</p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
            {isPrivate ? (
              <div className="grid gap-2">
                <Label htmlFor="share-password">提取码</Label>
                <Input id="share-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="share-expire">有效期天数</Label>
                <div className="relative">
                  <Input
                    id="share-expire"
                    type="number"
                    min="1"
                    value={expire}
                    placeholder="永久"
                    className={cn("pr-10", expire && "font-medium")}
                    onChange={(event) => setExpire(event.target.value)}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">天</span>
                </div>
                <p className="text-xs text-muted-foreground">留空表示不过期。</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="share-price">积分价格</Label>
                <div className="relative">
                  <Input
                    id="share-price"
                    type="number"
                    min="0"
                    value={price}
                    placeholder="免费"
                    className={cn("pr-12", price && "font-medium")}
                    onChange={(event) => setPrice(event.target.value)}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">积分</span>
                </div>
                <p className="text-xs text-muted-foreground">留空或 0 表示免费下载。</p>
              </div>
            </div>
            {createdUrl ? (
              <div className="grid gap-2">
                <Label htmlFor="created-share-url">分享链接</Label>
                <div className="flex gap-2">
                  <Input id="created-share-url" readOnly value={createdUrl} className="min-w-0" />
                  <Button type="button" variant="outline" size="icon" onClick={copyCreatedUrl} aria-label="复制分享链接">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
