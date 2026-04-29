# AgentHub News Skill

基于 AgentHub 开发者文档实现的资讯获取 Skill，支持：

- `GET /api/feed`：获取聚合资讯流（Hugging Face / Hacker News / Product Hunt / GitHub Trending）
- `GET /api/skill`：获取技能描述
- `GET /api/openapi`：获取 OpenAPI 规范

实现遵循官方签名规则：`x-api-key + x-api-signature + x-api-timestamp + x-api-nonce`。

## 1. 环境要求

- Node.js `>=18`
- 在 AgentHub 控制台创建 API Key（拿到 `keyId` 和 `secret`）

## 2. 配置

复制 `.env.example` 并填入你的密钥：

```bash
cp .env.example .env
```

环境变量：

- `AGENTHUB_API_KEY_ID`：你的 `keyId`
- `AGENTHUB_API_SECRET`：创建时返回的 `secret`
- `AGENTHUB_BASE_URL`：可选，默认 `https://agthub.info`

## 3. 用法

### 获取资讯流

```bash
AGENTHUB_API_KEY_ID=xxx AGENTHUB_API_SECRET=yyy node src/cli.js feed --limit 5 --page 1 --pageSize 12
```

只输出摘要：

```bash
AGENTHUB_API_KEY_ID=xxx AGENTHUB_API_SECRET=yyy node src/cli.js feed --summary --maxItems 10
```

### 获取 Skill 描述

```bash
AGENTHUB_API_KEY_ID=xxx AGENTHUB_API_SECRET=yyy node src/cli.js skill
```

### 获取 OpenAPI

```bash
AGENTHUB_API_KEY_ID=xxx AGENTHUB_API_SECRET=yyy node src/cli.js openapi
```

## 4. 在代码里调用

```js
import { AgentHubSkill } from "./src/agenthub-skill.js";

const skill = new AgentHubSkill({
  apiKeyId: process.env.AGENTHUB_API_KEY_ID,
  apiSecret: process.env.AGENTHUB_API_SECRET,
});

const feed = await skill.getFeed({ limit: 10, page: 1, pageSize: 12 });
console.log(feed.items);
```

## 5. 测试

```bash
npm test
```

