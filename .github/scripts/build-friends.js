#!/usr/bin/env node
/**
 * build-friends.js — 从 Issue 生成友链数据
 *
 * 与旧版（firends-data 仓库）的差异：
 * - 不需要「审核通过」标签：所有 open 状态的友链 Issue 都会收录（无标签也可以）；
 * - 只排除带拒绝标签（默认 rejected / 拒绝）的 Issue，用于下架；
 * - 生成时保留 data/friends.ts 里已有的非 Issue 条目，避免接管时清空历史友链。
 */

import { execSync } from "node:child_process";
import fs from "node:fs";

const GH_TOKEN = process.env.GH_TOKEN;
const ISSUES_REPO = process.env.ISSUES_REPO;
const OUTPUT_FILE = process.env.OUTPUT_FILE || "data/friends.ts";
const REJECT_LABELS = (process.env.REJECT_LABELS || "rejected,拒绝")
  .split(",")
  .map((label) => label.trim())
  .filter(Boolean);

if (!GH_TOKEN || !ISSUES_REPO) {
  console.error("缺少 GH_TOKEN 或 ISSUES_REPO");
  process.exit(1);
}

function ghApi(path) {
  const result = execSync("gh api " + JSON.stringify(path) + " --paginate", {
    env: { ...process.env, GH_TOKEN },
    encoding: "utf-8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(result);
}

/** 解析 Issue 表单正文：按 '### 字段名' 分块，取块内第一个非空行 */
function parseIssueBody(body) {
  const fields = {};
  if (!body) return fields;
  for (const block of body.split(/^### /m).filter(Boolean)) {
    const lines = block.split("\n").map((line) => line.trim());
    const key = lines[0].trim();
    if (!key) continue;
    fields[key] = lines.slice(1).find((line) => line.length > 0) || "";
  }
  return fields;
}

/** 标签字段支持 '朋友们, 技术' 或空（空则 tags 为空数组） */
function parseTags(raw) {
  if (!raw) return [];
  return raw
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** 从对象块里取带引号的字符串值（避免正则模板转义） */
function pickField(block, key) {
  const idx = block.indexOf(key + ":");
  if (idx < 0) return "";
  let rest = block.slice(idx + key.length + 1).trimStart();
  if (rest[0] !== '"') return "";
  let out = "";
  for (let i = 1; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === "\\") {
      out += ch + (rest[i + 1] ?? "");
      i++;
      continue;
    }
    if (ch === '"') break;
    out += ch;
  }
  try {
    return JSON.parse('"' + out + '"');
  } catch {
    return "";
  }
}

/** 读取现有 friends.ts 里手写/历史条目，尽量不丢数据 */
function readExistingItems(file) {
  if (!fs.existsSync(file)) return [];
  const source = fs.readFileSync(file, "utf-8");
  const blocks = source.match(/\{\s*id:\s*\d+,[\s\S]*?\n\t\},?/g) ?? [];
  const items = [];
  for (const block of blocks) {
    const tagsMatch = block.match(/tags:\s*(\[[^\]]*\])/);
    let tags = [];
    if (tagsMatch) {
      try {
        tags = JSON.parse(tagsMatch[1]);
      } catch {
        tags = [];
      }
    }
    const item = {
      title: pickField(block, "title"),
      imgurl: pickField(block, "imgurl"),
      desc: pickField(block, "desc"),
      siteurl: pickField(block, "siteurl"),
      tags,
    };
    if (item.title && item.siteurl) items.push(item);
  }
  return items;
}

function generateFriendsTs(items, repo) {
  const body = items
    .map((item) =>
      [
        "\t{",
        "\t\tid: " + item.id + ",",
        "\t\ttitle: " + JSON.stringify(item.title) + ",",
        "\t\timgurl: " + JSON.stringify(item.imgurl) + ",",
        "\t\tdesc: " + JSON.stringify(item.desc) + ",",
        "\t\tsiteurl: " + JSON.stringify(item.siteurl) + ",",
        "\t\ttags: " + JSON.stringify(item.tags) + ",",
        "\t},",
      ].join("\n"),
    )
    .join("\n");

  return [
    "// 友情链接数据配置",
    "// ⚠️ 此文件由 GitHub Actions 自动生成，请勿手动修改",
    "// 数据来源：https://github.com/" + repo + "/issues",
    "// 提交友链：新建 Issue（无需标签），合并进本文件后自动部署",
    "",
    "export interface FriendItem {",
    "\tid: number;",
    "\ttitle: string;",
    "\timgurl: string;",
    "\tdesc: string;",
    "\tsiteurl: string;",
    "\ttags: string[];",
    "}",
    "",
    "// 友情链接数据",
    "export const friendsData: FriendItem[] = [",
    body,
    "];",
    "",
    "// 获取所有友情链接数据",
    "export function getFriendsList(): FriendItem[] {",
    "\treturn friendsData;",
    "}",
    "",
    "// 获取随机排序的友情链接数据",
    "export function getShuffledFriendsList(): FriendItem[] {",
    "\tconst shuffled = [...friendsData];",
    "\tfor (let i = shuffled.length - 1; i > 0; i--) {",
    "\t\tconst j = Math.floor(Math.random() * (i + 1));",
    "\t\t[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];",
    "\t}",
    "\treturn shuffled;",
    "}",
    "",
  ].join("\n");
}

function main() {
  console.log("扫描仓库：" + ISSUES_REPO);
  const existing = readExistingItems(OUTPUT_FILE);
  console.log("已存在条目：" + existing.length);

  const issues = ghApi(
    "/repos/" + ISSUES_REPO + "/issues?state=open&per_page=100",
  ).filter((issue) => !issue.pull_request);
  console.log("open Issue：" + issues.length);

  const seen = new Set();
  const fromIssues = [];

  for (const issue of issues) {
    const labels = (issue.labels ?? []).map((label) =>
      typeof label === "string" ? label : label.name,
    );
    if (labels.some((name) => REJECT_LABELS.includes(name))) {
      console.log("#" + issue.number + " 命中拒绝标签，跳过");
      continue;
    }

    const fields = parseIssueBody(issue.body);
    const title = fields["站点名称"];
    const siteurl = fields["站点链接"];
    const imgurl = fields["头像链接"];
    const desc = fields["站点描述"];

    if (!title || !siteurl) {
      console.log("#" + issue.number + " 缺少必填字段，跳过");
      continue;
    }

    const key = siteurl.replace(/\/+$/, "").toLowerCase();
    if (seen.has(key)) {
      console.log("#" + issue.number + " 与已有条目重复，跳过");
      continue;
    }
    seen.add(key);

    fromIssues.push({
      title,
      imgurl,
      desc,
      siteurl,
      tags: parseTags(fields["标签"] || fields["标签（可选）"]),
    });
  }

  // 保留历史条目（按 siteurl 去重，Issue 优先）
  const kept = existing.filter((item) => {
    const key = item.siteurl.replace(/\/+$/, "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const merged = [...kept, ...fromIssues].map((item, index) => ({
    ...item,
    id: index + 1,
  }));

  fs.writeFileSync(OUTPUT_FILE, generateFriendsTs(merged, ISSUES_REPO), "utf-8");
  console.log("写入 " + OUTPUT_FILE + "：共 " + merged.length + " 条（Issue " + fromIssues.length + "，历史 " + kept.length + "）");
}

main();
