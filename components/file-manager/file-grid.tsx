"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { FileActions, type FileActionHandlers } from "@/components/file-manager/file-actions";
import { FileIcon, getFileKind } from "@/components/file-manager/file-icon";
import { fileApi } from "@/lib/api/services";
import type { FileResponse } from "@/lib/api/types";
import { fileRouteFromUri } from "@/lib/file-uri";
import { cn, formatBytes } from "@/lib/utils";

function Thumb({ file, contextHint }: { file: FileResponse; contextHint?: string }) {
  const [src, setSrc] = React.useState<string>("");
  const kind = getFileKind(file);

  React.useEffect(() => {
    let mounted = true;
    if (kind !== "image") {
      return;
    }
    fileApi.thumbSrc(file.path, contextHint).then((url) => mounted && setSrc(url)).catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [contextHint, file.path, kind]);

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={file.name} className="h-full w-full object-cover" />;
  }

  return <FileIcon file={file} className="h-7 w-7" />;
}

export function FileGrid({
  files,
  selected,
  onSelectedChange,
  handlers,
  contextHint,
  onFileContextMenu
}: {
  files: FileResponse[];
  selected: string[];
  onSelectedChange: (uris: string[]) => void;
  handlers: FileActionHandlers;
  contextHint?: string;
  onFileContextMenu?: (event: React.MouseEvent, file: FileResponse) => void;
}) {
  const router = useRouter();

  function toggle(uri: string) {
    onSelectedChange(selected.includes(uri) ? selected.filter((item) => item !== uri) : [...selected, uri]);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {files.map((file) => (
        <div
          key={file.path}
          data-file-item
          className={cn(
            "group rounded-lg border bg-card p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-md",
            selected.includes(file.path) && "border-primary bg-primary/5"
          )}
          onContextMenu={(event) => onFileContextMenu?.(event, file)}
        >
          <div className="flex items-center justify-between gap-2">
            <Checkbox checked={selected.includes(file.path)} onCheckedChange={() => toggle(file.path)} />
            <FileActions file={file} handlers={handlers} />
          </div>
          <button
            type="button"
            className="mt-2 flex w-full items-center gap-3 text-left"
            onClick={() => {
              if (file.type === 1 && !handlers.trashMode) {
                router.push(fileRouteFromUri(file.path));
              } else {
                handlers.onDetails(file);
              }
            }}
          >
            <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary/70 text-secondary-foreground sm:w-24">
              <Thumb file={file} contextHint={contextHint} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{file.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{file.type === 1 ? "文件夹" : formatBytes(file.size)}</div>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
