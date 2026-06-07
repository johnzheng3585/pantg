import { AlertCircle, FolderOpen, Loader2 } from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({
  title,
  description,
  actions
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function LoadingPanel({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="page-enter flex items-center gap-3 rounded-md border bg-card p-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

export function CenterLoading({ label = "加载中..." }: { label?: string }) {
  return (
    <div className="page-enter flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  compact = false
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "page-enter flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-6 text-center" : "page-enter flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 p-8 text-center"}>
      <FolderOpen className={compact ? "h-8 w-8 text-muted-foreground" : "h-10 w-10 text-muted-foreground"} />
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "请求失败",
  description,
  onRetry
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="page-enter flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-destructive/30 bg-card p-8 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {onRetry ? (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          重新加载
        </Button>
      ) : null}
    </div>
  );
}
