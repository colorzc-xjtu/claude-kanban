# Claude Task Kanban - 项目指令

## 项目概述

这是一个纯前端看板应用，部署在 GitHub Pages，用于追踪 Claude Cowork/Code/Chat 的任务进度。数据存储在 Google Drive JSON 文件中，通过 Google Apps Script Web App 读写。

- 看板地址：https://colorzc-xjtu.github.io/claude-kanban/
- 仓库：https://github.com/colorzc-xjtu/claude-kanban

## 任务看板同步

当你开始、更新或完成一个任务时，必须通过 API 同步到看板。

### API 配置

```
API_URL=https://script.google.com/macros/s/AKfycbwzpb9j9eLpURPsNpIeuCFRcY048FJQWn15fNku6wfbvgJIVkkBrtLyNWYBBKqI0CgUnA/exec
WRITE_KEY=ck-2026-kanban-xK9mP3
```

### 读取当前任务

```bash
curl -sL "${API_URL}?type=tasks"
```

### 更新任务（先读后写）

操作流程：
1. GET 读取当前所有任务
2. 修改/添加/删除你负责的任务（不要动其他 Claude 实例的任务）
3. POST 写回完整数据

```bash
# 1. 读取
TASKS=$(curl -sL "${API_URL}?type=tasks")

# 2. 用 jq 或脚本修改 TASKS 中你的任务

# 3. 写回
curl -sL -X POST "$API_URL" \
  -H "Content-Type: text/plain" \
  -d '{"key":"ck-2026-kanban-xK9mP3","type":"tasks","data": ... }'
```

### 任务数据格式

```json
{
  "id": "task-xxx",
  "title": "任务标题",
  "category": "claude-code",
  "status": "in-progress",
  "progress": 65,
  "priority": "high",
  "description": "详细描述",
  "tags": ["backend", "security"],
  "assignee": "Claude Code",
  "notes": "当前备注",
  "createdAt": "2026-02-19T10:00:00Z",
  "updatedAt": "2026-02-19T12:00:00Z",
  "completedAt": null,
  "needsUserAction": true,
  "userActionNote": "需要用户审批 API key"
}
```

字段说明：
- **category**: `"claude-cowork"` | `"claude-code"` | `"claude-chat"` — 根据你的角色选择
- **status**: `"in-progress"` | `"pending"` | `"completed"`
- **progress**: 0-100 的整数
- **priority**: `"critical"` | `"high"` | `"medium"` | `"low"`
- **needsUserAction**: 当需要用户介入时设为 `true`，并在 `userActionNote` 中说明需要用户做什么
- **completedAt**: 任务完成时设为 ISO 8601 时间字符串，日历视图用此字段匹配日期

### 写日志（可选）

日历视图还支持每日备注，通过 `type=logs` 读写：

```bash
# 读取日志
curl -sL "${API_URL}?type=logs"

# 写入日志
curl -sL -X POST "$API_URL" \
  -H "Content-Type: text/plain" \
  -d '{"key":"ck-2026-kanban-xK9mP3","type":"logs","data":{"meta":{"version":"1.0"},"logs":[{"date":"2026-02-19","note":"今日完成了认证模块"}]}}'
```

### 注意事项

- 每次更新前必须先读取最新数据，避免覆盖其他 Claude 实例的修改
- 只修改属于你自己 category 的任务（Claude Code → `claude-code`）
- 新任务的 id 使用 `task-` 前缀加时间戳或序号，确保唯一
- 更新完成后 `meta.lastUpdated` 会被服务端自动设置
