"use client";

import Link from "next/link";
import { ChevronRight, Copy, Download, FileText, FolderInput, FolderOpen, FolderPlus, Grid2X2, List, Loader2, RefreshCcw, Trash2, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { FileContextMenu, type FileContextMenuState } from "@/components/file-manager/context-menu";
import { DetailsDialog, MoveCopyDialog, NameDialog, ShareDialog, UploadDialog } from "@/components/file-manager/dialogs";
import { FileGrid } from "@/components/file-manager/file-grid";
import { FileTable } from "@/components/file-manager/file-table";
import { EmptyState, ErrorState, LoadingPanel, PageHeader } from "@/components/page-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { fileApi } from "@/lib/api/services";
import type { FileResponse, ListFilesResponse } from "@/lib/api/types";
import { buildBreadcrumbs, buildCloudreveUri, fileRouteFromUri, isTrashUri, joinCloudreveUri, trashRouteFromUri } from "@/lib/file-uri";
import { cn, formatStoragePolicyDisplay } from "@/lib/utils";

const FILE_VIEW_STORAGE_KEY = "cloudreve.file-manager.view";

function getStoredView(): "list" | "grid" {
  if (typeof window === "undefined") {
    return "list";
  }

  try {
    const value = window.localStorage.getItem(FILE_VIEW_STORAGE_KEY);
    return value === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

function hasStoredView() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(FILE_VIEW_STORAGE_KEY) === "list" || window.localStorage.getItem(FILE_VIEW_STORAGE_KEY) === "grid";
  } catch {
    return false;
  }
}

function storeView(view: "list" | "grid") {
  try {
    window.localStorage.setItem(FILE_VIEW_STORAGE_KEY, view);
  } catch {
    // Keep view switching usable even when storage is unavailable.
  }
}

function isLockConflict(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const code = typeof error === "object" && error && "code" in error ? (error as { code?: number }).code : undefined;
  const response = typeof error === "object" && error && "response" in error ? (error as { response?: unknown }).response : null;
  const responseText = response ? JSON.stringify(response).toLowerCase() : "";
  return code === 40073 || message.includes("lock conflict") || message.includes("文件正在上传或处理中") || responseText.includes("40073") || responseText.includes("lock conflict");
}

function collectLockTokens(value: unknown, tokens = new Set<string>()) {
  if (!value || typeof value !== "object") {
    return tokens;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectLockTokens(item, tokens));
    return tokens;
  }

  const record = value as Record<string, unknown>;
  const token = record.token;
  if (typeof token === "string" && token.length > 0) {
    tokens.add(token);
  }

  const tokenList = record.tokens;
  if (Array.isArray(tokenList)) {
    tokenList.forEach((item) => {
      if (typeof item === "string" && item.length > 0) {
        tokens.add(item);
      } else {
        collectLockTokens(item, tokens);
      }
    });
  }

  Object.values(record).forEach((item) => collectLockTokens(item, tokens));
  return tokens;
}

function getLockTokens(error: unknown) {
  if (!isLockConflict(error) || typeof error !== "object" || !error || !("response" in error)) {
    return [];
  }

  return Array.from(collectLockTokens((error as { response?: unknown }).response));
}

export function FileManager({ trash = false, initialUri: routeInitialUri }: { trash?: boolean; initialUri?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchKeyword = searchParams.get("q")?.trim() ?? "";
  const initialBaseUri = searchParams.get("uri") || routeInitialUri || buildCloudreveUri("", trash ? "trash" : "my");
  const initialUri = searchKeyword
    ? `${initialBaseUri.split("?")[0]}?name=${encodeURIComponent(searchKeyword)}&case_folding=true&use_or=true`
    : initialBaseUri;
  const [uri, setUri] = React.useState(initialUri);
  const [view, setView] = React.useState<"list" | "grid">(getStoredView);
  const [data, setData] = React.useState<ListFilesResponse | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [activeFile, setActiveFile] = React.useState<FileResponse | null>(null);
  const [dialog, setDialog] = React.useState<"folder" | "file" | "rename" | "move" | "copy" | "share" | "upload" | "details" | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [operation, setOperation] = React.useState<string | null>(null);
  const [contextMenu, setContextMenu] = React.useState<FileContextMenuState | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [uploadInitialFiles, setUploadInitialFiles] = React.useState<File[]>([]);
  const [uploadDirectoryMode, setUploadDirectoryMode] = React.useState(false);
  const [batchMoveCopy, setBatchMoveCopy] = React.useState<"move" | "copy" | null>(null);
  const { toast } = useToast();
  const trashMode = trash || isTrashUri(uri);

  React.useEffect(() => {
    const keyword = searchParams.get("q")?.trim() ?? "";
    const baseUri = searchParams.get("uri") || routeInitialUri || buildCloudreveUri("", trash ? "trash" : "my");
    const nextUri = keyword
      ? `${baseUri.split("?")[0]}?name=${encodeURIComponent(keyword)}&case_folding=true&use_or=true`
      : baseUri;
    setUri(nextUri);
  }, [routeInitialUri, searchParams, trash]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected([]);
    try {
      const result = await fileApi.list({ uri, page_size: 100, order_by: "name", order_direction: "asc" });
      setData(result);
      if (!hasStoredView() && (result.view?.view === "grid" || result.view?.view === "gallery")) {
        setView("grid");
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError : new Error("加载失败"));
    } finally {
      setLoading(false);
    }
  }, [uri]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    function close() {
      setContextMenu(null);
    }

    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, []);

  const breadcrumbs = buildBreadcrumbs(uri);
  const currentRouteFromUri = trashMode ? trashRouteFromUri : fileRouteFromUri;

  function openUpload(files?: File[], directory = false) {
    setUploadInitialFiles(files ?? []);
    setUploadDirectoryMode(directory);
    setDialog("upload");
  }

  function openContextMenu(event: React.MouseEvent, file: FileResponse | null = null) {
    if (trashMode && !file) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      file
    });
  }

  function openBackgroundContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-file-item], [data-file-toolbar], [data-app-context-menu]")) {
      return;
    }
    openContextMenu(event);
  }

  function getFilesFromDataTransfer(dataTransfer: DataTransfer) {
    return Array.from(dataTransfer.files ?? []);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    if (trashMode) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const files = getFilesFromDataTransfer(event.dataTransfer);
    if (!files.length) {
      toast({ variant: "destructive", title: "没有可上传的文件" });
      return;
    }
    openUpload(files);
  }

  async function uploadFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      const files: File[] = [];
      for (const item of items) {
        for (const type of item.types) {
          if (!type.startsWith("image/") && type !== "text/plain") {
            continue;
          }
          const blob = await item.getType(type);
          const suffix = type.startsWith("image/") ? type.split("/")[1] || "png" : "txt";
          files.push(new File([blob], `clipboard-${Date.now()}.${suffix}`, { type }));
        }
      }
      if (!files.length) {
        toast({ variant: "destructive", title: "剪贴板里没有可上传内容" });
        return;
      }
      openUpload(files);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "无法读取剪贴板",
        description: error instanceof Error ? error.message : "浏览器拒绝了剪贴板访问。"
      });
    }
  }

  async function createFolder(name: string) {
    setActionLoading(true);
    try {
      await fileApi.createFolder(uri, name);
      toast({ title: "文件夹已创建" });
      setDialog(null);
      load();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "创建失败",
        description: error instanceof Error ? error.message : "请稍后重试。"
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function createBlankFile(name: string) {
    setActionLoading(true);
    try {
      await fileApi.create({ uri: joinCloudreveUri(uri, name), type: "file", err_on_conflict: true });
      toast({ title: "文件已创建" });
      setDialog(null);
      load();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "创建失败",
        description: error instanceof Error ? error.message : "请稍后重试。"
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function renameFile(name: string) {
    if (!activeFile) return;
    setActionLoading(true);
    try {
      await fileApi.rename({ uri: activeFile.path, new_name: name });
      toast({ title: "重命名完成" });
      setDialog(null);
      load();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "重命名失败",
        description: error instanceof Error ? error.message : "请稍后重试。"
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadFiles(uris: string[]) {
    setOperation("正在获取下载链接");
    try {
      const archive = uris.length > 1 || files.some((file) => uris.includes(file.path) && file.type === 1);
      const result = await fileApi.downloadUrl({
        uris,
        archive,
        download: true,
        skip_error: true,
        contextHint: data?.context_hint
      });
      result.urls.forEach((item) => {
        window.location.href = item.url;
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "下载失败",
        description: error instanceof Error ? error.message : "请稍后重试。"
      });
    } finally {
      setOperation(null);
    }
  }

  async function deleteFiles(uris: string[]) {
    setOperation(trashMode ? "正在永久删除" : "正在移入回收站");
    try {
      await fileApi.delete({
        uris,
        unlink: false,
        skip_soft_delete: trashMode,
        toastError: false
      });
      toast({ title: trashMode ? "已永久删除" : "已移入回收站" });
      setSelected([]);
      load();
    } catch (error) {
      const lockTokens = getLockTokens(error);
      if (lockTokens.length) {
        setOperation("正在解除文件锁");
        try {
          await fileApi.forceUnlock(lockTokens);
          await fileApi.delete({
            uris,
            unlink: false,
            skip_soft_delete: trashMode,
            toastError: false
          });
          toast({ title: trashMode ? "已解除锁定并永久删除" : "已解除锁定并移入回收站" });
          setSelected([]);
          load();
          return;
        } catch (unlockError) {
          toast({
            variant: "destructive",
            title: "删除失败",
            description: unlockError instanceof Error ? unlockError.message : "文件仍被占用，请刷新或稍后重试。"
          });
          return;
        }
      }

      toast({
        variant: "destructive",
        title: "删除失败",
        description: isLockConflict(error) ? "文件正在上传或处理中，请稍后刷新后再删除。" : error instanceof Error ? error.message : "请稍后重试。"
      });
    } finally {
      setOperation(null);
    }
  }

  async function restoreFiles(uris: string[]) {
    setOperation("正在恢复");
    try {
      await fileApi.restore(uris);
      toast({ title: "已恢复" });
      setSelected([]);
      load();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "恢复失败",
        description: error instanceof Error ? error.message : "请稍后重试。"
      });
    } finally {
      setOperation(null);
    }
  }

  const handlers = {
    trashMode,
    onDownload: (file: FileResponse) => downloadFiles([file.path]),
    onRename: (file: FileResponse) => {
      setActiveFile(file);
      setDialog("rename");
    },
    onMoveCopy: (file: FileResponse, copy: boolean) => {
      setBatchMoveCopy(null);
      setActiveFile(file);
      setDialog(copy ? "copy" : "move");
    },
    onDelete: (file: FileResponse) => deleteFiles([file.path]),
    onRestore: (file: FileResponse) => restoreFiles([file.path]),
    onShare: (file: FileResponse) => {
      setActiveFile(file);
      setDialog("share");
    },
    onDetails: (file: FileResponse) => {
      setActiveFile(file);
      setDialog("details");
    }
  };

  const files = data?.files ?? [];
  const selectedFiles = React.useMemo(() => files.filter((file) => selected.includes(file.path)), [files, selected]);
  const folderCount = files.filter((file) => file.type === 1).length;
  const fileCount = files.length - folderCount;
  const selectedCount = selected.length;
  const isOperating = Boolean(operation);
  const currentCrumb = breadcrumbs[breadcrumbs.length - 1];
  const plainUri = uri.split("?")[0];

  function toggleView() {
    setView((currentView) => {
      const nextView = currentView === "list" ? "grid" : "list";
      storeView(nextView);
      return nextView;
    });
  }

  function openBatchMoveCopy(copy: boolean) {
    if (!selectedFiles.length) return;
    setActiveFile(null);
    setBatchMoveCopy(copy ? "copy" : "move");
    setDialog(copy ? "copy" : "move");
  }

  return (
    <div
      className={cn("container page-enter relative grid min-h-[calc(100dvh-4rem)] content-start gap-5 py-6", dragActive && "after:pointer-events-none after:absolute after:inset-4 after:z-30 after:rounded-xl after:border-2 after:border-dashed after:border-primary after:bg-primary/10")}
      onContextMenu={openBackgroundContextMenu}
      onDragEnter={(event) => {
        if (!trashMode && Array.from(event.dataTransfer.types).includes("Files")) {
          event.preventDefault();
          setDragActive(true);
        }
      }}
      onDragOver={(event) => {
        if (!trashMode) {
          event.preventDefault();
        }
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragActive(false);
        }
      }}
      onDrop={handleDrop}
    >
      {dragActive ? (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-background/65 backdrop-blur-sm">
          <div className="rounded-lg border bg-card px-6 py-4 text-center shadow-lg">
            <Upload className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-medium">松开以上传到当前目录</p>
            <p className="mt-1 text-sm text-muted-foreground">{currentCrumb?.label || "我的文件"}</p>
          </div>
        </div>
      ) : null}
      <div data-file-toolbar>
        <PageHeader
        title={trashMode ? "回收站" : "文件管理器"}
        description={data?.storage_policy ? `当前存储策略：${formatStoragePolicyDisplay(data.storage_policy)}` : "浏览和管理你的网盘文件。"}
        actions={
          <>
            <Button variant="outline" size="icon" onClick={load} aria-label="刷新">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleView} aria-label="切换视图">
              {view === "list" ? <Grid2X2 className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </Button>
            {!trashMode ? (
              <>
                <Button variant="outline" onClick={() => setDialog("folder")}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  新建文件夹
                </Button>
                <Button onClick={() => openUpload()}>
                  <Upload className="mr-2 h-4 w-4" />
                  上传
                </Button>
              </>
            ) : null}
          </>
        }
        />
      </div>

      <div className="soft-card rounded-lg border bg-card p-3" data-file-toolbar>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.uri}>
              {index > 0 ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null}
            <Link
              href={currentRouteFromUri(crumb.uri)}
              className="rounded-md px-2 py-1 font-medium hover:bg-muted"
            >
              {crumb.label}
            </Link>
          </React.Fragment>
        ))}
          {data?.recursion_limit_reached ? <Badge variant="warning">搜索范围已截断</Badge> : null}
          {searchKeyword ? (
            <Badge variant="secondary" className="ml-1 gap-1">
              搜索：{searchKeyword}
              <Link href={currentRouteFromUri(plainUri)} className="ml-1 rounded-sm px-1 hover:bg-background/70" aria-label="清除搜索">
                清除
              </Link>
            </Badge>
          ) : null}
        </div>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
            <FolderOpen className="h-4 w-4" />
            <span className="truncate">{currentCrumb?.label || "当前目录"}</span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
            <FileText className="h-4 w-4" />
            <span>{folderCount} 个文件夹 · {fileCount} 个文件</span>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
            <List className="h-4 w-4" />
            <span>{selectedCount ? `已选择 ${selectedCount} 项` : "未选择文件"}</span>
          </div>
        </div>
      </div>

      {selected.length ? (
        <div className="sticky top-20 z-20 flex flex-wrap items-center gap-2 rounded-lg border bg-card/95 p-3 shadow-sm backdrop-blur" data-file-toolbar>
          <span className="mr-auto text-sm font-medium">已选择 {selected.length} 项</span>
          {operation ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {operation}
            </span>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => downloadFiles(selected)} disabled={isOperating}>
            <Download className="mr-2 h-4 w-4" />
            下载
          </Button>
          {!trashMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => openBatchMoveCopy(false)} disabled={isOperating || !selectedFiles.length}>
                <FolderInput className="mr-2 h-4 w-4" />
                移动
              </Button>
              <Button variant="outline" size="sm" onClick={() => openBatchMoveCopy(true)} disabled={isOperating || !selectedFiles.length}>
                <Copy className="mr-2 h-4 w-4" />
                复制
              </Button>
            </>
          ) : null}
          {trashMode ? (
            <Button variant="outline" size="sm" onClick={() => restoreFiles(selected)} disabled={isOperating}>
              恢复
            </Button>
          ) : null}
          <Button variant="destructive" size="sm" onClick={() => deleteFiles(selected)} disabled={isOperating}>
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])} disabled={isOperating}>
            取消选择
          </Button>
        </div>
      ) : null}

      {loading ? <LoadingPanel rows={6} /> : null}
      {error ? <ErrorState description={error.message} onRetry={load} /> : null}
      {!loading && !error && files.length === 0 ? (
        <EmptyState
          title={trashMode ? "回收站为空" : "这里还没有文件"}
          description={trashMode ? "删除的文件会出现在这里，保留时间由用户组配置决定。" : "可以新建文件夹，或上传文件到当前目录。"}
          action={
            !trashMode ? (
              <Button onClick={() => openUpload()}>
                <Upload className="mr-2 h-4 w-4" />
                上传文件
              </Button>
            ) : null
          }
        />
      ) : null}

      {!loading && !error && files.length ? (
        view === "list" ? (
          <FileTable files={files} selected={selected} onSelectedChange={setSelected} handlers={handlers} onFileContextMenu={openContextMenu} />
        ) : (
          <FileGrid
            files={files}
            selected={selected}
            onSelectedChange={setSelected}
            handlers={handlers}
            contextHint={data?.context_hint}
            onFileContextMenu={openContextMenu}
          />
        )
      ) : null}

      <FileContextMenu
        menu={contextMenu}
        trashMode={trashMode}
        handlers={handlers}
        onClose={() => setContextMenu(null)}
        onUploadFiles={() => openUpload()}
        onUploadFolder={() => openUpload(undefined, true)}
        onClipboardUpload={uploadFromClipboard}
        onRemoteDownload={() => router.push("/workflow")}
        onCreateFolder={() => setDialog("folder")}
        onCreateFile={() => setDialog("file")}
        onCreateTemplate={createBlankFile}
        onOpenFolder={(file) => router.push(currentRouteFromUri(file.path))}
        onRefresh={load}
      />

      <NameDialog
        open={dialog === "folder"}
        title="新建文件夹"
        description="系统会在当前目录创建文件夹。"
        loading={actionLoading}
        onOpenChange={(open) => setDialog(open ? "folder" : null)}
        onSubmit={createFolder}
      />
      <NameDialog
        open={dialog === "file"}
        title="新建文件"
        description="在当前目录创建一个空文件。"
        defaultValue="新建文件.txt"
        loading={actionLoading}
        onOpenChange={(open) => setDialog(open ? "file" : null)}
        onSubmit={createBlankFile}
      />
      <NameDialog
        open={dialog === "rename"}
        title="重命名"
        defaultValue={activeFile?.name ?? ""}
        loading={actionLoading}
        onOpenChange={(open) => setDialog(open ? "rename" : null)}
        onSubmit={renameFile}
      />
      <MoveCopyDialog
        open={dialog === "move" || dialog === "copy"}
        file={activeFile}
        files={batchMoveCopy ? selectedFiles : undefined}
        copy={dialog === "copy"}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setBatchMoveCopy(null);
          } else {
            setDialog(dialog);
          }
        }}
        onDone={load}
      />
      <ShareDialog open={dialog === "share"} file={activeFile} onOpenChange={(open) => setDialog(open ? "share" : null)} />
      <UploadDialog
        open={dialog === "upload"}
        currentUri={uri}
        initialFiles={uploadInitialFiles}
        directory={uploadDirectoryMode}
        onOpenChange={(open) => {
          setDialog(open ? "upload" : null);
          if (!open) {
            setUploadInitialFiles([]);
            setUploadDirectoryMode(false);
          }
        }}
        onDone={load}
      />
      <DetailsDialog open={dialog === "details"} file={activeFile} onOpenChange={(open) => setDialog(open ? "details" : null)} />
    </div>
  );
}
