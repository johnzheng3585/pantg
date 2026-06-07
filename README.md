# Cloudreve v4 Drive Frontend

基于 Cloudreve v4 API 的现代化网盘用户前端，使用 Next.js / React / TypeScript / Tailwind CSS / shadcn/ui / lucide-react。

## 运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` 中配置 Cloudreve 后端：

```ini
CLOUDREVE_API_BASE=http://localhost:5212/api/v4
NEXT_PUBLIC_CLOUDREVE_API_BASE=/api/cloudreve
```

前端默认请求 `/api/cloudreve/*`，由 Next.js API route 代理到 Cloudreve `/api/v4/*`，避免浏览器 CORS 问题。

## 目录结构

```text
app/
  (auth)/                 登录、注册、找回密码、重置密码
  (drive)/                登录后的网盘应用页面
  api/cloudreve/[...path] Cloudreve v4 代理
components/
  auth/                   认证表单
  file-manager/           文件列表、网格、操作弹窗、上传
  ui/                     shadcn/ui 基础组件
contexts/                 AuthProvider / AuthGate
hooks/                    toast、异步请求 hooks
lib/
  api/                    request、token-store、services、types
  file-uri.ts             Cloudreve file URI 工具
```

## 已接入 API

- 认证：密码登录、2FA 完成登录、刷新 token、退出、注册、找回/重置密码、CAPTCHA。
- 仪表盘：用户信息、容量、最近文件、分享摘要、任务摘要。
- 文件管理：列表、搜索 URI、面包屑、新建文件夹、分片上传、下载 URL、重命名、移动/复制、删除、回收站恢复、缩略图 URL、详情。
- 分享管理：创建分享、查看我的分享、删除分享。
- 工作流：创建远程下载、任务列表、进度摘要、取消远程下载任务。
- 用户设置：偏好设置、头像上传、可用存储策略、WebDAV 账号列表/创建/删除。
- VAS：支付记录、积分变化、用户组列表、站点 VAS 配置、创建支付。

## 需要后端/后续补充

- 对象存储直传完成流程：S3/COS/OSS/OBS/OneDrive/Qiniu 等 provider-specific 分片上传和 complete callback 已在上传 session 中暴露，但当前前端只实现 local/remote/upyun/relay 分片上传。
- 缩略图混淆 URL 解码：文档给出 time-flow decode 算法，当前前端对 `obfuscated: true` 回退到文件图标。
- 支付商品 SKU UI：Cloudreve 站点 VAS 配置结构随实例变化，当前页面展示原始配置并提供手动创建支付表单。
- 更细粒度权限：boolset 的能力/权限位已保留字段，当前 UI 未完全解码每一位。
- Passkey/OpenID/OAuth：API 已存在，但本需求核心页面未展开完整登录器和账号绑定流程。
