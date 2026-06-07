"use client";

import * as React from "react";
import {
  Clipboard,
  CloudDownload,
  Copy,
  Download,
  Edit3,
  FilePlus,
  FileText,
  FolderInput,
  FolderPlus,
  FolderUp,
  Info,
  Link2,
  RefreshCcw,
  RotateCcw,
  Trash2,
  Upload
} from "lucide-react";
import { createPortal } from "react-dom";

import { FileIcon } from "@/components/file-manager/file-icon";
import type { FileActionHandlers } from "@/components/file-manager/file-actions";
import type { FileResponse } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface FileContextMenuState {
  x: number;
  y: number;
  file: FileResponse | null;
}

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function MenuButton({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      disabled={item.disabled}
      className={cn(
        "flex h-8 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50",
        item.danger && "text-destructive"
      )}
      onClick={() => {
        item.action();
        onClose();
      }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function Separator() {
  return <div className="-mx-1 my-1 h-px bg-border" />;
}

export function FileContextMenu({
  menu,
  trashMode,
  handlers,
  onClose,
  onUploadFiles,
  onUploadFolder,
  onClipboardUpload,
  onRemoteDownload,
  onCreateFolder,
  onCreateFile,
  onCreateTemplate,
  onOpenFolder,
  onRefresh
}: {
  menu: FileContextMenuState | null;
  trashMode?: boolean;
  handlers: FileActionHandlers;
  onClose: () => void;
  onUploadFiles: () => void;
  onUploadFolder: () => void;
  onClipboardUpload: () => void;
  onRemoteDownload: () => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onCreateTemplate: (name: string) => void;
  onOpenFolder: (file: FileResponse) => void;
  onRefresh: () => void;
}) {
  const [portalHost, setPortalHost] = React.useState<HTMLElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = React.useState({ left: menu?.x ?? 0, top: menu?.y ?? 0 });

  React.useEffect(() => {
    setPortalHost(document.body);
  }, []);

  React.useLayoutEffect(() => {
    if (!menu) {
      return;
    }

    const element = menuRef.current;
    if (!element) {
      setPosition({ left: menu.x + 2, top: menu.y + 2 });
      return;
    }

    const rect = element.getBoundingClientRect();
    const gap = 2;
    const nextLeft = window.innerWidth - menu.x < rect.width + gap ? Math.max(gap, menu.x - rect.width - gap) : menu.x + gap;
    const nextTop = window.innerHeight - menu.y < rect.height + gap ? Math.max(gap, menu.y - rect.height - gap) : menu.y + gap;
    setPosition({ left: nextLeft, top: nextTop });
  }, [menu]);

  if (!menu || !portalHost) {
    return null;
  }

  const file = menu.file;
  const currentMenu: MenuItem[] = [
    { label: "上传文件", icon: Upload, action: onUploadFiles },
    { label: "上传目录", icon: FolderUp, action: onUploadFolder },
    { label: "从剪贴板上传", icon: Clipboard, action: onClipboardUpload },
    { label: "离线下载", icon: CloudDownload, action: onRemoteDownload },
    { label: "创建文件夹", icon: FolderPlus, action: onCreateFolder },
    { label: "创建文件", icon: FilePlus, action: onCreateFile },
    { label: "Markdown (.md)", icon: FileText, action: () => onCreateTemplate("新建 Markdown.md") },
    { label: "draw.io (.drawio)", icon: FilePlus, action: () => onCreateTemplate("新建 draw.io.drawio") },
    { label: "文本 (.txt)", icon: FileText, action: () => onCreateTemplate("新建文本.txt") },
    { label: "Excalidraw (.excalidraw)", icon: FilePlus, action: () => onCreateTemplate("新建绘图.excalidraw") },
    { label: "Doc (.docx)", icon: FileText, action: () => onCreateTemplate("新建文档.docx") },
    { label: "Sheet (.xlsx)", icon: FileText, action: () => onCreateTemplate("新建表格.xlsx") },
    { label: "Slides (.pptx)", icon: FileText, action: () => onCreateTemplate("新建演示文稿.pptx") },
    { label: "刷新", icon: RefreshCcw, action: onRefresh }
  ];

  const fileMenu: MenuItem[] = file
    ? trashMode
      ? [
          { label: "恢复", icon: RotateCcw, action: () => handlers.onRestore?.(file) },
          { label: "详情", icon: Info, action: () => handlers.onDetails(file) },
          { label: "永久删除", icon: Trash2, danger: true, action: () => handlers.onDelete(file) }
        ]
      : [
          ...(file.type === 1 ? [{ label: "打开", icon: FolderInput, action: () => onOpenFolder(file) }] : []),
          { label: "下载", icon: Download, action: () => handlers.onDownload(file) },
          { label: "创建分享", icon: Link2, action: () => handlers.onShare(file) },
          { label: "重命名", icon: Edit3, action: () => handlers.onRename(file) },
          { label: "移动", icon: FolderInput, action: () => handlers.onMoveCopy(file, false) },
          { label: "复制", icon: Copy, action: () => handlers.onMoveCopy(file, true) },
          { label: "详情", icon: Info, action: () => handlers.onDetails(file) },
          { label: "删除", icon: Trash2, danger: true, action: () => handlers.onDelete(file) }
        ]
    : [];

  const menuNode = (
    <div
      ref={menuRef}
      data-app-context-menu
      className="fixed z-50 w-64 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
      style={{ left: position.left, top: position.top }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {file ? (
        <>
          <div className="flex items-center gap-3 px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary">
              <FileIcon file={file} className="h-4 w-4" />
            </span>
            <span className="truncate text-sm font-medium">{file.name}</span>
          </div>
          <Separator />
          {fileMenu.map((item) => (
            <MenuButton key={item.label} item={item} onClose={onClose} />
          ))}
        </>
      ) : (
        <>
          {currentMenu.slice(0, 4).map((item) => (
            <MenuButton key={item.label} item={item} onClose={onClose} />
          ))}
          <Separator />
          {currentMenu.slice(4, 6).map((item) => (
            <MenuButton key={item.label} item={item} onClose={onClose} />
          ))}
          <Separator />
          {currentMenu.slice(6, 13).map((item) => (
            <MenuButton key={item.label} item={item} onClose={onClose} />
          ))}
          <Separator />
          <MenuButton item={currentMenu[13]} onClose={onClose} />
        </>
      )}
    </div>
  );

  return createPortal(menuNode, portalHost);
}
