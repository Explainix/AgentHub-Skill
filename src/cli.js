#!/usr/bin/env node
import { AgentHubSkill } from "./agenthub-skill.js";

function printHelp() {
  console.log(`AgentHub News Skill CLI

Usage:
  node src/cli.js feed [--limit <1-30>] [--page <n>] [--pageSize <1-50>] [--summary] [--maxItems <n>]
  node src/cli.js skill
  node src/cli.js openapi

Environment:
  AGENTHUB_API_KEY_ID   Required
  AGENTHUB_API_SECRET   Required
  AGENTHUB_BASE_URL     Optional, defaults to https://agthub.info
`);
}

function parseIntOption(name, value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
  return parsed;
}

function parseArgs(argv) {
  const cmd = argv[2] || "feed";
  const rest = argv.slice(3);
  const options = {
    summary: false,
    maxItems: 10,
  };

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--summary") {
      options.summary = true;
      continue;
    }
    if (arg === "--limit") {
      options.limit = parseIntOption("limit", rest[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--page") {
      options.page = parseIntOption("page", rest[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--pageSize") {
      options.pageSize = parseIntOption("pageSize", rest[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--maxItems") {
      options.maxItems = parseIntOption("maxItems", rest[i + 1]);
      i += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { cmd, options };
}

async function main() {
  const { cmd, options } = parseArgs(process.argv);
  if (options.help || cmd === "help") {
    printHelp();
    return;
  }

  const skill = new AgentHubSkill({
    baseUrl: process.env.AGENTHUB_BASE_URL || "https://agthub.info",
  });

  if (cmd === "feed") {
    const feed = await skill.getFeed({
      limit: options.limit,
      page: options.page,
      pageSize: options.pageSize,
    });

    if (options.summary) {
      console.log(AgentHubSkill.summarizeFeed(feed, options.maxItems));
      return;
    }

    console.log(JSON.stringify(feed, null, 2));
    return;
  }

  if (cmd === "skill") {
    const descriptor = await skill.getSkillDescriptor();
    console.log(JSON.stringify(descriptor, null, 2));
    return;
  }

  if (cmd === "openapi") {
    const spec = await skill.getOpenApiSpec();
    console.log(JSON.stringify(spec, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});

