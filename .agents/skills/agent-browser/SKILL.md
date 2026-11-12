---
name: agent-browser
description: "브라우저 자동 조작. 웹 화면을 열어 누르기·입력·스크린샷·데이터 뽑기·화면 시험을 할 때 쓴다. agent-browser CLI(설치 필요)를 쓰며, 클라우드 세션에서 이미 설치된 Playwright로 되는 일은 Playwright를 먼저 쓴다."
allowed-tools: Bash(agent-browser:*)
hidden: true
metadata:
  minoffia-category: 시험·점검
  minoffia-default: "true"
---

# 브라우저 자동 조작

> **minoffia 메모:** MINOVA 저장소에서 쓰던 스킬을 스킬 모음에 연결함(LICENSE 동봉, 원문 그대로). 설명·이 요약만 한국어로 붙였다.

## 지시서용 요약

- 클라우드 세션에는 Playwright가 이미 있다. 화면 확인·스크린샷은 Playwright로 먼저 하고, 꼭 필요할 때만 agent-browser를 설치해 쓴다.
- 설치는 그 세션 안에서만(전역 설치가 남지 않는 일회성 컨테이너). 비밀번호·토큰이 필요한 사이트에는 쓰지 않는다.
- 결과(스크린샷·확인 내용)는 결과 요약과 test_log에 적는다.

---

## 원문(영어)

# agent-browser

Fast browser automation CLI for AI agents. Chrome/Chromium via CDP with accessibility-tree snapshots and compact `@eN` element refs.

Install: `npm i -g agent-browser && agent-browser install`

## Start here

This file is a discovery stub, not the usage guide. Before running any `agent-browser` command, load the actual workflow content from the CLI:

```bash
agent-browser skills get core             # start here: the loop, waits, common tasks, troubleshooting
```

The core guide ends with a table of references to load for detailed commands and flags. Use `agent-browser skills get core --full` only when you need every reference at once; it is several times larger.

The CLI serves skill content that matches the installed version. This stub cannot change between releases, which is why it only points at `skills get core`.

## Specialized skills

Load a specialized skill when the task falls outside browser web pages:

```bash
agent-browser skills get electron          # Electron desktop apps (VS Code, Slack, Discord, Figma, ...)
agent-browser skills get slack             # Slack workspace automation
agent-browser skills get dogfood           # Exploratory testing / QA / bug hunts
agent-browser skills get derive-client     # Record a HAR, derive a standalone API client for a site
agent-browser skills get webmcp-gen        # Build and validate WebMCP tools for a page
agent-browser skills get vercel-sandbox    # agent-browser inside Vercel Sandbox microVMs
agent-browser skills get protected-vercel-deployments  # Access protected Vercel deployments
agent-browser skills get agentcore         # AWS Bedrock AgentCore cloud browsers
```

Run `agent-browser skills list` to see everything available on the installed version.

## Why agent-browser

- Fast native Rust CLI, not a Node.js wrapper
- Works with any AI agent (Cursor, Claude Code, Codex, Continue, Windsurf, etc.)
- Chrome/Chromium via CDP with no Playwright or Puppeteer dependency
- Accessibility-tree snapshots with element refs for reliable interaction
- Sessions, authentication vault, state persistence, video recording
- Specialized skills for Electron apps, Slack, exploratory testing, cloud providers
