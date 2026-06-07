export type CloudreveFileSystem = "my" | "shared_with_me" | "trash" | "share";

export interface BreadcrumbItem {
  label: string;
  uri: string;
}

export function encodePathSegment(segment: string) {
  return encodeURIComponent(segment).replace(/%2F/g, "/");
}

export function joinCloudreveUri(baseUri: string, name: string) {
  const [withoutQuery] = baseUri.split("?");
  const trimmedBase = withoutQuery.endsWith("/") ? withoutQuery.slice(0, -1) : withoutQuery;
  return `${trimmedBase}/${encodePathSegment(name)}`;
}

export function buildCloudreveUri(path = "", fs: CloudreveFileSystem = "my") {
  const normalized = path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map(encodePathSegment)
    .join("/");

  return normalized ? `cloudreve://${fs}/${normalized}` : `cloudreve://${fs}`;
}

export function addSearchQuery(uri: string, keyword: string) {
  const [base] = uri.split("?");
  const params = new URLSearchParams();
  if (keyword.trim()) {
    params.append("name", keyword.trim());
    params.set("case_folding", "true");
    params.set("use_or", "true");
  }

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function parseCloudrevePath(uri: string) {
  const withoutQuery = uri.split("?")[0] ?? uri;
  const pathStart = withoutQuery.indexOf("/", "cloudreve://".length);
  if (pathStart < 0) {
    return [];
  }

  return withoutQuery
    .slice(pathStart + 1)
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
}

export function fileRouteFromUri(uri: string) {
  const segments = parseCloudrevePath(uri);
  const path = segments.map(encodeURIComponent).join("/");
  return path ? `/files/${path}` : "/files";
}

export function trashRouteFromUri(uri: string) {
  const segments = parseCloudrevePath(uri);
  const path = segments.map(encodeURIComponent).join("/");
  return path ? `/trash/${path}` : "/trash";
}

export function routePathToCloudreveUri(pathSegments?: string[], fs: CloudreveFileSystem = "my") {
  return buildCloudreveUri(
    (pathSegments ?? [])
      .map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      })
      .join("/"),
    fs
  );
}

export function getCloudreveFs(uri: string) {
  const match = uri.match(/^cloudreve:\/\/(?:([^:@]+)(?::([^@]+))?@)?([^/?#]+)/);
  return {
    user: match?.[1],
    password: match?.[2],
    fs: (match?.[3] ?? "my") as CloudreveFileSystem
  };
}

export function buildBreadcrumbs(uri: string): BreadcrumbItem[] {
  const { fs } = getCloudreveFs(uri);
  const labels: Record<string, string> = {
    my: "我的文件",
    shared_with_me: "与我共享",
    trash: "回收站",
    share: "分享"
  };

  const segments = parseCloudrevePath(uri);
  const rootUri = `cloudreve://${fs}`;
  const crumbs: BreadcrumbItem[] = [{ label: labels[fs] ?? fs, uri: rootUri }];

  let current = rootUri;
  for (const segment of segments) {
    current = joinCloudreveUri(current, segment);
    crumbs.push({ label: segment, uri: current });
  }

  return crumbs;
}

export function isTrashUri(uri: string) {
  return getCloudreveFs(uri).fs === "trash";
}
