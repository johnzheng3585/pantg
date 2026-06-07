import { Archive, File, FileAudio, FileCode, FileImage, FileText, FileVideo, Folder } from "lucide-react";

import type { FileResponse } from "@/lib/api/types";

export function getFileKind(file: Pick<FileResponse, "type" | "name">) {
  if (file.type === 1) {
    return "folder";
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"].includes(ext)) {
    return "image";
  }
  if (["mp4", "mkv", "mov", "webm", "avi", "flv"].includes(ext)) {
    return "video";
  }
  if (["mp3", "flac", "wav", "aac", "ogg"].includes(ext)) {
    return "audio";
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return "archive";
  }
  if (["ts", "tsx", "js", "jsx", "json", "go", "py", "css", "html", "md"].includes(ext)) {
    return "code";
  }
  if (["txt", "doc", "docx", "pdf", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
    return "document";
  }
  return "file";
}

export function FileIcon({ file, className = "h-5 w-5" }: { file: Pick<FileResponse, "type" | "name">; className?: string }) {
  const kind = getFileKind(file);
  const iconClass = className;
  if (kind === "folder") return <Folder className={iconClass} />;
  if (kind === "image") return <FileImage className={iconClass} />;
  if (kind === "video") return <FileVideo className={iconClass} />;
  if (kind === "audio") return <FileAudio className={iconClass} />;
  if (kind === "archive") return <Archive className={iconClass} />;
  if (kind === "code") return <FileCode className={iconClass} />;
  if (kind === "document") return <FileText className={iconClass} />;
  return <File className={iconClass} />;
}
