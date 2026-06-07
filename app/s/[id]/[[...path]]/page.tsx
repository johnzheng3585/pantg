"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, Download, ExternalLink, Eye, FileText, FolderOpen, HardDrive, ImageIcon, Loader2, Lock, Music2, UserRound, Video } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { EmptyState, ErrorState, LoadingPanel } from "@/components/page-state";
import { FileIcon } from "@/components/file-manager/file-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { fileApi, shareApi, siteApi } from "@/lib/api/services";
import type { FileResponse, ListFilesResponse, Share, SiteBasicConfig } from "@/lib/api/types";
import { getPreviewKind, renderMarkdown, TEXT_PREVIEW_MAX_SIZE, type FilePreviewKind } from "@/lib/file-preview";
import { buildBreadcrumbs } from "@/lib/file-uri";
import { buildShareUriFromRoute, getShareRouteFromUri, withSharePassword } from "@/lib/share-url";
import { formatBytes, formatDate, formatSiteName, formatUserGroup } from "@/lib/utils";

function useSiteName() {
  const [siteName, setSiteName] = React.useState("个人网盘");

  React.useEffect(() => {
    let mounted = true;
    siteApi
      .config<SiteBasicConfig>("basic", { timeoutMs: 6000 })
      .then((config) => {
        if (!mounted) return;
        setSiteName(formatSiteName(config.title));
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  return siteName;
}

function ShareBreadcrumbs({ id, uri }: { id: string; uri: string }) {
  const crumbs = buildBreadcrumbs(uri);
  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-muted-foreground">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const label = index === 0 ? "分享根目录" : crumb.label;
        return (
          <React.Fragment key={`${crumb.uri}-${index}`}>
            {index > 0 ? <span>/</span> : null}
            {isLast ? (
              <span className="max-w-[180px] truncate text-foreground">{label}</span>
            ) : (
              <Link className="max-w-[180px] truncate hover:text-foreground" href={getShareRouteFromUri(id, crumb.uri)}>
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function previewLabel(kind: FilePreviewKind) {
  if (kind === "video") return "视频在线播放";
  if (kind === "audio") return "音频在线播放";
  if (kind === "image") return "图片预览";
  if (kind === "pdf") return "PDF 预览";
  if (kind === "markdown") return "Markdown 预览";
  if (kind === "text") return "文本预览";
  return "文件预览";
}

function PreviewKindIcon({ kind }: { kind: FilePreviewKind }) {
  if (kind === "video") return <Video className="h-5 w-5" />;
  if (kind === "audio") return <Music2 className="h-5 w-5" />;
  if (kind === "image") return <ImageIcon className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
}

function SharePreviewDialog({
  open,
  file,
  password,
  contextHint,
  onOpenChange
}: {
  open: boolean;
  file: FileResponse;
  password?: string;
  contextHint?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const previewKind = getPreviewKind(file);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [previewText, setPreviewText] = React.useState("");
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    setPreviewUrl("");
    setPreviewText("");
    setPreviewError("");
    if (!open || previewKind === "none") {
      return;
    }

    if ((previewKind === "text" || previewKind === "markdown") && file.size > TEXT_PREVIEW_MAX_SIZE) {
      setPreviewError(`文件超过 ${formatBytes(TEXT_PREVIEW_MAX_SIZE)}，请下载后查看。`);
      return;
    }

    setPreviewLoading(true);
    fileApi
      .downloadUrl({
        uris: [withSharePassword(file.path, password)],
        download: false,
        archive: false,
        skip_error: false,
        entity: file.primary_entity ?? undefined,
        auth: false,
        contextHint,
        toastError: false
      })
      .then((result) => {
        if (!mounted) return undefined;
        const nextUrl = result.urls[0]?.url ?? "";
        if (!nextUrl) {
          throw new Error("没有获取到预览链接。");
        }
        setPreviewUrl(nextUrl);

        if (previewKind === "text" || previewKind === "markdown") {
          return fetch(nextUrl)
            .then((response) => {
              if (!response.ok) {
                throw new Error(response.statusText || "文本读取失败。");
              }
              return response.text();
            })
            .then((text) => {
              if (mounted) {
                setPreviewText(text);
              }
            });
        }

        return undefined;
      })
      .catch((error) => {
        if (mounted) {
          setPreviewError(error instanceof Error ? error.message : "获取预览链接失败。");
        }
      })
      .finally(() => {
        if (mounted) {
          setPreviewLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [contextHint, file.path, file.primary_entity, file.size, open, password, previewKind]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>文件预览</DialogTitle>
          <DialogDescription className="break-all">{file.name}</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-md border bg-muted/30">
          <div className="mb-3 flex items-center gap-3">
            <span className="ml-3 mt-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <PreviewKindIcon kind={previewKind} />
            </span>
            <div className="min-w-0 pt-3 pr-3">
              <p className="truncate font-medium">{file.metadata?.["music:title"] || file.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {previewKind === "audio"
                  ? `${file.metadata?.["music:artist"] || "未知艺人"}${file.metadata?.["music:album"] ? ` · ${file.metadata["music:album"]}` : ""}`
                  : previewLabel(previewKind)}
              </p>
            </div>
          </div>
          {previewLoading ? (
            <div className="mx-3 mb-3 flex items-center gap-2 rounded-md bg-background/70 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在准备预览...
            </div>
          ) : previewUrl ? (
            previewKind === "video" ? (
              <video className="max-h-[62vh] w-full bg-black" controls controlsList="nodownload" preload="metadata" src={previewUrl}>
                当前浏览器不支持视频播放。
              </video>
            ) : previewKind === "audio" ? (
              <div className="px-3 pb-3">
                <audio className="w-full" controls controlsList="nodownload" preload="metadata" src={previewUrl}>
                  当前浏览器不支持音频播放。
                </audio>
              </div>
            ) : previewKind === "image" ? (
              <div className="mx-3 mb-3 flex max-h-[72vh] items-center justify-center overflow-auto rounded-md bg-background/70 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt={file.name} className="max-h-[68vh] max-w-full rounded-sm object-contain" />
              </div>
            ) : previewKind === "pdf" ? (
              <iframe title={file.name} src={previewUrl} className="mx-3 mb-3 h-[72vh] w-[calc(100%-1.5rem)] rounded-md bg-background" />
            ) : previewKind === "markdown" ? (
              <div className="mx-3 mb-3 grid max-h-[72vh] gap-3 overflow-auto rounded-md bg-background/70 p-4 lg:grid-cols-2">
                <article
                  className="markdown-preview min-w-0 rounded-md border bg-background p-4"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(previewText) }}
                />
                <pre className="min-w-0 overflow-auto rounded-md border bg-muted/40 p-4 text-xs leading-relaxed">
                  <code>{previewText}</code>
                </pre>
              </div>
            ) : (
              <pre className="mx-3 mb-3 max-h-[72vh] overflow-auto rounded-md bg-background/70 p-4 text-xs leading-relaxed">
                <code>{previewText}</code>
              </pre>
            )
          ) : (
            <p className="mx-3 mb-3 rounded-md bg-background/70 p-3 text-sm text-muted-foreground">{previewError || "暂时无法预览此文件。"}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareFileCard({
  file,
  shareId,
  password,
  locked,
  contextHint
}: {
  file: FileResponse;
  shareId: string;
  password?: string;
  locked?: boolean;
  contextHint?: string;
}) {
  const [downloading, setDownloading] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const { toast } = useToast();
  const previewKind = getPreviewKind(file);

  async function download() {
    if (file.type === 1) {
      return;
    }

    if (locked) {
      toast({ variant: "destructive", title: "需要提取码", description: "请输入提取码后再下载。" });
      return;
    }

    setDownloading(true);
    try {
      const result = await fileApi.downloadUrl({
        uris: [withSharePassword(file.path, password)],
        download: true,
        archive: false,
        skip_error: false,
        entity: file.primary_entity ?? undefined,
        auth: false,
        contextHint,
        toastError: false
      });
      const url = result.urls[0]?.url;
      if (!url) {
        throw new Error("没有获取到下载链接。");
      }
      window.location.href = url;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "下载失败",
        description: error instanceof Error ? error.message : "请稍后重试。"
      });
    } finally {
      setDownloading(false);
    }
  }

  if (file.type === 1) {
    return (
      <Link
        href={getShareRouteFromUri(shareId, file.path)}
        className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-md"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <FileIcon file={file} className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{file.name}</span>
          <span className="mt-1 block text-xs text-muted-foreground">文件夹</span>
        </span>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    );
  }

  return (
    <>
      <div className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-md">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <FileIcon file={file} className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{file.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatBytes(file.size)}</p>
        </div>
        {previewKind !== "none" ? (
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (locked) {
                toast({ variant: "destructive", title: "需要提取码", description: "请输入提取码后再预览。" });
                return;
              }
              setPreviewOpen(true);
            }}
            aria-label="预览"
          >
            <Eye className="h-4 w-4" />
          </Button>
        ) : null}
        <Button variant="outline" size="icon" onClick={download} disabled={downloading} aria-label="下载">
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
      </div>
      {previewKind !== "none" ? (
        <SharePreviewDialog
          open={previewOpen}
          file={file}
          password={password}
          contextHint={contextHint}
          onOpenChange={setPreviewOpen}
        />
      ) : null}
    </>
  );
}

function ShareContent({
  share,
  listing,
  shareId,
  currentUri,
  password,
  locked,
  onRetry
}: {
  share: Share;
  listing: ListFilesResponse | null;
  shareId: string;
  currentUri: string;
  password?: string;
  locked?: boolean;
  onRetry: () => void;
}) {
  const files = listing?.files ?? [];
  const isSingleFile = share.source_type === 0;
  const singleFile = isSingleFile ? files[0] : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="grid gap-4">
        <Card className="soft-card">
          <CardContent className="grid gap-3 p-4">
            <ShareBreadcrumbs id={shareId} uri={currentUri} />
            <div className="grid gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground sm:grid-cols-3">
              <span className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                {share.name || "分享文件"}
              </span>
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {isSingleFile ? "1 个文件" : `${files.filter((file) => file.type === 1).length} 个文件夹 · ${files.filter((file) => file.type !== 1).length} 个文件`}
              </span>
              <span className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                {share.is_private || share.password_protected ? "私密访问" : "公开访问"}
              </span>
            </div>
          </CardContent>
        </Card>

        {isSingleFile ? (
          singleFile ? (
            <ShareFileCard
              file={singleFile}
              shareId={shareId}
              password={password}
              locked={locked}
              contextHint={listing?.context_hint}
            />
          ) : (
            <ErrorState title="无法读取分享文件" description="文件信息未返回，请刷新后重试。" onRetry={onRetry} />
          )
        ) : listing ? (
          files.length ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {files.map((file) => (
                <ShareFileCard
                  key={file.path}
                  file={file}
                  shareId={shareId}
                  password={password}
                  locked={locked}
                  contextHint={listing?.context_hint}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="这里没有文件" description="这个分享目录暂时为空。" compact />
          )
        ) : (
          <ErrorState title="无法读取分享内容" description="分享信息可以访问，但文件列表未返回。" onRetry={onRetry} />
        )}
      </section>

      <aside className="grid content-start gap-3">
        <Card className="soft-card">
          <CardContent className="grid gap-3 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">分享信息</h2>
              <Badge variant={share.expired ? "destructive" : "secondary"}>{share.expired ? "已过期" : "有效"}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{share.owner?.nickname || share.owner?.email || "分享者"}</p>
                <p className="truncate text-xs text-muted-foreground">{formatUserGroup(share.owner?.group?.name)}</p>
              </div>
            </div>
            <div className="grid gap-2 text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>访问次数</span>
                <span className="text-foreground">{share.visited ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>下载次数</span>
                <span className="text-foreground">{share.downloaded ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>创建时间</span>
                <span className="text-foreground">{formatDate(share.created_at)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>有效期</span>
                <span className="text-foreground">{formatDate(share.expires)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function ShareUnlockPanel({
  siteName,
  shareName,
  password,
  loading,
  error,
  onPasswordChange,
  onSubmit
}: {
  siteName: string;
  shareName?: string;
  password: string;
  loading?: boolean;
  error?: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="grid min-h-[calc(100dvh-4rem)] place-items-center px-4 py-10">
      <Card className="w-full max-w-md soft-card">
        <CardContent className="grid gap-5 p-6">
          <div className="grid justify-items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </span>
            <div className="grid gap-1">
              <h1 className="text-xl font-semibold tracking-normal">输入提取码</h1>
              <p className="text-sm text-muted-foreground">
                {shareName ? `${shareName} 是私密分享` : `${siteName} 的私密分享需要提取码访问`}
              </p>
            </div>
          </div>
          <form className="grid gap-4" onSubmit={onSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="share-password">提取码</Label>
              <Input
                id="share-password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="请输入分享提取码"
                autoFocus
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <Button type="submit" disabled={!password.trim() || loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              打开分享
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

export default function PublicSharePage({ params }: { params: { id: string; path?: string[] } }) {
  const shareId = decodeURIComponent(params.id);
  const pathSegments = params.path ?? [];
  const searchParams = useSearchParams();
  const siteName = useSiteName();
  const [password, setPassword] = React.useState("");
  const [submittedPassword, setSubmittedPassword] = React.useState("");
  const [share, setShare] = React.useState<Share | null>(null);
  const [listing, setListing] = React.useState<ListFilesResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [slowLoading, setSlowLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [version, setVersion] = React.useState(0);
  const isPasswordError = Boolean(error && /password|unlock|401|403|私密|提取码/i.test(error.message));
  const canTryPasswordAfterError = Boolean(error && !submittedPassword && /服务器内部错误|internal server error/i.test(error.message));
  const canTryPasswordWhileLoading = Boolean(loading && slowLoading && !submittedPassword);
  const isPrivateShare = Boolean(share?.is_private || share?.password_protected);
  const isShareLocked = isPrivateShare && !submittedPassword;
  const shouldShowPasswordForm = isShareLocked || isPasswordError || canTryPasswordAfterError || canTryPasswordWhileLoading;
  const showUnlockOnly = shouldShowPasswordForm && !submittedPassword;
  const unlockErrorMessage = isPasswordError
    ? "提取码不正确或已失效，请重新输入。"
    : canTryPasswordAfterError
      ? "如果这是私密分享，请输入提取码后重试。"
      : undefined;

  const currentUri = React.useMemo(
    () => buildShareUriFromRoute(shareId, pathSegments, submittedPassword),
    [pathSegments, shareId, submittedPassword]
  );

  React.useEffect(() => {
    document.title = share?.name ? `${siteName} - ${share.name}` : `${siteName} - 公开分享`;
  }, [share?.name, siteName]);

  React.useEffect(() => {
    const passwordFromUrl = searchParams.get("password")?.trim() || searchParams.get("pwd")?.trim() || "";
    if (passwordFromUrl) {
      setPassword(passwordFromUrl);
      setSubmittedPassword(passwordFromUrl);
      try {
        window.sessionStorage.setItem(`share-password:${shareId}`, passwordFromUrl);
      } catch {
        // Keep public share pages usable even when storage is unavailable.
      }
      return;
    }

    try {
      const cachedPassword = window.sessionStorage.getItem(`share-password:${shareId}`) ?? "";
      if (cachedPassword) {
        setPassword(cachedPassword);
        setSubmittedPassword(cachedPassword);
      }
    } catch {
      // Keep public share pages usable even when storage is unavailable.
    }
  }, [searchParams, shareId]);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setSlowLoading(false);
    setError(null);
    setShare(null);
    setListing(null);

    const slowTimer = window.setTimeout(() => {
      if (mounted) {
        setSlowLoading(true);
      }
    }, 1200);

    shareApi
      .publicInfo(shareId, { password: submittedPassword || undefined, count_views: pathSegments.length === 0, owner_extended: true })
      .then(async (shareInfo) => {
        if (!mounted) return;
        setShare(shareInfo);

        const files = await fileApi.list({
          uri: currentUri,
          page_size: 200,
          order_by: "name",
          order_direction: "asc",
          auth: false,
          toastError: false
        });
        if (mounted) {
          setListing(files);
        }
      })
      .catch((nextError) => {
        if (mounted) {
          setError(nextError instanceof Error ? nextError : new Error("分享加载失败"));
          if (submittedPassword) {
            setSubmittedPassword("");
            setPassword("");
            try {
              window.sessionStorage.removeItem(`share-password:${shareId}`);
            } catch {
              // Ignore storage failures.
            }
          }
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
          window.clearTimeout(slowTimer);
        }
      });

    return () => {
      mounted = false;
      window.clearTimeout(slowTimer);
    };
  }, [currentUri, pathSegments.length, shareId, submittedPassword, version]);

  function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPassword = password.trim();
    setError(null);
    setSubmittedPassword(nextPassword);
    try {
      window.sessionStorage.setItem(`share-password:${shareId}`, nextPassword);
    } catch {
      // Ignore storage failures.
    }
  }

  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardDrive className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{siteName}</span>
              <span className="block truncate text-xs text-muted-foreground">公开分享</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回首页
              </Link>
            </Button>
            <Button asChild>
              <Link href="/login">登录</Link>
            </Button>
          </div>
        </div>
      </header>

      {showUnlockOnly ? (
        <ShareUnlockPanel
          siteName={siteName}
          shareName={share?.name}
          password={password}
          loading={loading && !slowLoading}
          error={unlockErrorMessage}
          onPasswordChange={setPassword}
          onSubmit={submitPassword}
        />
      ) : (
      <div className="container page-enter grid gap-5 py-8">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal">{share?.name || "分享文件"}</h1>
            {share?.is_private || share?.password_protected ? (
              <Badge variant="outline">
                <Lock className="mr-1 h-3 w-3" />
                私密分享
              </Badge>
            ) : null}
          </div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            {share ? `创建于 ${formatDate(share.created_at)}` : "正在读取分享信息"}
          </p>
        </div>

        {loading ? <LoadingPanel rows={4} /> : null}
        {!loading && error && !shouldShowPasswordForm ? (
          <ErrorState description={error.message} onRetry={() => setVersion((value) => value + 1)} />
        ) : null}
        {!loading && share && !error ? (
          <ShareContent
            share={share}
            listing={listing}
            shareId={shareId}
            currentUri={currentUri}
            password={submittedPassword}
            locked={isShareLocked}
            onRetry={() => setVersion((value) => value + 1)}
          />
        ) : null}
      </div>
      )}
    </main>
  );
}
