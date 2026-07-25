---
title: "Claude Code 入门教学指南"
date: "2026-03-15"
cover: "https://assets.youmind.com/craft-page-covers/cover-13.png"
draft: false
---
## 一、Claude Code 是什么？

### Claude Code 的真实身份

Claude Code（简称 CC）是 Anthropic 推出的一款 AI 编程助手，不要被「Code」这个名字误导——它不仅仅是一个写代码的工具，而是一款真正意义上的**通用 AI Agent**。

你可以用它做问答、写作、数据分析、制作网页、开发软件等各种日常办公任务。它的核心能力在于：能够理解你的意图，自主规划执行步骤，并通过调用各种工具来完成复杂任务。

### 与豆包、千问等的区别

**核心区别在于「自主性」和「执行能力」：**

_传统对话式 AI（豆包、千问、ChatGPT 网页版）：_

*   你问一句，它答一句
    
*   它只能给你建议和代码片段
    
*   你需要自己复制粘贴、执行、调试
    
*   遇到问题需要你反馈后它再修改
    

**Claude Code（AI Agent）：**

*   你说一个目标，它自己规划并执行
    
*   它可以直接创建文件、修改代码、运行命令
    
*   它能看到执行结果，自己调试和修复错误
    
*   它可以同时管理多个任务，像真正的助手一样工作
    

举个例子：

**用豆包：**

> 你：「帮我写一个爬取热门推特的 Python 脚本」
> 
> 豆包：给你一段代码
> 
> 你：复制代码，创建文件，保存，运行
> 
> 出错了
> 
> 你：把错误信息复制给豆包
> 
> 豆包：给你修改建议
> 
> 你：再次修改代码
> 
> ……

**用 Claude Code:**

> 你：「帮我写一个爬取热门推特的 Python 脚本」
> 
> Claude Code：分析需求 → 创建项目结构 → 写代码 → 安装依赖 → 测试运行 → 发现问题 → 自己修复 → 再次测试 → 完成

换句话说，只需要把目标准确地描述给 Claude Code，它就能自主解决问题。

### 为什么推荐 Claude Code？

1.  **_能力天花板最高_**
    

Claude Code 使用的 Claude 3.5 Opus 模型在代码理解、逻辑推理、任务规划方面都是目前的 T0 级别。它不仅能写代码，更重要的是能\*_理解你的真实需求_\*。

2.  **_真正的自主工作能力_**
    

配合 Skills 和 Sub-Agent 机制，Claude Code 可以：

*   同时运行多个任务
    
*   自主验证工作成果
    
*   通宵迭代优化
    
*   像团队成员一样协作
    

3.  **_强大的记忆和学习能力_**
    

通过 [CLAUDE.md](http://CLAUDE.md) 配置文件，Claude Code 可以：

*   记住你的项目架构和编码规范
    
*   学习团队的最佳实践
    
*   避免重复犯错
    
*   越用越懂你
    

4.  **_开放的生态系统_**
    

*   6 万+ 社区 Skills 可以安装使用
    
*   支持自定义 Hooks 和命令
    
*   可以通过 MCP 协议连接外部工具（Slack、数据库、API 等）
    
*   可以切换使用国产模型（GLM、Kimi 等）
    

5.  **_真正提升工作效率_**
    

通过 Claude Code 你可以从「执行者」变成「管理者」，把精力放在规划和决策上，让 AI 处理具体执行。

## 二、如何安装和使用

Claude Code 虽然强大，但对中国用户并不友好：

1.  **网络限制**：需要科学上网才能访问
    
2.  **账号问题**：Anthropic 对中国用户封号严重
    
3.  **支付限制**：官方订阅需要国际信用卡
    
4.  **成本问题**：Pro 订阅 $20/月，Max 订阅 $200/月
    

### 终极解决方案：使用国产开源模型

随着国产开源模型的突破（如 DeepSeek、GLM、Kimi 等），我们现在可以：

*   **完全免费或极低成本**使用 Claude Code
    
*   **不需要担心封号**问题
    
*   **性能接近** Claude 官方模型
    

### 完整安装步骤

#### 步骤 1：基础环境准备

1\. **Node.js**（必装）

*   访问：[https://nodejs.org/](https://nodejs.org/%3E)
    
*   下载并安装最新 LTS 版本
    
*   验证安装：打开终端输入 `node --version`
    

2.  **Git**（Windows 用户必装）
    

*   访问：[https://git-scm.com/](https://git-scm.com/%3E)
    
*   下载 Git for Windows 并安装
    
*   验证安装：终端输入 `git --version`
    

3.  **科学上网工具**（初次安装需要）
    

*   确保能访问 GitHub 和 npm 仓库
    

#### 步骤 2：安装 Claude Code

**打开终端：**

*   **Windows**：搜索「PowerShell」或「命令提示符」
    
*   **macOS**：搜索「终端」或按 `Cmd + Space` 搜索 Terminal
    

**执行安装命令：**

**方法一（推荐）：通过 npm 安装**

```markup
bash

npm install -g @anthropic-ai/claude-code

```

**方法二：通过官方脚本安装**

macOS / Linux / WSL:

```markup
bash

curl -fsSL https://claude.ai/install.sh | bash

```

Windows PowerShell:

```markup
powershell

irm https://claude.ai/install.ps1 | iex

```

**验证安装：**

```markup
bash

claude --version

```

如果显示版本号，恭喜你安装成功！

#### 步骤 3：配置国产模型（重点！）

这是中国用户的关键步骤，让你摆脱官方账号限制。

**使用 CC Switch 切换模型：**

1.  安装 CC Switch
    

```markup
bash

npm install -g cc-switch

```

2.  **获取 API Key**
    

举例：

*   **直接使用国产模型 API**
    
    *   DeepSeek: [https://platform.deepseek.com/](https://platform.deepseek.com/%3E)
        
    *   智谱 GLM：[https://open.bigmodel.cn/](https://open.bigmodel.cn/%3E)
        
    *   Moonshot Kimi: [https://platform.moonshot.cn/](https://platform.moonshot.cn/%3E)
        

3.  **配置 CC Switch**
    

```markup
bash
# 设置 OpenRouter API Key
cc-switch config set openrouter YOUR_API_KEY

# 切换到推荐模型（代码能力强）
cc-switch use deepseek/deepseek-coder

# 或
cc-switch use anthropic/claude-3.5-sonnet

```

**成本参考**_：_

*   DeepSeek Coder：约 ¥0.001/1K tokens
    
*   Kimi K2 Thinking：¥100 可以高频使用数月
    
*   GLM-4：性价比也很高
    

#### 步骤 4：启动 Claude Code

**方法一：命令行启动**

```markup
bash

claude

```

**方法二：使用启动器**

安装 Claude Code Now：

```markup
bash

npm install -g claude-code-now

```

安装后，在任意文件夹右键菜单中都能看到“Claude Code”选项，点击即可启动。

访问：[https://claudecodenow.com/](https://claudecodenow.com/%3E) 了解更多

### 基础使用入门

#### 三种工作模式

Claude Code 有三种工作模式，通过 `Shift + Tab` 切换：

**1\. 默认模式（Default Mode）**

*   提示：`? For shortcuts`
    
*   特点：每次修改文件前都会询问你
    
*   适合：学习阶段，或对代码变更需要严格把控的场景
    

**2\. 自动模式（Auto Mode）**

*   提示：`Accept edits on`
    
*   特点：自动创建和修改文件，不再反复询问
    
*   适合：快速开发，或已经信任 Claude Code 的场景
    

**3\. 规划模式（Plan Mode）**

*   特点：只讨论方案，不执行文件操作
    
*   适合：架构设计、方案讨论、复杂任务规划
    

#### 常用命令

**终端命令集成**：

```markup
bash

# 在 Claude Code 中执行任何终端命令

! ls

! open index.html

! git status

```

**斜杠命令**：

```markup
bash

/init          # 初始化项目，创建 CLAUDE.md

/memory        # 打开 CLAUDE.md 编辑

/permissions   # 管理权限设置

/help          # 查看帮助

```

**快捷键：**

*   `Shift + Tab`：切换工作模式
    
*   `Ctrl + C`：中断当前任务
    
*   `Ctrl + D`：退出 Claude Code
    

## 三、案例教学：用 Claude Code 自动生成周报

现在让我们通过一个实际案例，手把手教你如何使用 Claude Code。

### 任务背景

每周五下午，你需要写一份工作周报，包括：

*   本周完成的工作
    
*   遇到的问题和解决方案
    
*   下周计划
    
*   数据统计图表
    

### 准备工作

**创建项目文件夹：**

```markup
bash

mkdir weekly-report

cd weekly-report

```

**启动 Claude Code:**

```markup
bash

claude

```

### 第一步：初始化项目记忆

在 Claude Code 中输入：

```markup
plaintext

/init

```

Claude Code 会分析你的项目并创建 [CLAUDE.md](http://CLAUDE.md) 文件。然后输入：

```markup
plaintext

# 记住以下信息：

- 我是产品经理，每周五需要生成工作周报

- 周报格式：Markdown，包含工作总结、问题记录、下周计划、数据图表

- 数据来源：从我的工作日志文件 work-log.md 中提取

- 输出文件名：weekly-report-YYYY-MM-DD.md

```

选择「保存到 [CLAUDE.md](http://CLAUDE.md)」，这样 Claude Code 就记住了你的需求。

### 第二步：准备工作日志

创建一个简单的工作日志文件：

```markup
plaintext

创建一个 work-log.md 文件，包含我本周的工作记录：

周一：

- 完成用户调研报告，访谈了 15 位用户

- 参加产品评审会议，确定了 Q2 路线图

周二：

- 优化了注册流程，转化率提升 12%

- 修复了支付页面的 3 个 bug

周三：

- 设计了新功能原型，获得团队认可

- 分析了竞品的最新动态

周四：

- 撰写了功能需求文档

- 协调开发资源，确定了开发排期

周五：

- 数据分析：本周新增用户 1200 人，活跃用户 8500 人

- 用户反馈：收集了 50 条有效反馈

```

### 第三步：自动生成周报

切换到自动模式（按两次 `Shift + Tab`），然后输入：

```markup
plaintext

根据 work-log.md 生成本周的工作周报，要求：

1. 提取关键工作内容，分类整理

2. 总结本周的主要成果和数据

3. 列出遇到的问题和解决方案

4. 规划下周的工作重点

5. 用 Markdown 格式输出，包含合适的标题和列表

6. 如果有数据，生成简单的图表（用 Mermaid 语法）

7. 文件名为 weekly-report-2026-03-15.md

```

### Claude Code 的执行过程

你会看到 Claude Code 自动：

1.  **读取工作日志**
    

*   打开 [work-log.md](http://work-log.md)
    
*   分析内容结构
    

2.  **提取和分类信息**
    

*   识别关键工作项
    
*   统计数据指标
    
*   归纳问题和成果
    

3.  **生成周报文档**
    

*   创建 weekly-report-2026-03-15.md
    
*   按照专业格式组织内容
    
*   添加数据可视化图表
    

4.  **优化和完善**
    

*   检查格式是否规范
    
*   确保信息完整性
    
*   自动保存文件
    

### 查看结果

```markup
bash

! open weekly-report-2026-03-15.md

```

你会得到一份结构清晰、内容完整的周报，包括：

```markup
markdown

# 工作周报 | 2026年3月第2周

## 📊 本周工作概览

本周聚焦于用户体验优化和产品规划，完成了重要的用户调研和功能设计工作。

## ✅ 主要成果

### 用户研究与产品规划

- 完成 15 位用户深度访谈，形成用户调研报告

- 确定 Q2 产品路线图，获得团队共识

- 完成新功能原型设计，通过团队评审

### 产品优化

- *注册流程优化*：转化率提升 12%

- *Bug 修复*：解决支付页面 3 个关键问题

- *竞品分析*：完成主要竞品的最新动态研究

### 文档与协调

- 撰写完成功能需求文档

- 协调开发资源，确定开发排期

## 📈 数据表现

\\\`mermaid

graph LR

    A[本周新增用户] -->|1200人| B[总用户数]

    C[活跃用户] -->|8500人| B

    D[用户反馈] -->|50条| E[产品优化]

\\\`

- *新增用户*：1,200 人

- *活跃用户*：8,500 人

- *有效反馈*：50 条

## 💡 经验总结

### 成功经验

- 用户调研的深度访谈方法效果显著，获得了很多有价值的洞察

- 注册流程优化验证了数据驱动决策的重要性

### 遇到的挑战

- 跨部门协调需要更多时间，下周需要提前沟通

- 部分功能的技术实现复杂度超出预期

## 📅 下周计划

1. *产品开发*

   - 跟进新功能开发进度

   - 进行第一轮内部测试

2. *用户运营*

   - 设计用户增长活动方案

   - 优化用户反馈处理流程

3. *数据分析*

   - 深入分析用户行为数据

   - 制定下个月的 OKR

---

报告生成时间：2026-03-15

```

### 进阶：自动化周报生成

如果你想每周都这样生成周报，可以创建一个 Skill：

```markup
plaintext

帮我创建一个 Skill，名字叫 weekly-report-generator，功能是：

1. 读取 work-log.md 文件

2. 自动生成格式化的周报

3. 保存为带日期的 Markdown 文件

4. 可以通过 /weekly-report 命令调用

```

以后每周只需要：

1.  更新 [work-log.md](http://work-log.md)
    
2.  运行 `/weekly-report`
    
3.  搞定！
    

## 四、Skills、Prompt 和信源推荐

### 必装 Skills 推荐

Claude Code 的 Skills 生态已经有 6 万+ 个技能，这里推荐一些高频使用的：

#### 🎯 开发效率类

1.  _anthropics/skill-creator_
    

*   功能：帮你创建新的 Skill
    
*   用法：安装 skills: [github.com/anthropics/skill-creator](//github.com/anthropics/skill-creator%60)
    
*   场景：想自己开发 Skill 时必装
    

2.  ralph-wiggum
    

*   功能：自主迭代优化，反复执行直到完美
    
*   用法：设置循环次数 5-10 次
    
*   场景：需要 Claude Code 通宵优化代码
    

3.  obra/superpowers
    

*   功能：Plan 模式的升级版，深度讨论方案
    
*   用法：用于头脑风暴、需求分析、测试用例设计
    
*   场景：复杂项目规划
    

#### 📝 内容处理类

4.  microsoft/markitdown
    

*   功能：将各种格式转换为 Markdown
    
*   支持：PDF、PPT、图像、音频、HTML、ZIP、EPub
    
*   场景：文档格式转换
    

#### 🎨 前端开发类

5.  anthropics/frontend-design
    

*   功能：设计美观的前端界面
    
*   配合：sanjay3290/imagen（生成 UI 图标）
    
*   配合：vercel-labs/vercel-deploy-claimable（部署到 Vercel）
    
*   场景：快速开发和部署网页
    

#### 🛡️ 安全保障类

6.  app-incubator-xyz/skill-vetter
    

*   功能：多扫描器安全检查工具，扫描 Skills 的安全性
    
*   用法：在安装任何第三方 Skill 前运行安全扫描
    
*   场景：保护系统安全，防止恶意 Skills
    

#### 安装方法

在 Claude Code 中直接输入：

```markup
plaintext

安装 skills: github.com/anthropics/skill-creator

```

或访问 Skills 市场：[https://skillsmp.com](https://skillsmp.com)

### 高效 Prompt 技巧

#### 原则 1：给 Claude Code 验证能力

这是最重要的原则！让 Claude Code 能验证自己的工作，质量能提升 2-3 倍。

❌ 不好的 Prompt：

```markup
plaintext

帮我写一个网页

```

✅ 好的 Prompt:

```markup
plaintext

帮我写一个网页，要求：

1. 完成后在浏览器中打开测试

2. 检查所有链接是否正常

3. 测试响应式布局

4. 如果发现问题自己修复

5. 直到完全正常再告诉我

```

#### 原则 2：使用 Plan 模式讨论复杂任务

对于复杂任务，先用 Plan 模式讨论清楚：

```markup
plaintext

[切换到 Plan 模式]

我要做一个用户管理系统，包括：

- 用户注册和登录

- 权限管理

- 数据统计面板

请帮我规划：

1. 技术栈选择

2. 项目结构

3. 开发步骤

4. 潜在风险

讨论确定后再开始开发

```

#### 原则 3：利用 CLAUDE.md 减少重复

把常用的规范写入 CLAUDE.md ：

```markup
plaintext

/memory

# 添加以下内容到 CLAUDE.md：

## 编码规范

- 使用 Python 3.10+

- 遵循 PEP 8 规范

- 所有函数必须有类型注解

- 必须写单元测试

## 项目结构

- src/ 存放源代码

- tests/ 存放测试文件

- docs/ 存放文档

## 工作流程

- 每次修改后运行测试

- 提交前运行 lint 检查

- 重要修改要先在 Plan 模式讨论

```

#### 原则 4：多任务并行

Claude Code 可以同时处理多个任务：

```markup
plaintext

# 终端 1

claude

> 帮我优化这个 Python 脚本的性能

# 终端 2  

claude

> 帮我写这个功能的文档

# 终端 3

claude

> 帮我分析这个 bug 的原因

```

配合 `&` 符号可以在终端和网页版之间切换任务。

### 学习资源推荐

#### 官方课程（免费）

Anthropic 提供了完整的免费课程体系：

1.  **Claude 101**
    

*   基础功能和日常使用
    
*   链接：[https://anthropic.skilljar.com/claude-101](https://anthropic.skilljar.com/claude-101)
    

2.  Claude Code in Action
    

*   集成到开发工作流
    
*   链接：[https://anthropic.skilljar.com/claude-code-in-action](https://anthropic.skilljar.com/claude-code-in-action)
    

3.  AI Fluency: Framework & Foundations
    

*   如何有效地与 AI 协作
    
*   链接：[https://anthropic.skilljar.com/ai-fluency-framework-foundations](https://anthropic.skilljar.com/ai-fluency-framework-foundations)
    

4.  Building with the Claude API
    

*   API 开发完整教程
    
*   链接：[https://anthropic.skilljar.com/claude-with-the-anthropic-api](https://anthropic.skilljar.com/claude-with-the-anthropic-api)
    

5.  Introduction to Model Context Protocol
    

*   MCP 协议入门，连接外部服务
    
*   链接：[https://anthropic.skilljar.com/introduction-to-model-context-protocol](https://anthropic.skilljar.com/introduction-to-model-context-protocol)
    

#### 社区和信源

**Skills 市场：**

*   [https://skillsmp.com](https://skillsmp.com)\- 6 万+ Skills 资源库
    

**开源项目：**

*   Claude Code Now: [https://claudecodenow.com/](https://claudecodenow.com/) - 便捷启动器
    
*   CC Switch: [https://github.com/farion1231/cc-switch](https://github.com/farion1231/cc-switch) - 模型切换工具
    

**推荐关注：**

*   Boris Cherny（ @bcherny）- Claude Code 之父
    
*   宝玉（ @dotey）- AI 工具深度分享
    
*   卡尔的 AI 沃茨 - Claude Code 系列教程
    

## 写在最后

Claude Code 代表了 AI 工具的新范式：从「对话助手」到「自主代理」，从「给建议」到「真执行」。

它不是让你的工作「快一点」，而是从根本上改变你的工作方式。你从「执行者」变成「管理者」，把精力放在规划和决策上，让 AI 处理具体执行。

对于中国用户来说，随着国产开源模型的突破，现在是上手 Claude Code 的最佳时机：

*   ✅ 不用担心封号
    
*   ✅ 成本极低甚至免费
    
*   ✅ 性能已经足够强大
    
*   ✅ 生态完整且开放
    

希望这篇指南能帮你快速上手 Claude Code，开启高效的 AI 协作之旅！

* * *

## 参考资料

本文内容整理自以下优质资源：

1.  [开源模型质变：Claude Code 超级小白入门指南](https://youmind.com/materials/019cf048-7152-7d2a-b95a-1f115ca151dc) - 完整的安装和配置教程
    
2.  [Boris 的 9 条 Claude Code 实战技巧](https://youmind.com/materials/019c1bf4-66ad-79d9-bc3f-8689c6eeb211) - Claude Code 之父的实战经验分享
    
3.  [我至今用到最好的 Claude Code Skills 们](https://youmind.com/materials/019c1bf5-8e4a-71c6-90b8-c354659025de) - Skills 推荐和使用指南
    
4.  [玩转 Claude-Code（入门完整教程）](https://youmind.com/materials/019cf03b-31c3-76bc-8b6d-da5e933e7551) - 基础操作和模式切换
    
5.  [我给 Claude Code 写了一份“入职手册”](https://youmind.com/materials/019cf02f-709a-70f3-96bf-fd19df077b0f) - [CLAUDE.md](http://CLAUDE.md) 配置详解
    
6.  [手机上也能用满血 Claude Code 了](https://youmind.com/materials/019c1bf5-bb89-7885-b963-6216fd2f686a) - Happy Coder 移动端使用指南
    
7.  [你不知道的 Claude Code：架构、治理与工程实践](https://youmind.com/materials/019cf028-03e1-7ad8-9063-12850d42ffbd) - 高级配置和最佳实践
    
8.  [Anthropic 官方课程](https://anthropic.skilljar.com/) - 系统化学习资源
    

感谢以上作者的无私分享！
