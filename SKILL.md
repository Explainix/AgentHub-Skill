# AgentHub 资讯 Skill

用于通过 AgentHub 开放接口获取聚合资讯流。

## 能力

- 获取资讯：`GET /api/feed`
- 获取技能描述：`GET /api/skill`
- 获取 OpenAPI：`GET /api/openapi`

## 前置条件

- 需要环境变量：
  - `AGENTHUB_API_KEY_ID`
  - `AGENTHUB_API_SECRET`
- 可选：
  - `AGENTHUB_BASE_URL`（默认 `https://agthub.info`）

## 使用方式

```bash
node src/cli.js feed --limit 5 --page 1 --pageSize 12
```

输出摘要：

```bash
node src/cli.js feed --summary --maxItems 10
```

## 说明

- 按官方签名规则生成请求头：
  - `x-api-key`
  - `x-api-signature`
  - `x-api-timestamp`
  - `x-api-nonce`
- 签名串格式：
  - `${timestamp}.${nonce}.${method}.${pathWithQuery}.${bodySha256}`

