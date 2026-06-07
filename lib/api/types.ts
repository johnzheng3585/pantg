export interface CloudreveResponse<T = unknown> {
  code: number;
  msg?: string;
  message?: string | null;
  error?: string | null;
  data?: T;
  aggregated_error?: Record<string, CloudreveResponse> | null;
  correlation_id?: string | null;
}

export interface ApiErrorPayload {
  code?: number;
  message: string;
  status?: number;
  correlationId?: string | null;
  response?: CloudreveResponse;
}

export interface Group {
  id: string;
  name: string;
  permission?: string | null;
  direct_link_batch_size?: number | null;
  trash_retention?: number | null;
  [key: string]: unknown;
}

export interface User {
  id: string;
  email?: string | null;
  nickname?: string | null;
  status?: "active" | "inactive" | "manual_banned" | "sys_banned" | string | null;
  avatar?: "file" | "gravatar" | string | null;
  created_at: string;
  credit?: number | null;
  group?: Group | null;
  pined?: Array<{ uri: string }>;
  language?: string | null;
  preferred_theme?: string | null;
  anonymous?: boolean | null;
  disable_view_sync?: boolean | string | null;
  share_links_in_profile?: "" | "all_share" | "hide_share" | string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  access_expires: string;
  refresh_expires: string;
}

export interface LoginResponse {
  user: User;
  token: TokenPair;
}

export interface CaptchaResponse {
  image: string;
  ticket: string;
}

export interface StorageCapacity {
  total: number;
  used: number;
  storage_pack_total?: number;
}

export interface PaginationResults {
  page: number;
  page_size: number;
  total_items?: number;
  next_token?: string;
  is_cursor?: boolean;
}

export interface StoragePolicy {
  id: string;
  name: string;
  type: "local" | "qiniu" | "upyun" | "oss" | "cos" | "s3" | "onedrive" | "remote" | "obs" | "load_balance" | "ks3" | string;
  max_size: number;
  relay?: boolean | null;
  allowed_suffix?: string[] | null;
  denied_suffix?: string[] | null;
  allowed_name_regexp?: string | null;
  denied_name_regexp?: string | null;
  chunk_concurrency?: number | null;
  children?: StoragePolicy[] | null;
  weight?: number | null;
}

export interface PermissionSetting {
  same_group?: string | null;
  everyone?: string | null;
  other?: string | null;
  anonymous?: string | null;
  group_explicit?: Record<string, string>;
  user_explicit?: Record<string, string>;
}

export interface DirectLink {
  id: string;
  url: string;
  downloaded: number;
  created_at: string;
}

export interface Entity {
  id: string;
  size: number;
  type: number;
  created_at: string;
  storage_policy?: StoragePolicy | null;
  encrypted_with?: string | null;
}

export interface FolderSummary {
  size: number;
  files: number;
  folders: number;
  completed: boolean;
  calculated_at: string;
}

export interface ExtendedInfo {
  storage_policy?: StoragePolicy | null;
  storage_policy_inherited: boolean;
  storage_used: number;
  shares?: Share[] | null;
  entities?: Entity[] | null;
  permissions?: PermissionSetting | null;
  direct_links?: DirectLink[] | null;
}

export interface FileResponse {
  type: 0 | 1;
  id: string;
  name: string;
  permission?: string | null;
  created_at: string;
  updated_at: string;
  size: number;
  metadata: Record<string, string> | null;
  path: string;
  shared?: boolean;
  capability?: string | null;
  owned: boolean;
  primary_entity?: string | null;
  extended_info?: ExtendedInfo | null;
  folder_summary?: FolderSummary | null;
}

export interface NavigatorProps {
  capability: string;
  max_page_size: number;
  order_by_options: string[];
  order_direction_options: Array<"asc" | "desc" | string>;
}

export interface ExplorerView {
  page_size: number;
  order?: string;
  order_direction?: "asc" | "desc";
  view?: "list" | "grid" | "gallery";
  thumbnail?: boolean;
  gallery_width?: number;
  columns?: Array<{
    type: number;
    width?: number | null;
    props?: Record<string, unknown> | null;
  }>;
}

export interface ListFilesResponse {
  files: FileResponse[] | null;
  parent: FileResponse;
  pagination: PaginationResults;
  props: NavigatorProps;
  context_hint: string;
  recursion_limit_reached?: boolean | null;
  mixed_type: boolean;
  single_file_view?: boolean | null;
  storage_policy?: StoragePolicy | null;
  view?: ExplorerView | null;
}

export interface DownloadUrlResponse {
  urls: Array<{
    url: string;
    stream_saver_display_name?: string | null;
  }>;
  expires: string;
}

export interface UploadSession {
  session_id: string;
  upload_id?: string;
  uploadID?: string;
  chunk_size: number;
  expires: number;
  upload_urls?: string[] | null;
  credential?: string | null;
  callback?: string | null;
  ak?: string | null;
  keyTime?: string | null;
  path?: string | null;
  completeURL?: string | null;
  storage_policy: StoragePolicy;
  mime_type?: string | null;
  upload_policy?: string | null;
  uri?: string;
  callback_secret?: string;
  [key: string]: unknown;
}

export interface ThumbnailResponse {
  url: string;
  obfuscated?: boolean | null;
  expires: string;
}

export interface Share {
  id: string;
  name?: string;
  visited: number;
  downloaded?: number;
  price?: number;
  unlocked: boolean;
  source_type?: 0 | 1;
  owner?: User;
  created_at?: string;
  expires?: string;
  expired?: boolean;
  url?: string;
  permission_setting?: PermissionSetting;
  is_private?: boolean | null;
  password?: string;
  source_uri?: string;
  share_view?: boolean | null;
  show_readme?: boolean | null;
  password_protected?: boolean | null;
  permissions?: string;
  size?: number;
}

export interface ListShareResponse {
  shares: Share[] | null;
  pagination: PaginationResults;
}

export interface NodeInfo {
  id: string;
  name: string;
  type?: string;
  capabilities?: string;
}

export interface RemoteDownloadFile {
  index: number;
  name: string;
  size: number;
  progress: number;
  download?: boolean;
  selected?: boolean;
}

export interface RemoteDownloadSummary {
  phase?: string;
  props?: {
    download?: {
      name?: string;
      state?: string;
      total?: number;
      downloaded?: number;
      download_speed?: number;
      uploaded?: number;
      upload_speed?: number;
      files?: RemoteDownloadFile[];
      [key: string]: unknown;
    };
    dst?: string;
    src?: string;
    src_str?: string;
    failed?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Task {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  type: string;
  node?: NodeInfo | null;
  summary?: RemoteDownloadSummary | null;
  error?: string | null;
  duration?: number;
  resume_time?: number;
}

export interface TaskListResponse {
  tasks: Task[] | null;
  pagination: PaginationResults;
}

export interface Progress {
  total?: number;
  current?: number;
  percentage?: number;
  upload_count?: number;
  upload?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Preferences {
  open_id?: unknown[];
  version_retention_enabled?: boolean;
  version_retention_max?: number;
  version_retention_ext?: string[];
  passwordless?: boolean;
  two_fa_enabled?: boolean;
  passkeys?: unknown[];
  login_activity?: unknown[];
  storage_packs?: unknown[];
  credit?: number;
  disable_view_sync?: boolean;
  share_links_in_profile?: "" | "all_share" | "hide_share" | string;
  [key: string]: unknown;
}

export interface DavAccount {
  id: string;
  created_at: string;
  name: string;
  uri: string;
  password: string;
  options?: string;
}

export interface ListDavAccountResponse {
  accounts: DavAccount[] | null;
  pagination: PaginationResults;
}

export interface Payment {
  id: string;
  trade_no: string;
  name: string;
  status: "created" | "paid" | "fulfilled" | "fulfill_failed" | "canceled" | string;
  qyt: number;
  price_unit?: number | null;
  price_id?: string | null;
  price_mark?: string | null;
  price_one_unit: number;
  created_at: string;
  updated_at: string;
  product_type: 1 | 2 | 3 | 4 | number;
  ticket?: string | null;
}

export interface ListPaymentResponse {
  payments: Payment[] | null;
  pagination: PaginationResults;
}

export interface CreditChange {
  changed_at: string;
  diff: number;
  reason: string;
}

export interface ListCreditChangesResponse {
  changes?: CreditChange[];
  credit_changes?: CreditChange[];
  pagination?: PaginationResults;
}

export interface PaymentCreateResponse {
  payment: Payment;
  request: {
    payment_needed?: boolean | null;
    url?: string | null;
    qr_code_preferred?: boolean;
  };
}

export interface GiftCodeInfo {
  name: string;
  qyt?: number;
  quantity?: number;
}

export interface PaymentProvider {
  id: string;
  type?: string;
  name: string;
}

export interface SiteVasPaymentConfig {
  currency_code?: string;
  currency_mark?: string;
  currency_unit?: number;
  providers?: PaymentProvider[] | null;
}

export interface GroupSku {
  id: string;
  name: string;
  time?: number | null;
  price?: number | null;
  points?: number | null;
  chip?: string | null;
  des?: string[] | null;
}

export interface StorageProduct {
  id: string;
  name: string;
  size?: number | null;
  time?: number | null;
  price?: number | null;
  points?: number | null;
}

export interface SiteBasicConfig {
  instance_id?: string;
  title?: string;
  user?: User;
  logo?: string;
  logo_light?: string;
  shop_nav_enabled?: boolean;
  captcha_type?: string;
  [key: string]: unknown;
}

export interface SiteLoginConfig {
  login_captcha?: boolean;
  reg_captcha?: boolean;
  forget_captcha?: boolean;
  authn?: boolean;
  register_enabled?: boolean;
  tos_url?: string;
  privacy_policy_url?: string;
  [key: string]: unknown;
}

export interface SiteVasConfig {
  point_enabled?: boolean;
  share_point_gain_rate?: number;
  point_price?: number;
  anonymous_purchase?: boolean;
  payment?: SiteVasPaymentConfig;
  products?: unknown;
  storage_products?: StorageProduct[] | null;
  group_skus?: GroupSku[] | null;
  [key: string]: unknown;
}
