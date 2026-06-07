import { request, resolveApiAssetUrl, type RequestOptions } from "@/lib/api/request";
import { getRefreshToken } from "@/lib/api/token-store";
import { joinCloudreveUri } from "@/lib/file-uri";
import type {
  CaptchaResponse,
  CloudreveResponse,
  DavAccount,
  DownloadUrlResponse,
  FileResponse,
  ListCreditChangesResponse,
  ListDavAccountResponse,
  ListFilesResponse,
  ListPaymentResponse,
  ListShareResponse,
  GiftCodeInfo,
  LoginResponse,
  NodeInfo,
  PaymentCreateResponse,
  Preferences,
  Progress,
  Share,
  SiteBasicConfig,
  SiteVasConfig,
  StorageCapacity,
  StoragePolicy,
  ThumbnailResponse,
  TaskListResponse,
  TokenPair,
  User
} from "@/lib/api/types";

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeFiles(data: ListFilesResponse): ListFilesResponse {
  return {
    ...data,
    files: asArray(data.files)
  };
}

function normalizeShares(data: ListShareResponse): ListShareResponse {
  return {
    ...data,
    shares: asArray(data.shares)
  };
}

function normalizeTasks(data: TaskListResponse): TaskListResponse {
  return {
    ...data,
    tasks: asArray(data.tasks)
  };
}

function normalizeDavAccounts(data: ListDavAccountResponse): ListDavAccountResponse {
  return {
    ...data,
    accounts: asArray(data.accounts)
  };
}

function normalizePayments(data: ListPaymentResponse): ListPaymentResponse {
  return {
    ...data,
    payments: asArray(data.payments)
  };
}

interface UploadedChunkPart {
  index: number;
  etag?: string;
}

function encodeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function encodeMultipartCompleteXml(parts: UploadedChunkPart[]) {
  return `<CompleteMultipartUpload>${parts
    .map((part) => `<Part><PartNumber>${part.index + 1}</PartNumber><ETag>${encodeXml(part.etag ?? "")}</ETag></Part>`)
    .join("")}</CompleteMultipartUpload>`;
}

function normalizeEtag(etag?: string | null) {
  return etag?.trim() || "";
}

function isObjectStoragePolicy(type?: string | null) {
  return Boolean(type && ["s3", "cos", "oss", "ks3", "obs"].includes(type));
}

async function uploadToSignedUrl(url: string, chunk: Blob, requireEtag = true) {
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "content-type": "application/octet-stream"
    },
    body: chunk
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || response.statusText || "对象存储分片上传失败。");
  }

  const etag = normalizeEtag(response.headers.get("etag"));
  if (requireEtag && !etag) {
    throw new Error("对象存储未返回 ETag，请检查存储策略 CORS 是否暴露 ETag 响应头。");
  }

  return etag;
}

async function finishS3LikeMultipartUpload(
  session: import("@/lib/api/types").UploadSession,
  parts: UploadedChunkPart[],
  policyType: string
) {
  if (!session.completeURL) {
    throw new Error("对象存储未返回完成上传地址。");
  }

  const headers: Record<string, string> = {
    "content-type": "application/octet-stream"
  };
  let body = encodeMultipartCompleteXml(parts);

  if (policyType === "oss") {
    body = "";
    headers["x-oss-forbid-overwrite"] = "true";
    headers["x-oss-complete-all"] = "yes";
  }

  if (policyType === "cos") {
    headers["x-cos-forbid-overwrite"] = "true";
  }

  const response = await fetch(session.completeURL, {
    method: "POST",
    headers,
    body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || response.statusText || "对象存储完成上传失败。");
  }
}

export const siteApi = {
  ping: () => request<string>("/ping", { auth: false }),
  captcha: () => request<CaptchaResponse>("/site/captcha", { auth: false }),
  config: <T = SiteBasicConfig | SiteVasConfig>(section: "basic" | "login" | "explorer" | "emojis" | "vas" | "app" | "thumb", options: RequestOptions = {}) =>
    request<T>(`/site/config/${section}`, { auth: false, toastError: false, ...options })
};

export const authApi = {
  login: (payload: { email: string; password: string; captcha?: string; ticket?: string }) =>
    request<LoginResponse | string>("/session/token", {
      method: "POST",
      body: payload,
      auth: false,
      toastError: false,
      okCodes: [203]
    }),
  finish2fa: (payload: { otp: string; session_id: string }) =>
    request<LoginResponse>("/session/token/2fa", {
      method: "POST",
      body: payload,
      auth: false,
      toastError: false
    }),
  refresh: (refresh_token: string) =>
    request<TokenPair>("/session/token/refresh", {
      method: "POST",
      body: { refresh_token },
      auth: false,
      skipRefresh: true
    }),
  signOut: () =>
    request<string | null>("/session/token", {
      method: "DELETE",
      body: { refresh_token: getRefreshToken() },
      auth: false,
      toastError: false
    }),
  signUp: (payload: { email: string; password: string; captcha?: string; ticket?: string }) =>
    request<User | string>("/user", {
      method: "POST",
      body: payload,
      auth: false,
      toastError: false,
      okCodes: [203]
    }),
  sendResetEmail: (payload: { email: string; captcha?: string; ticket?: string }) =>
    request<void>("/user/reset", {
      method: "POST",
      body: payload,
      auth: false,
      toastError: false
    }),
  resetPassword: (userId: string, payload: { password: string; secret: string }) =>
    request<User>(`/user/reset/${userId}`, {
      method: "PATCH",
      body: payload,
      auth: false,
      toastError: false
    })
};

export const userApi = {
  getUser: (userId: string) => request<User>(`/user/info/${userId}`, { toastError: false }),
  capacity: () => request<StorageCapacity>("/user/capacity"),
  preferences: () => request<Preferences>("/user/setting"),
  updatePreferences: (payload: Partial<Preferences> & Record<string, unknown>) =>
    request<void>("/user/setting", {
      method: "PATCH",
      body: payload
    }),
  updateAvatar: (file?: Blob) =>
    request<void>("/user/setting/avatar", {
      method: "PUT",
      body: file ?? null,
      headers: file ? { "content-type": file.type || "application/octet-stream" } : undefined
    }),
  policies: () => request<StoragePolicy[]>("/user/setting/policies", { toastError: false }),
  nodes: () => request<NodeInfo[]>("/user/setting/nodes", { toastError: false }),
  prepare2fa: () => request<string>("/user/setting/2fa", { toastError: false }),
  payments: (params: { page_size?: number; next_page_token?: string } = {}) =>
    request<ListPaymentResponse>("/user/payments", {
      query: { page_size: params.page_size ?? 50, next_page_token: params.next_page_token },
      toastError: false
    }).then(normalizePayments),
  creditChanges: (params: { page_size?: number; next_page_token?: string } = {}) =>
    request<ListCreditChangesResponse>("/user/creditChanges", {
      query: { page_size: params.page_size ?? 50, order_direction: "desc", next_page_token: params.next_page_token },
      toastError: false
    })
};

export const fileApi = {
  list: (params: {
    uri: string;
    page?: number;
    page_size?: number;
    order_by?: string;
    order_direction?: "asc" | "desc";
    next_page_token?: string;
    toastError?: boolean;
    auth?: boolean;
  }) =>
    request<ListFilesResponse>("/file", {
      query: {
        uri: params.uri,
        page: params.page ?? 0,
        page_size: params.page_size ?? 100,
        order_by: params.order_by,
        order_direction: params.order_direction,
        next_page_token: params.next_page_token
      },
      auth: params.auth,
      toastError: params.toastError
    }).then(normalizeFiles),
  info: (params: { uri?: string; id?: string; extended?: boolean; folder_summary?: boolean }) =>
    request<FileResponse>("/file/info", {
      query: params,
      toastError: false
    }),
  create: (payload: { uri: string; type: "file" | "folder"; metadata?: Record<string, string>; err_on_conflict?: boolean }) =>
    request<FileResponse>("/file/create", {
      method: "POST",
      body: payload
    }),
  createFolder: (parentUri: string, name: string) =>
    fileApi.create({
      uri: joinCloudreveUri(parentUri, name),
      type: "folder",
      err_on_conflict: true
    }),
  rename: (payload: { uri: string; new_name: string }) =>
    request<FileResponse>("/file/rename", {
      method: "POST",
      body: payload
    }),
  move: (payload: { uris: string[]; dst: string; copy?: boolean }) =>
    request<void>("/file/move", {
      method: "POST",
      body: payload
    }),
  delete: (payload: { uris: string[]; unlink?: boolean; skip_soft_delete?: boolean; toastError?: boolean }) =>
    request<void>("/file", {
      method: "DELETE",
      body: {
        uris: payload.uris,
        unlink: payload.unlink,
        skip_soft_delete: payload.skip_soft_delete
      },
      toastError: payload.toastError
    }),
  forceUnlock: (tokens: string[]) =>
    request<void>("/file/lock", {
      method: "DELETE",
      body: { tokens },
      toastError: false
    }),
  restore: (uris: string[]) =>
    request<void>("/file/restore", {
      method: "POST",
      body: { uris }
    }),
  downloadUrl: (payload: {
    uris: string[];
    download?: boolean;
    redirect?: boolean;
    entity?: string;
    archive?: boolean;
    skip_error?: boolean;
    no_cache?: boolean;
    use_primary_site_url?: boolean;
    contextHint?: string;
    auth?: boolean;
    toastError?: boolean;
  }) =>
    request<DownloadUrlResponse>("/file/url", {
      method: "POST",
      headers: payload.contextHint ? { "X-Cr-Context-Hint": payload.contextHint } : undefined,
      auth: payload.auth,
      toastError: payload.toastError,
      body: {
        uris: payload.uris,
        download: payload.download ?? true,
        redirect: payload.redirect,
        entity: payload.entity,
        archive: payload.archive,
        skip_error: payload.skip_error,
        no_cache: payload.no_cache,
        use_primary_site_url: payload.use_primary_site_url
      }
    }).then((data) => ({
      ...data,
      urls: data.urls.map((item) => ({
        ...item,
        url: resolveApiAssetUrl(item.url)
      }))
    })),
  thumb: (uri: string, contextHint?: string) =>
    request<ThumbnailResponse>("/file/thumb", {
      query: { uri },
      headers: contextHint ? { "X-Cr-Context-Hint": contextHint } : undefined,
      toastError: false
    }),
  thumbSrc: async (uri: string, contextHint?: string) => {
    const thumb = await fileApi.thumb(uri, contextHint);
    if (thumb.obfuscated) {
      return "";
    }
    return resolveApiAssetUrl(thumb.url);
  },
  uploadSession: (payload: {
    uri: string;
    size: number;
    last_modified?: number;
    mime_type?: string;
    policy_id?: string;
    metadata?: Record<string, string>;
    entity_type?: "live_photo" | "version";
    encryption_supported?: string[];
    previous?: string;
  }) =>
    request<import("@/lib/api/types").UploadSession>("/file/upload", {
      method: "PUT",
      body: payload,
      toastError: false
    }),
  uploadChunk: (sessionId: string, index: number, chunk: Blob) =>
    request<void>(`/file/upload/${sessionId}/${index}`, {
      method: "POST",
      body: chunk,
      headers: { "content-type": "application/octet-stream" },
      toastError: false
    }),
  uploadRemoteChunk: (url: string, credential: string, index: number, chunk: Blob) =>
    request<void>(`${url}?chunk=${index}`, {
      method: "POST",
      body: chunk,
      headers: {
        "content-type": "application/octet-stream",
        authorization: credential
      },
      auth: false,
      toastError: false
    }),
  completeObjectStorageUpload: (policyType: string, sessionId: string, sessionKey: string) =>
    request<void>(`/callback/${policyType}/${encodeURIComponent(sessionId)}/${encodeURIComponent(sessionKey)}`, {
      method: "GET",
      toastError: false
    }),
  updateContent: (path: string, content: Blob) =>
    request<FileResponse>("/file/content", {
      method: "PUT",
      query: { path },
      body: content,
      headers: { "content-type": content.type || "application/octet-stream" },
      toastError: false
    }),
  deleteUploadSession: (payload: { id?: string; session_id?: string; uri?: string }) =>
    request<void>("/file/upload", {
      method: "DELETE",
      body: { id: payload.id ?? payload.session_id, uri: payload.uri },
      toastError: false
    })
};

export const shareApi = {
  create: (payload: {
    uri: string;
    permissions?: { anonymous?: string; everyone?: string };
    is_private?: boolean;
    share_view?: boolean;
    expire?: number;
    price?: number;
    password?: string;
    show_readme?: boolean;
  }) =>
    request<string | null>("/share", {
      method: "PUT",
      body: {
        permissions: payload.permissions ?? { anonymous: "AQ==", everyone: "AQ==" },
        uri: payload.uri,
        is_private: payload.is_private,
        share_view: payload.share_view,
        expire: payload.expire,
        price: payload.price,
        password: payload.password,
        show_readme: payload.show_readme
      }
    }),
  listMine: (params: {
    page_size?: number;
    order_by?: "views" | "downloads" | "price" | "remain_downloads" | "id" | "";
    order_direction?: "asc" | "desc";
    next_page_token?: string;
    toastError?: boolean;
  } = {}) =>
    request<ListShareResponse>("/share", {
      query: {
        page_size: params.page_size ?? 50,
        order_by: params.order_by,
        order_direction: params.order_direction ?? "desc",
        next_page_token: params.next_page_token
      },
      toastError: params.toastError
    }).then(normalizeShares),
  delete: (id: string) =>
    request<void>(`/share/${id}`, {
      method: "DELETE"
    }),
  info: (id: string) => request<Share>(`/share/${id}`, { toastError: false }),
  publicInfo: (id: string, params: { password?: string; count_views?: boolean; owner_extended?: boolean } = {}) =>
    request<Share>(`/share/info/${id}`, {
      auth: false,
      query: {
        password: params.password,
        count_views: params.count_views ?? false,
        owner_extended: params.owner_extended ?? true
      },
      toastError: false
    })
};

export const workflowApi = {
  createRemoteDownload: (payload: { dst: string; src?: string[]; src_file?: string; preferred_node_id?: string }) =>
    request<unknown>("/workflow/download", {
      method: "POST",
      body: payload
    }),
  list: (params: {
    page_size?: number;
    next_page_token?: string;
    category?: "general" | "downloading" | "downloaded";
    type?: string;
    status?: string;
    toastError?: boolean;
  } = {}) =>
    request<TaskListResponse>("/workflow", {
      query: {
        page_size: params.page_size ?? 50,
        category: params.category ?? "general",
        next_page_token: params.next_page_token,
        type: params.type,
        status: params.status
      },
      toastError: params.toastError
    }).then(normalizeTasks),
  progress: (id: string) => request<Progress | null>(`/workflow/progress/${id}`, { toastError: false }),
  cancel: (id: string) =>
    request<void>(`/workflow/download/${id}`, {
      method: "DELETE"
    }),
  selectFiles: (id: string, files: Array<{ index: number; download: boolean }>) =>
    request<void>(`/workflow/download/${id}`, {
      method: "PATCH",
      body: { files }
    })
};

export const davApi = {
  list: (params: { page_size?: number; next_page_token?: string } = {}) =>
    request<ListDavAccountResponse>("/devices/dav", {
      query: {
        page_size: params.page_size ?? 50,
        next_page_token: params.next_page_token
      },
      toastError: false
    }).then(normalizeDavAccounts),
  create: (payload: { name: string; uri: string; readonly?: boolean; proxy?: boolean; disable_sys_files?: boolean }) =>
    request<DavAccount>("/devices/dav", {
      method: "PUT",
      body: payload
    }),
  update: (id: string, payload: Partial<{ name: string; uri: string; readonly: boolean; proxy: boolean; disable_sys_files: boolean }>) =>
    request<DavAccount>(`/devices/dav/${id}`, {
      method: "PATCH",
      body: payload
    }),
  delete: (id: string) =>
    request<void>(`/devices/dav/${id}`, {
      method: "DELETE"
    })
};

export const vasApi = {
  groups: () => request<unknown[] | null>("/group/list", { toastError: false }).then(asArray),
  checkGiftCode: (code: string) => request<GiftCodeInfo>(`/vas/giftcode/${encodeURIComponent(code)}`, { toastError: false }),
  redeemGiftCode: (code: string) =>
    request<void>(`/vas/giftcode/${encodeURIComponent(code)}/redeem`, {
      method: "POST",
      toastError: false
    }),
  createPayment: (payload: {
    product: { type: 1 | 2 | 3 | 4; share_link_id?: string; sku_id?: string };
    quantity: number;
    provider_id?: string;
    email?: string;
    language?: string;
  }) =>
    request<PaymentCreateResponse>("/vas/payment", {
      method: "PUT",
      body: payload
    }),
  paymentStatus: (id: string, tradeNo: string) =>
    request<PaymentCreateResponse["payment"]>(`/vas/payment/status/${id}/${tradeNo}`, { toastError: false })
};

export async function uploadFileInChunks(
  file: File,
  targetUri: string,
  options: {
    policyId?: string;
    simpleUploadMaxSize?: number;
    onProgress?: (progress: number) => void;
  } = {}
) {
  if (file.size <= (options.simpleUploadMaxSize ?? 32 * 1024 * 1024)) {
    try {
      const result = await fileApi.updateContent(targetUri, file);
      options.onProgress?.(100);
      return {
        session_id: "",
        chunk_size: file.size,
        expires: 0,
        storage_policy: result.extended_info?.storage_policy ?? {
          id: "",
          name: "默认存储",
          type: "local",
          max_size: 0
        },
        uri: result.path
      };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("同名文件已存在") || message.includes("object existed") || message.includes("already exists")) {
        throw error;
      }
      // Some Cloudreve instances disable the simple content endpoint for new files.
      // Fall back to the normal upload session flow without showing a duplicate toast.
    }
  }

  const session = await fileApi.uploadSession({
    uri: targetUri,
    size: file.size,
    last_modified: file.lastModified,
    mime_type: file.type || undefined,
    policy_id: options.policyId
  });

  const canRelay =
    session.storage_policy.type === "local" ||
    session.storage_policy.type === "remote" ||
    session.storage_policy.type === "upyun" ||
    session.storage_policy.relay;

  const chunkSize = session.chunk_size > 0 ? session.chunk_size : file.size || 1;
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

  if (!canRelay && !isObjectStoragePolicy(session.storage_policy.type)) {
    await fileApi.deleteUploadSession({ id: session.session_id, uri: targetUri });
    throw new Error("当前存储策略暂不支持网页端上传，请切换为本地、中转或 S3 兼容存储。");
  }

  try {
    if (isObjectStoragePolicy(session.storage_policy.type)) {
      const parts: UploadedChunkPart[] = [];
      for (let index = 0; index < totalChunks; index += 1) {
        const url = session.upload_urls?.[index];
        if (!url) {
          throw new Error("对象存储未返回完整的分片上传地址。");
        }
        const start = index * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const etag = await uploadToSignedUrl(url, file.slice(start, end), session.storage_policy.type !== "oss");
        parts.push({ index, etag });
        options.onProgress?.(Math.min(99, Math.round(((index + 1) / totalChunks) * 100)));
      }

      await finishS3LikeMultipartUpload(session, parts, session.storage_policy.type);
      if (session.callback_secret && ["s3", "cos", "ks3"].includes(session.storage_policy.type)) {
        await fileApi.completeObjectStorageUpload(session.storage_policy.type, session.session_id, session.callback_secret);
      }
    } else {
      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const chunk = file.slice(start, end);

        if (session.storage_policy.type === "remote" && !session.storage_policy.relay) {
          const url = session.upload_urls?.[0];
          if (!url || !session.credential) {
            throw new Error("中转节点未返回上传地址。");
          }
          await fileApi.uploadRemoteChunk(url, session.credential, index, chunk);
        } else {
          await fileApi.uploadChunk(session.session_id, index, chunk);
        }

        options.onProgress?.(Math.min(99, Math.round(((index + 1) / totalChunks) * 100)));
      }
    }

    options.onProgress?.(100);
  } catch (error) {
    await fileApi.deleteUploadSession({ id: session.session_id, uri: targetUri }).catch(() => undefined);
    throw error;
  }

  return session;
}

export function unwrapCreditChanges(data?: ListCreditChangesResponse | null) {
  return data?.changes ?? data?.credit_changes ?? [];
}

export type RawCloudreveResponse<T> = CloudreveResponse<T>;
