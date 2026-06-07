import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(value?: number | null) {
  if (!value || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** index;
  return `${size >= 10 || index === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[index]}`;
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function getInitials(name?: string | null) {
  if (!name) {
    return "CR";
  }

  const normalized = name.trim();
  if (!normalized) {
    return "CR";
  }

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

const taskStatusLabels: Record<string, string> = {
  completed: "已完成",
  error: "失败",
  failed: "失败",
  pending: "等待中",
  queued: "排队中",
  processing: "进行中",
  running: "进行中",
  active: "进行中",
  suspending: "暂停中",
  suspended: "已暂停",
  canceled: "已取消",
  cancelled: "已取消",
  paused: "已暂停"
};

const paymentStatusLabels: Record<string, string> = {
  fulfilled: "已完成",
  paid: "已支付",
  pending: "待支付",
  unpaid: "待支付",
  processing: "处理中",
  canceled: "已取消",
  cancelled: "已取消",
  expired: "已过期",
  failed: "失败"
};

const workflowTypeLabels: Record<string, string> = {
  remote_download: "离线下载",
  downloading: "离线下载",
  general: "普通任务"
};

const downloadStateLabels: Record<string, string> = {
  downloading: "下载中",
  seeding: "做种中",
  checking: "校验中",
  suspending: "暂停中",
  suspended: "已暂停",
  paused: "已暂停",
  completed: "已完成",
  error: "失败",
  failed: "失败",
  waiting: "等待中",
  queued: "排队中"
};

const storagePolicyTypeLabels: Record<string, string> = {
  local: "本地存储",
  remote: "远程存储",
  load_balance: "智能调度",
  qiniu: "七牛云",
  upyun: "又拍云",
  oss: "阿里云 OSS",
  cos: "腾讯云 COS",
  s3: "S3 兼容存储",
  onedrive: "OneDrive",
  obs: "华为云 OBS",
  ks3: "金山云 KS3"
};

export function formatUserGroup(value?: string | null) {
  if (!value) return "默认用户组";
  if (value.toLowerCase() === "user") return "普通用户";
  return value;
}

export function formatSiteName(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === "cloudreve") return "个人网盘";
  return trimmed;
}

export function formatTaskStatus(value?: string | null) {
  if (!value) return "未知";
  return taskStatusLabels[value.toLowerCase()] ?? value;
}

export function formatPaymentStatus(value?: string | null) {
  if (!value) return "未知";
  return paymentStatusLabels[value.toLowerCase()] ?? value;
}

export function formatWorkflowType(value?: string | null) {
  if (!value) return "任务";
  return workflowTypeLabels[value.toLowerCase()] ?? value;
}

export function formatDownloadState(value?: string | null) {
  if (!value) return null;
  return downloadStateLabels[value.toLowerCase()] ?? value;
}

export function formatStoragePolicyType(value?: string | null) {
  if (!value) return "存储策略";
  return storagePolicyTypeLabels[value.toLowerCase()] ?? value;
}

export function formatStoragePolicyName(value?: string | null, type?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return "默认存储";

  const lowered = normalized.toLowerCase();
  const technicalNames = new Set(["default storage", "default storage policy", "load_balance", "s3-1", "s3_1"]);
  if (technicalNames.has(lowered)) {
    return "默认存储";
  }

  if (storagePolicyTypeLabels[lowered]) {
    return storagePolicyTypeLabels[lowered];
  }

  if (type?.toLowerCase() === "load_balance" && lowered.includes("load")) {
    return "默认存储";
  }

  return normalized;
}

export function formatStoragePolicyDisplay(policy?: { name?: string | null; type?: string | null } | null) {
  if (!policy) return "默认存储";
  const name = formatStoragePolicyName(policy.name, policy.type);
  const type = formatStoragePolicyType(policy.type);
  return name === type ? name : `${name}（${type}）`;
}

export function isFinishedStatus(value?: string | null) {
  return Boolean(value && ["completed", "fulfilled", "paid"].includes(value.toLowerCase()));
}

export function isFailedStatus(value?: string | null) {
  return Boolean(value && ["error", "failed", "canceled", "cancelled", "expired"].includes(value.toLowerCase()));
}
