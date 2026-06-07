import type { FileResponse } from "@/lib/api/types";

export const TEXT_PREVIEW_MAX_SIZE = 2 * 1024 * 1024;

export type FilePreviewKind = "video" | "audio" | "image" | "pdf" | "markdown" | "text" | "none";

export function getFileExtension(file?: Pick<FileResponse, "name" | "type"> | null) {
  if (!file || file.type === 1) {
    return "";
  }

  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export function getPreviewKind(file?: Pick<FileResponse, "name" | "type"> | null): FilePreviewKind {
  const ext = getFileExtension(file);
  if (!ext) return "none";
  if (["mp4", "webm", "ogv", "mov", "m4v"].includes(ext)) return "video";
  if (["mp3", "flac", "wav", "aac", "ogg", "oga", "m4a", "opus"].includes(ext)) return "audio";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (ext === "md" || ext === "markdown") return "markdown";
  if (
    [
      "txt",
      "json",
      "xml",
      "yaml",
      "yml",
      "csv",
      "log",
      "ini",
      "toml",
      "ts",
      "tsx",
      "js",
      "jsx",
      "css",
      "scss",
      "sass",
      "less",
      "html",
      "htm",
      "vue",
      "svelte",
      "go",
      "py",
      "java",
      "c",
      "cpp",
      "h",
      "hpp",
      "rs",
      "php",
      "rb",
      "sh",
      "bat",
      "ps1",
      "sql",
      "env",
      "gitignore"
    ].includes(ext)
  ) {
    return "text";
  }

  return "none";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(value: string) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noreferrer">$1</a>');
  return html;
}

export function renderMarkdown(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let listItems: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  function flushList() {
    if (listItems.length) {
      blocks.push(`<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
      listItems = [];
    }
  }

  function flushCode() {
    if (codeLines.length) {
      blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      codeLines = [];
    }
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const list = line.match(/^\s*[-*]\s+(.+)$/);
    if (list) {
      listItems.push(list[1]);
      continue;
    }

    if (!line.trim()) {
      flushList();
      continue;
    }

    flushList();
    blocks.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  flushList();
  if (inCode) {
    flushCode();
  }

  return blocks.join("");
}
