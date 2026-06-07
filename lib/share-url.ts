import { encodePathSegment, parseCloudrevePath } from "@/lib/file-uri";

export function getShareId(value?: string | null) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const match = trimmed.match(/\/s\/([^/?#]+)/i);
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }

  return trimmed.replace(/^\/?s\//i, "").split(/[?#]/)[0];
}

export function getFrontendSharePath(value?: string | null) {
  const id = getShareId(value);
  return id ? `/s/${encodeURIComponent(id)}` : "";
}

export function getFrontendShareUrl(value?: string | null, password?: string | null) {
  const path = getFrontendSharePath(value);
  if (!path) {
    return "";
  }

  if (typeof window === "undefined") {
    return password ? `${path}?password=${encodeURIComponent(password)}` : path;
  }

  const url = new URL(path, window.location.origin);
  if (password) {
    url.searchParams.set("password", password);
  }

  return url.toString();
}

export function getShareRootUri(id: string, password?: string) {
  const suffix = password ? `:${encodeURIComponent(password)}` : "";
  return `cloudreve://${id}${suffix}@share`;
}

export function withSharePassword(uri: string, password?: string) {
  if (!password || !uri.startsWith("cloudreve://")) {
    return uri;
  }

  return uri.replace(/^cloudreve:\/\/([^:@/]+)(?::[^@/]*)?@share/, `cloudreve://$1:${encodeURIComponent(password)}@share`);
}

export function getShareRouteFromUri(id: string, uri: string) {
  const segments = parseCloudrevePath(uri);
  const path = segments.map(encodePathSegment).join("/");
  return path ? `/s/${encodeURIComponent(id)}/${path}` : `/s/${encodeURIComponent(id)}`;
}

export function buildShareUriFromRoute(id: string, pathSegments?: string[], password?: string) {
  const base = getShareRootUri(id, password);
  const path = (pathSegments ?? [])
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .filter(Boolean)
    .map(encodePathSegment)
    .join("/");

  return path ? `${base}/${path}` : base;
}
