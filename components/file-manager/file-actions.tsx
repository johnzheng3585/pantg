"use client";

import { Download, Edit3, FolderInput, Info, Link2, MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { FileResponse } from "@/lib/api/types";

export interface FileActionHandlers {
  onDownload: (file: FileResponse) => void;
  onRename: (file: FileResponse) => void;
  onMoveCopy: (file: FileResponse, copy: boolean) => void;
  onDelete: (file: FileResponse) => void;
  onRestore?: (file: FileResponse) => void;
  onShare: (file: FileResponse) => void;
  onDetails: (file: FileResponse) => void;
  trashMode?: boolean;
}

export function FileActions({ file, handlers }: { file: FileResponse; handlers: FileActionHandlers }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="更多操作">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {handlers.trashMode ? (
          <DropdownMenuItem onClick={() => handlers.onRestore?.(file)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            恢复
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem onClick={() => handlers.onDownload(file)}>
              <Download className="mr-2 h-4 w-4" />
              下载
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlers.onShare(file)}>
              <Link2 className="mr-2 h-4 w-4" />
              创建分享
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlers.onRename(file)}>
              <Edit3 className="mr-2 h-4 w-4" />
              重命名
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlers.onMoveCopy(file, false)}>
              <FolderInput className="mr-2 h-4 w-4" />
              移动
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlers.onMoveCopy(file, true)}>
              <FolderInput className="mr-2 h-4 w-4" />
              复制
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={() => handlers.onDetails(file)}>
          <Info className="mr-2 h-4 w-4" />
          详情
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => handlers.onDelete(file)}>
          <Trash2 className="mr-2 h-4 w-4" />
          {handlers.trashMode ? "永久删除" : "删除"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
