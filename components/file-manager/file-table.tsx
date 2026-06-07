"use client";

import { useRouter } from "next/navigation";

import { Checkbox } from "@/components/ui/checkbox";
import { FileActions, type FileActionHandlers } from "@/components/file-manager/file-actions";
import { FileIcon } from "@/components/file-manager/file-icon";
import type { FileResponse } from "@/lib/api/types";
import { fileRouteFromUri } from "@/lib/file-uri";
import { cn, formatBytes, formatDate } from "@/lib/utils";

export function FileTable({
  files,
  selected,
  onSelectedChange,
  handlers,
  onFileContextMenu
}: {
  files: FileResponse[];
  selected: string[];
  onSelectedChange: (uris: string[]) => void;
  handlers: FileActionHandlers;
  onFileContextMenu?: (event: React.MouseEvent, file: FileResponse) => void;
}) {
  const router = useRouter();
  const allSelected = files.length > 0 && selected.length === files.length;

  function toggle(uri: string) {
    onSelectedChange(selected.includes(uri) ? selected.filter((item) => item !== uri) : [...selected, uri]);
  }

  return (
    <div className="page-enter overflow-hidden rounded-lg border bg-card">
      <div className="hidden grid-cols-[44px_minmax(240px,1fr)_120px_170px_64px] border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground md:grid">
        <div>
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onSelectedChange(checked ? files.map((file) => file.path) : [])}
          />
        </div>
        <div>名称</div>
        <div>大小</div>
        <div>更新时间</div>
        <div />
      </div>
      <div className="divide-y">
        {files.map((file) => (
          <div
            key={file.path}
            data-file-item
            className={cn(
              "grid grid-cols-[40px_minmax(0,1fr)_44px] items-center gap-2 px-3 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[44px_minmax(240px,1fr)_120px_170px_64px]",
              selected.includes(file.path) && "bg-primary/5"
            )}
            onContextMenu={(event) => onFileContextMenu?.(event, file)}
          >
            <Checkbox checked={selected.includes(file.path)} onCheckedChange={() => toggle(file.path)} />
            <button
              type="button"
              className="flex min-w-0 items-center gap-3 text-left"
              onClick={() => {
                if (file.type === 1 && !handlers.trashMode) {
                  router.push(fileRouteFromUri(file.path));
                } else {
                  handlers.onDetails(file);
                }
              }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <FileIcon file={file} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{file.name}</span>
                <span className="block truncate text-xs text-muted-foreground md:hidden">
                  {file.type === 1 ? "文件夹" : formatBytes(file.size)} · {formatDate(file.updated_at)}
                </span>
              </span>
            </button>
            <div className="hidden text-sm text-muted-foreground md:block">{file.type === 1 ? "-" : formatBytes(file.size)}</div>
            <div className="hidden text-sm text-muted-foreground md:block">{formatDate(file.updated_at)}</div>
            <FileActions file={file} handlers={handlers} />
          </div>
        ))}
      </div>
    </div>
  );
}
