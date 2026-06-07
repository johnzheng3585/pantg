# Cloudreve v4 API Support Matrix

| 功能 | API | 当前实现 |
| --- | --- | --- |
| 登录 | `POST /session/token` | 已实现，支持 `code=203` 进入 2FA |
| 2FA 登录 | `POST /session/token/2fa` | 已实现 |
| 刷新 token | `POST /session/token/refresh` | 已实现，request 自动重试 |
| 注册 | `POST /user` | 已实现 |
| 找回密码 | `POST /user/reset` | 已实现 |
| 重置密码 | `PATCH /user/reset/{user_id}` | 已实现 |
| 容量 | `GET /user/capacity` | 已实现 |
| 文件列表/搜索 | `GET /file` | 已实现 |
| 文件详情 | `GET /file/info` | 已实现 |
| 新建文件夹/文件 | `POST /file/create` | 已实现文件夹，新建文本文件可继续扩展 |
| 上传 session | `PUT /file/upload` | 已实现 |
| 中转/本地分片上传 | `POST /file/upload/{sessionId}/{index}` | 已实现 |
| 对象存储直传 | session `upload_urls` + provider callbacks | 需要补充 provider-specific 完成流程 |
| 下载 URL | `POST /file/url` | 已实现 |
| 重命名 | `POST /file/rename` | 已实现 |
| 移动/复制 | `POST /file/move` | 已实现 |
| 删除 | `DELETE /file` | 已实现 |
| 回收站恢复 | `POST /file/restore` | 已实现 |
| 缩略图 | `GET /file/thumb` | 已实现非混淆 URL，混淆解码待补 |
| 创建分享 | `PUT /share` | 已实现 |
| 我的分享 | `GET /share` | 已实现 |
| 删除分享 | `DELETE /share/{id}` | 已实现 |
| 创建离线下载 | `POST /workflow/download` | 已实现 |
| 任务列表 | `GET /workflow` | 已实现 |
| 任务进度 | `GET /workflow/progress/{id}` | 页面展示 summary，实时单任务轮询待扩展 |
| 取消任务 | `DELETE /workflow/download/{task_id}` | 已实现 |
| 偏好设置 | `GET/PATCH /user/setting` | 已实现常用字段 |
| 头像 | `PUT /user/setting/avatar` | 已实现 |
| 存储策略 | `GET /user/setting/policies` | 已实现 |
| WebDAV | `/devices/dav` | 列表/创建/删除已实现，更新待扩展 |
| 支付记录 | `GET /user/payments` | 已实现 |
| 积分变化 | `GET /user/creditChanges` | 已实现 |
| 用户组 | `GET /group/list` | 已实现 |
| 创建支付 | `PUT /vas/payment` | 已实现手动表单，商品选择依赖 VAS 配置 |
