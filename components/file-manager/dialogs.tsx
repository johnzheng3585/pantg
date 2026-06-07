"use client";

import { Copy, FileText, ImageIcon, Loader2, Music2, Video } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { FolderPicker } from "@/components/file-manager/folder-picker";
import { useToast } from "@/hooks/use-toast";
import { fileApi, shareApi, uploadFileInChunks } from "@/lib/api/services";
import { parseCloudrevePath, joinCloudreveUri } from "@/lib/file-uri";
import { getPreviewKind, renderMarkdown, TEXT_PREVIEW_MAX_SIZE } from "@/lib/file-preview";
import { getFrontendShareUrl } from "@/lib/share-url";
import type { FileResponse } from "@/lib/api/types";
import { cn, formatBytes, formatDate } from "@/lib/utils";

function isConflictError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("同名文件已存在") || message.includes("object existed") || message.includes("already exists");
}

function splitRelativePath(relativePath: string) {
  const parts = relativePath.split("/").filter(Boolean);
  const fileName = parts.pop() || relativePath;
  return {
    directory: parts.join("/"),
    fileName
  };
}

function withNameSuffix(name: string, index: number) {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex > 0) {
    return `${name.slice(0, dotIndex)} (${index})${name.slice(dotIndex)}`;
  }

  return `${name} (${index})`;
}

function randomSharePassword() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function getReadablePath(path?: string | null) {
  if (!path) {
    return "";
  }

  const parts = parseCloudrevePath(path);
  return parts.length ? parts.join(" / ") : path;
}

function formatMetadataKey(key: string) {
  const labels: Record<string, string> = {
    "music:album": "专辑",
    "music:artist": "艺人",
    "music:file_type": "格式",
    "music:format": "标签",
    "music:title": "标题",
    "music:year": "年份"
  };
  return labels[key] ?? key;
}

function getVisibleMetadata(metadata?: Record<string, string> | null) {
  return Object.entries(metadata ?? {}).filter(([key, value]) => {
    if (!value) {
      return false;
    }

    return !key.startsWith("sys:") && !key.startsWith("thumb:") && !key.startsWith("customize:");
  });
}

export function NameDialog({
  open,
  title,
  description,
  defaultValue = "",
  label = "名称",
  loading,
  onOpenChange,
  onSubmit
}: {
  open: boolean;
  title: string;
  description?: string;
  defaultValue?: string;
  label?: string;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: string) => Promise<void>;
}) {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(value);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="name-dialog-value">{label}</Label>
            <Input id="name-dialog-value" value={value} onChange={(event) => setValue(event.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading || !value.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              确认
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MoveCopyDialog({
  open,
  file,
  files,
  copy,
  onOpenChange,
  onDone
}: {
  open: boolean;
  file: FileResponse | null;
  files?: FileResponse[];
  copy: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [dst, setDst] = React.useState("cloudreve://my");
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const targets = React.useMemo(() => (files?.length ? files : file ? [file] : []), [file, files]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targets.length) return;
    setLoading(true);
    try {
      await fileApi.move({ uris: targets.map((item) => item.path), dst, copy });
      toast({ title: copy ? "复制完成" : "移动完成" });
      onOpenChange(false);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy ? "复制到" : "移动到"}</DialogTitle>
          <DialogDescription>
            {targets.length > 1 ? `已选择 ${targets.length} 个项目，选择一个目标文件夹。` : "选择一个目标文件夹。"}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <FolderPicker value={dst} onChange={setDst} label="文件会被放入所选目录。" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading || !targets.length}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              确认
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ShareDialog({
  open,
  file,
  onOpenChange
}: {
  open: boolean;
  file: FileResponse | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [expire, setExpire] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setUrl("");
  }, [file, open]);

  React.useEffect(() => {
    if (isPrivate && !password) {
      setPassword(randomSharePassword());
    }
  }, [isPrivate, password]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const sharePassword = isPrivate ? password.trim() || randomSharePassword() : "";
    if (isPrivate && sharePassword !== password) {
      setPassword(sharePassword);
    }
    setLoading(true);
    try {
      const result = await shareApi.create({
        uri: file.path,
        is_private: isPrivate,
        password: sharePassword || undefined,
        expire: expire ? Number(expire) * 86400 : undefined,
        price: price ? Number(price) : undefined,
        share_view: true
      });
      setUrl(getFrontendShareUrl(result, sharePassword) || result || "");
      toast({ title: "分享链接已创建" });
    } finally {
      setLoading(false);
    }
  }

  async function copyShareUrl() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "分享链接已复制" });
    } catch {
      toast({ variant: "destructive", title: "复制失败", description: "请手动复制分享链接。" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建分享链接</DialogTitle>
          <DialogDescription>{file?.name}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>私密分享</Label>
              <p className="text-xs text-muted-foreground">可选自定义提取码。</p>
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
          {url ? (
            <div className="grid gap-2">
              <Label htmlFor="share-url">分享链接</Label>
              <div className="flex gap-2">
                <Input id="share-url" readOnly value={url} className="min-w-0" />
                <Button type="button" variant="outline" size="icon" onClick={copyShareUrl} aria-label="复制分享链接">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              创建
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UploadDialog({
  open,
  currentUri,
  initialFiles = [],
  directory = false,
  onOpenChange,
  onDone
}: {
  open: boolean;
  currentUri: string;
  initialFiles?: File[];
  directory?: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [progress, setProgress] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(false);
  const [autoRename, setAutoRename] = React.useState(true);
  const { toast } = useToast();
  const ensuredFolders = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (open && initialFiles.length) {
      setFiles(initialFiles);
      setProgress({});
    }
  }, [initialFiles, open]);

  React.useEffect(() => {
    if (open) {
      ensuredFolders.current = new Set();
    }
  }, [open]);

  async function ensureParentFolders(relativePath: string) {
    const parts = relativePath.split("/").filter(Boolean);
    if (parts.length <= 1) {
      return;
    }

    let current = currentUri;
    for (const folder of parts.slice(0, -1)) {
      current = joinCloudreveUri(current, folder);
      if (ensuredFolders.current.has(current)) {
        continue;
      }
      try {
        await fileApi.create({ uri: current, type: "folder", err_on_conflict: false });
      } catch {
        // Folder may already exist; upload will surface real permission/path errors later.
      }
      ensuredFolders.current.add(current);
    }
  }

  async function resolveUploadUri(relativePath: string) {
    if (!autoRename) {
      return joinCloudreveUri(currentUri, relativePath);
    }

    const { directory: relativeDirectory, fileName } = splitRelativePath(relativePath);
    const parentUri = relativeDirectory ? joinCloudreveUri(currentUri, relativeDirectory) : currentUri;
    let candidate = joinCloudreveUri(parentUri, fileName);

    for (let index = 1; index <= 100; index += 1) {
      try {
        await fileApi.info({ uri: candidate, extended: false });
        candidate = joinCloudreveUri(parentUri, withNameSuffix(fileName, index));
      } catch {
        return candidate;
      }
    }

    return joinCloudreveUri(parentUri, `${Date.now()}-${fileName}`);
  }

  async function upload() {
    setLoading(true);
    let renamedCount = 0;
    try {
      for (const file of files) {
        const relativePath = file.webkitRelativePath || file.name;
        const originalTargetUri = joinCloudreveUri(currentUri, relativePath);
        await ensureParentFolders(relativePath);
        let targetUri = await resolveUploadUri(relativePath);
        let renamedThisFile = targetUri !== originalTargetUri;
        const uploadOptions = {
          onProgress: (value: number) => setProgress((prev) => ({ ...prev, [file.name]: value }))
        };

        try {
          await uploadFileInChunks(file, targetUri, uploadOptions);
        } catch (error) {
          if (!autoRename || !isConflictError(error)) {
            throw error;
          }
          const { directory: relativeDirectory, fileName } = splitRelativePath(relativePath);
          const parentUri = relativeDirectory ? joinCloudreveUri(currentUri, relativeDirectory) : currentUri;
          targetUri = joinCloudreveUri(parentUri, withNameSuffix(fileName, Date.now()));
          renamedThisFile = true;
          await uploadFileInChunks(file, targetUri, uploadOptions);
        }

        if (renamedThisFile) {
          renamedCount += 1;
        }
      }
      toast({
        title: "上传完成",
        description: renamedCount ? `${files.length} 个文件已上传，${renamedCount} 个同名文件已自动改名。` : `${files.length} 个文件已上传。`
      });
      onOpenChange(false);
      onDone();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "上传失败",
        description: error instanceof Error ? error.message : "请稍后重试。"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>上传文件</DialogTitle>
          <DialogDescription>本地/中转存储策略会自动分片上传。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Input
            type="file"
            multiple
            // React's input attributes do not include Chromium's directory picker extension yet.
            {...(directory ? { webkitdirectory: "", directory: "" } : {})}
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          {files.length ? (
            <div className="grid max-h-48 gap-3 overflow-auto rounded-md border p-3">
              {files.map((file) => (
                <div key={file.name} className="grid gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">{file.name}</span>
                    <span className="text-muted-foreground">{formatBytes(file.size)}</span>
                  </div>
                  <Progress value={progress[file.name] ?? 0} />
                </div>
              ))}
            </div>
          ) : null}
          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <Checkbox checked={autoRename} onCheckedChange={(checked) => setAutoRename(Boolean(checked))} />
            <span className="grid gap-1">
              <span className="font-medium">同名文件自动重命名</span>
              <span className="text-xs text-muted-foreground">开启后再次上传同名文件会追加序号，避免覆盖已有文件。</span>
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="button" disabled={loading || files.length === 0} onClick={upload}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              开始上传
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DetailsDialog({
  open,
  file,
  onOpenChange
}: {
  open: boolean;
  file: FileResponse | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [details, setDetails] = React.useState<FileResponse | null>(file);
  const [previewUrl, setPreviewUrl] = React.useState("");
  const [previewText, setPreviewText] = React.useState("");
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    setDetails(file);
    setPreviewUrl("");
    setPreviewText("");
    setPreviewError("");
    if (file) {
      fileApi
        .info({ uri: file.path, extended: true, folder_summary: file.type === 1 })
        .then((data) => mounted && setDetails(data))
        .catch(() => undefined);
    }
    return () => {
      mounted = false;
    };
  }, [file]);

  const current = details ?? file;
  const previewKind = getPreviewKind(current);
  const hasPreview = previewKind !== "none";
  const visibleMetadata = React.useMemo(() => getVisibleMetadata(current?.metadata), [current?.metadata]);

  React.useEffect(() => {
    let mounted = true;
    setPreviewUrl("");
    setPreviewText("");
    setPreviewError("");
    if (!open || !current || previewKind === "none") {
      return;
    }

    if ((previewKind === "text" || previewKind === "markdown") && current.size > TEXT_PREVIEW_MAX_SIZE) {
      setPreviewError(`文件超过 ${formatBytes(TEXT_PREVIEW_MAX_SIZE)}，请下载后查看。`);
      return;
    }

    setPreviewLoading(true);
    fileApi
      .downloadUrl({
        uris: [current.path],
        download: false,
        archive: false,
        skip_error: true
      })
      .then((result) => {
        if (!mounted) {
          return;
        }
        const nextUrl = result.urls[0]?.url ?? "";
        setPreviewUrl(nextUrl);
        if (!nextUrl) {
          setPreviewError("没有获取到预览链接。");
          return;
        }

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
  }, [current?.path, current?.type, current?.name, current?.size, open, previewKind]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={hasPreview ? "max-w-4xl" : undefined}>
        <DialogHeader>
          <DialogTitle>文件详情</DialogTitle>
          <DialogDescription className="break-all">{getReadablePath(current?.path)}</DialogDescription>
        </DialogHeader>
        {current ? (
          <div className="grid gap-3 text-sm">
            {hasPreview ? (
              <div className="overflow-hidden rounded-md border bg-muted/30">
                <div className="mb-3 flex items-center gap-3">
                  <span className="ml-3 mt-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    {previewKind === "video" ? (
                      <Video className="h-5 w-5" />
                    ) : previewKind === "audio" ? (
                      <Music2 className="h-5 w-5" />
                    ) : previewKind === "image" ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0 pt-3 pr-3">
                    <p className="truncate font-medium">{current.metadata?.["music:title"] || current.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {previewKind === "video"
                        ? "视频在线播放"
                        : previewKind === "audio"
                          ? `${current.metadata?.["music:artist"] || "未知艺人"}${current.metadata?.["music:album"] ? ` · ${current.metadata["music:album"]}` : ""}`
                          : previewKind === "image"
                            ? "图片预览"
                            : previewKind === "pdf"
                              ? "PDF 预览"
                              : previewKind === "markdown"
                                ? "Markdown 预览"
                                : "文本预览"}
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
                    <video className="max-h-[58vh] w-full bg-black" controls controlsList="nodownload" preload="metadata" src={previewUrl}>
                      当前浏览器不支持视频播放。
                    </video>
                  ) : previewKind === "audio" ? (
                    <div className="px-3 pb-3">
                      <audio className="w-full" controls controlsList="nodownload" preload="metadata" src={previewUrl}>
                        当前浏览器不支持音频播放。
                      </audio>
                    </div>
                  ) : previewKind === "image" ? (
                    <div className="mx-3 mb-3 flex max-h-[70vh] items-center justify-center overflow-auto rounded-md bg-background/70 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt={current.name} className="max-h-[66vh] max-w-full rounded-sm object-contain" />
                    </div>
                  ) : previewKind === "pdf" ? (
                    <iframe title={current.name} src={previewUrl} className="mx-3 mb-3 h-[70vh] w-[calc(100%-1.5rem)] rounded-md bg-background" />
                  ) : previewKind === "markdown" ? (
                    <div className="mx-3 mb-3 grid max-h-[70vh] gap-3 overflow-auto rounded-md bg-background/70 p-4 lg:grid-cols-2">
                      <article
                        className="markdown-preview min-w-0 rounded-md border bg-background p-4"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(previewText) }}
                      />
                      <pre className="min-w-0 overflow-auto rounded-md border bg-muted/40 p-4 text-xs leading-relaxed">
                        <code>{previewText}</code>
                      </pre>
                    </div>
                  ) : (
                    <pre className="mx-3 mb-3 max-h-[70vh] overflow-auto rounded-md bg-background/70 p-4 text-xs leading-relaxed">
                      <code>{previewText}</code>
                    </pre>
                  )
                ) : (
                  <p className="mx-3 mb-3 rounded-md bg-background/70 p-3 text-sm text-muted-foreground">{previewError || "暂时无法预览此文件。"}</p>
                )}
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-3">
              <span className="text-muted-foreground">名称</span>
              <span className="col-span-2 break-all">{current.name}</span>
              <span className="text-muted-foreground">类型</span>
              <span className="col-span-2">{current.type === 1 ? "文件夹" : "文件"}</span>
              <span className="text-muted-foreground">大小</span>
              <span className="col-span-2">{current.type === 1 ? formatBytes(current.folder_summary?.size ?? 0) : formatBytes(current.size)}</span>
              <span className="text-muted-foreground">创建时间</span>
              <span className="col-span-2">{formatDate(current.created_at)}</span>
              <span className="text-muted-foreground">更新时间</span>
              <span className="col-span-2">{formatDate(current.updated_at)}</span>
            </div>
            {visibleMetadata.length ? (
              <div className="rounded-md border p-3">
                <p className="mb-2 font-medium">元数据</p>
                <div className="grid gap-1">
                  {visibleMetadata.slice(0, 12).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2">
                      <span className="truncate text-muted-foreground">{formatMetadataKey(key)}</span>
                      <span className="col-span-2 truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
