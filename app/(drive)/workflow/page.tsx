"use client";

import { Loader2, Plus, RefreshCcw, Save, Square } from "lucide-react";
import * as React from "react";

import { FolderPicker } from "@/components/file-manager/folder-picker";
import { EmptyState, ErrorState, LoadingPanel, PageHeader } from "@/components/page-state";
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
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAsync } from "@/hooks/use-async";
import { userApi, workflowApi } from "@/lib/api/services";
import type { RemoteDownloadFile } from "@/lib/api/types";
import { formatBytes, formatDate, formatDownloadState, formatTaskStatus, formatWorkflowType, isFailedStatus, isFinishedStatus } from "@/lib/utils";

function isFileSelected(file: RemoteDownloadFile) {
  return file.download ?? file.selected ?? true;
}

function RemoteDownloadFileList({
  taskId,
  files,
  disabled,
  onSaved
}: {
  taskId: string;
  files: RemoteDownloadFile[];
  disabled?: boolean;
  onSaved: () => void;
}) {
  const [selection, setSelection] = React.useState<Record<number, boolean>>({});
  const [saving, setSaving] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setSelection(Object.fromEntries(files.map((file) => [file.index, isFileSelected(file)])));
  }, [files]);

  const selectedCount = files.filter((file) => selection[file.index]).length;
  const allSelected = files.length > 0 && selectedCount === files.length;
  const hasChanged = files.some((file) => selection[file.index] !== isFileSelected(file));

  function toggleAll(checked: boolean) {
    setSelection(Object.fromEntries(files.map((file) => [file.index, checked])));
  }

  async function saveSelection() {
    setSaving(true);
    try {
      await workflowApi.selectFiles(
        taskId,
        files.map((file) => ({
          index: file.index,
          download: Boolean(selection[file.index])
        }))
      );
      toast({ title: "文件选择已保存" });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs">
        <label className="flex items-center gap-2 font-medium">
          <Checkbox checked={allSelected} disabled={disabled || saving} onCheckedChange={(checked) => toggleAll(Boolean(checked))} />
          文件列表
        </label>
        <span className="text-muted-foreground">
          已选择 {selectedCount} / {files.length} 个文件
        </span>
        <Button className="ml-auto" variant="outline" size="sm" onClick={saveSelection} disabled={disabled || saving || !hasChanged}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          保存选择
        </Button>
      </div>
      <div className="max-h-64 overflow-auto">
        {files.map((file) => (
          <label key={file.index} className="grid cursor-pointer grid-cols-[24px_minmax(0,1fr)_90px_64px] items-center gap-3 border-b px-3 py-2 text-xs last:border-b-0 hover:bg-muted/30">
            <Checkbox
              checked={Boolean(selection[file.index])}
              disabled={disabled || saving}
              onCheckedChange={(checked) =>
                setSelection((current) => ({
                  ...current,
                  [file.index]: Boolean(checked)
                }))
              }
            />
            <span className="truncate">{file.name}</span>
            <span className="text-right text-muted-foreground">{formatBytes(file.size)}</span>
            <span className="text-right text-muted-foreground">{Math.round(file.progress * 100)}%</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function WorkflowPage() {
  const tasks = useAsync(() => workflowApi.list({ page_size: 50, category: "downloading" }), []);
  const nodes = useAsync(() => userApi.nodes(), []);
  const taskItems = tasks.data?.tasks ?? [];
  const [open, setOpen] = React.useState(false);
  const [src, setSrc] = React.useState("");
  const [dst, setDst] = React.useState("cloudreve://my");
  const [nodeId, setNodeId] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [cancellingId, setCancellingId] = React.useState("");
  const { toast } = useToast();

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const sources = src
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      await workflowApi.createRemoteDownload({
        dst,
        src: sources,
        preferred_node_id: nodeId === "auto" ? undefined : nodeId || undefined
      });
      toast({ title: "离线下载任务已创建" });
      setOpen(false);
      tasks.reload();
    } finally {
      setLoading(false);
    }
  }

  async function cancelTask(id: string) {
    setCancellingId(id);
    try {
      await workflowApi.cancel(id);
      toast({ title: "任务已取消" });
      tasks.reload();
    } finally {
      setCancellingId("");
    }
  }

  return (
    <div className="container page-enter grid gap-5 py-6">
      <PageHeader
        title="离线任务 / 工作流"
        description="创建远程下载，查看任务列表和进度。"
        actions={
          <>
            <Button variant="outline" size="icon" onClick={tasks.reload} aria-label="刷新">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新建任务
            </Button>
          </>
        }
      />

      {tasks.loading ? <LoadingPanel rows={4} /> : null}
      {tasks.error ? <ErrorState description={tasks.error.message} onRetry={tasks.reload} /> : null}
      {!tasks.loading && !tasks.error && !taskItems.length ? <EmptyState title="暂无工作流任务" /> : null}

      <div className="grid gap-3">
        {taskItems.map((task) => {
          const download = task.summary?.props?.download;
          const percent = download?.total ? Math.round(((download.downloaded ?? 0) / download.total) * 100) : undefined;
          return (
            <Card key={task.id} className="soft-card">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{download?.name || formatWorkflowType(task.type)}</CardTitle>
                    <CardDescription>
                      {task.id} · {task.node?.name || "默认节点"} · {formatDate(task.updated_at)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isFinishedStatus(task.status) ? "success" : isFailedStatus(task.status) ? "destructive" : "outline"}>
                      {formatTaskStatus(task.status)}
                    </Badge>
                    {!isFinishedStatus(task.status) && task.type === "remote_download" ? (
                      <Button variant="outline" size="sm" onClick={() => cancelTask(task.id)} disabled={cancellingId === task.id}>
                        {cancellingId === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4" />}
                        取消任务
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                {percent !== undefined ? (
                  <>
                    <Progress value={percent} />
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>
                        {formatBytes(download?.downloaded ?? 0)} / {formatBytes(download?.total ?? 0)}
                      </span>
                      <span>下载 {formatBytes(download?.download_speed ?? 0)}/s</span>
                      <span>上传 {formatBytes(download?.upload_speed ?? 0)}/s</span>
                      {formatDownloadState(download?.state) ? <span>{formatDownloadState(download?.state)}</span> : null}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">此任务暂无实时进度。</p>
                )}
                {download?.files?.length ? (
                  <RemoteDownloadFileList
                    taskId={task.id}
                    files={download.files}
                    disabled={isFinishedStatus(task.status) || cancellingId === task.id}
                    onSaved={tasks.reload}
                  />
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建离线下载</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={createTask}>
            <div className="grid gap-2">
              <Label htmlFor="download-src">下载链接</Label>
              <Textarea
                id="download-src"
                value={src}
                onChange={(event) => setSrc(event.target.value)}
                placeholder="每行一个 HTTP、HTTPS、magnet 或 torrent URI"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>保存到</Label>
              <FolderPicker value={dst} onChange={setDst} label="离线下载完成后会保存到此文件夹。" />
            </div>
            <div className="grid gap-2">
              <Label>下载节点</Label>
              <Select value={nodeId || "auto"} onValueChange={setNodeId}>
                <SelectTrigger>
                  <SelectValue placeholder="自动选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自动选择</SelectItem>
                  {nodes.data?.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.name || node.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
