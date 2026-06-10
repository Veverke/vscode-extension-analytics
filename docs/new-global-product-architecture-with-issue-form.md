# VS Code Extension Analytics Platform — Architecture & Design

## 🎯 Purpose

This project provides a **zero-cost, serverless analytics platform** for VS Code extensions, evolving from a personal tool into a public, community-driven system.

---

# 🔄 Evolution: From Personal Tool → Public Platform

## 🧩 Original System (Personal Use)

### Characteristics
- Fixed list of extensions
- Manual configuration
- Single-user focus
- No onboarding flow

### Architecture
```
Static extensions list
    ↓
GitHub Actions collect data
    ↓
JSON files
    ↓
Personal dashboard
```

### Limitations
- Not scalable
- No discoverability
- No reuse by others

---

## 🚀 New Goal

Transform into a **public analytics platform** serving all VS Code extension developers.

---

# ⚙️ Key Changes (Delta)

## ✅ 1. Input Model

Before: static extension list  
After: GitHub username → auto discovery

---

## ✅ 2. Extension Discovery

New capability:
- fetch repos
- parse package.json
- detect VS Code extensions

---

## ✅ 3. Shared Dataset

Before: private data  
After: global dataset reused for all users

---

## ✅ 4. Growth Mechanism

Before: manual updates  
After: issue-based onboarding (`tracking-request` label)

---

## ✅ 5. Registry Layer

```
registry/extensions.json
```

---

## ✅ 6. UX Transformation

Before: single extension tracking  
After: multi-extension dashboard (default)

---

## ✅ 7. Stateless Frontend

```
input → discover → match → display
```

---

## ✅ 8. GitHub as Backend

- Actions → compute
- Repo → storage
- Issues → input queue

---

# 🧾 Issue-Based Extension Registration

## 🎯 Purpose

Provide a **structured, low-friction mechanism** for users to request tracking of new extensions without requiring backend infrastructure.

---

## ✅ Mechanism

The system uses:

- GitHub **Issue Forms**
- Label: `tracking-request`

---

## 🧩 Why Issue Forms

- Enforces structured input
- Separates tracking requests from bugs/features
- Easily consumable by automation
- No authentication or backend required

---

## 🏗️ Implementation

### 📁 Location

```
.github/ISSUE_TEMPLATE/add-extension.yml
```

---

### ✅ Example Issue Form

```yaml
name: Add Extension for Tracking
description: Request a VS Code extension to be tracked
title: "Add extension: <publisher.extension>"
labels: ["tracking-request"]

body:
  - type: input
    id: extensionId
    attributes:
      label: Extension ID
      description: Format publisher.extensionName
      placeholder: veverke.chatwizard
    validations:
      required: true

  - type: input
    id: repo
    attributes:
      label: GitHub Repository (optional)
      placeholder: https://github.com/owner/repo

  - type: textarea
    id: notes
    attributes:
      label: Additional Notes
```

---

## 🔄 Processing Flow

1. User triggers tracking (UI button)
2. Issue is created with label `tracking-request`
3. GitHub Action fetches issues
4. Parses and extracts extension IDs
5. Validates format
6. Updates registry/extensions.json
7. Marks issue processed

---

## ✅ Multi-Extension Support

Example Issue Body:

```
- ext.one
- ext.two
- ext.three
```

Parser extracts all IDs.

---

## ⚠️ Considerations

- Ensure idempotency (no duplicates)
- Validate format (`publisher.name`)
- Separate labels from bugs/features

---

# 🏗️ Final Architecture

```
User → GitHub username
     ↓
Frontend fetches repos
     ↓
Detect extensions
     ↓
Match dataset
     ↓
Render dashboard
     ↓
Missing → create Issue
     ↓
GitHub Actions update registry
     ↓
Next run collects data
```

---

# 🚀 Core Use Case (Default)

Input: GitHub username  
Output: full dashboard of extensions

---

# 🔄 Use Case Workflows

## ✅ Full Dashboard
User inputs username → detect all extensions → display analytics.

---

## ✅ Partial Coverage
Tracked extensions → analytics  
Untracked → "Track"

---

## ✅ Request Tracking
User clicks → Issue created

---

## ✅ Automation
Actions parse issues → update registry

---

## ✅ Data Collection
Next run includes new extensions

---

## ✅ Return Flow
User revisits → data available

---

# 📊 Before vs After

| Aspect | Before | After |
|------|--------|------|
| Audience | Single | Global |
| Input | Static | GitHub username |
| Growth | Manual | Issue-driven |
| UX | Single | Multi |

---

# 🧠 Key Insight

> A shift from private tool → shared dataset + dynamic discovery platform.

---

# 🚀 Final Definition

> Serverless analytics platform for VS Code extensions powered by GitHub Actions.
