"use client";

import { ChevronDown, ChevronRight, Folder, Home } from "lucide-react";
import * as React from "react";

import { LoadingPanel } from "@/components/page-state";
import { Button } from "@/components/ui/button";
import { fileApi } from "@/lib/api/services";
import { buildBreadcrumbs } from "@/lib/file-uri";

function isFolder(type: number) {
  return type === 1;
}

export function formatFolderUri(uri: string) {
  return buildBreadcrumbs(uri).map((item) => item.label).join(" / ");
}

export function FolderPicker({
  value,
  onChange,
  rootUri = "cloudreve://my",
  label = "选择文件夹"
}: {
  value: string;
  onChange: (uri: string) => void;
  rootUri?: string;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [browseUri, setBrowseUri] = React.useState(value || rootUri);
  const [folders, setFolders] = React.useState<Array<{ name: string; path: string; type: number }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setBrowseUri(value || rootUri);
    }
  }, [open, rootUri, value]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);
    fileApi
      .list({ uri: browseUri, page_size: 100, order_by: "name", order_direction: "asc", toastError: false })
      .then((data) => {
        if (mounted) {
          setFolders((data.files ?? []).filter((file) => isFolder(file.type)));
        }
      })
      .catch((nextError) => {
        if (mounted) {
          setError(nextError instanceof Error ? nextError.message : "目录加载失败");
          setFolders([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [browseUri, open]);

  return (
    <div className="grid gap-2">
      <button
        type="button"
        className="flex h-10 items-center justify-between rounded-md border bg-background px-3 text-left text-sm hover:bg-muted/50"
        onClick={() => setOpen((next) => !next)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{formatFolderUri(value || rootUri)}</span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open ? (
        <div className="rounded-md border">
          <div className="flex flex-wrap items-center gap-1 border-b p-2">
            {buildBreadcrumbs(browseUri).map((crumb) => (
              <Button key={crumb.uri} type="button" variant="ghost" size="sm" onClick={() => setBrowseUri(crumb.uri)}>
                {crumb.label}
              </Button>
            ))}
          </div>
          <div className="max-h-56 overflow-y-auto p-2">
            {loading ? <LoadingPanel rows={2} /> : null}
            {error ? <p className="p-3 text-sm text-destructive">{error}</p> : null}
            {!loading && !error && !folders.length ? <p className="p-3 text-center text-sm text-muted-foreground">当前目录没有子文件夹</p> : null}
            <div className="grid gap-1">
              {folders.map((folder) => (
                <button
                  key={folder.path}
                  type="button"
                  className="flex items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => setBrowseUri(folder.path)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{folder.name}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end border-t p-2">
            <Button type="button" size="sm" onClick={() => {
              onChange(browseUri);
              setOpen(false);
            }}>
              使用此目录
            </Button>
          </div>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
