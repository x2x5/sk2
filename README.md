# Skill Shelf

一个很轻的个人 Skill / Prompt 网页仓库：**Markdown 是唯一内容源**，GitHub Actions 自动生成并发布卡片网页。

## 你平时怎么用

只需要编辑 `skills/` 里的 `.md` 文件。可以直接在 GitHub 网页点文件 → 铅笔图标 → 修改 → Commit changes，不需要 clone。

每个 Skill 长这样：

```md
---
title: Skill 名字
category: 论文 / 学术
description: 卡片上的一句简介
tags: 论文, 审稿, ICLR
---
这里开始就是要被一键复制的原始内容。
可以很长，也可以包含 Markdown。
```

新增 Skill：复制一个 `.md` 文件，改文件名和内容即可。网页的分类、卡片、搜索索引都会自动更新。

## 第一次上传到 GitHub

1. 在 GitHub 新建一个仓库（GitHub Free 下想免费用 Pages，最省事的是建 **Public** repo）。
2. 把这个项目里的**所有文件和文件夹**上传到仓库根目录，包括隐藏目录 `.github/`。
3. 打开仓库 **Settings → Pages**。
4. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
5. 回到 **Actions**，你会看到 `Deploy Skill Shelf to GitHub Pages`。首次上传到 `main` 会自动运行；也可以点 `Run workflow` 手动运行。
6. 部署成功后，Pages 页面和 Actions 的 deploy job 都会显示站点地址。

以后每次在 GitHub 网页修改 `skills/*.md` 并 Commit，都会自动重新发布。

## 本地预览（可选）

如果哪天你想在电脑上看：

```bash
python3 build.py
python3 -m http.server 8000 -d dist
```

然后打开 `http://localhost:8000`。

## 目录结构

```text
.
├── .github/workflows/pages.yml   # 自动发布，不用日常修改
├── skills/                       # 你平时只需要碰这里
│   ├── 01-top-review.md
│   ├── 02-thread-answer.md
│   └── ...
├── static/                       # 网页模板，一般不用改
├── config.json                   # 网站名字、分类顺序
├── build.py                      # 把 Markdown 变成网页数据
└── README.md
```

## 已有功能

- 按 Markdown front matter 自动分类
- 卡片布局
- 全文搜索（标题 / 标签 / 内容）
- 卡片直接一键复制原始 Skill
- 点击查看完整内容，再复制
- 每个 Skill 有可复制的直达链接
- 内容自动换行，不横向滚动一整条长 Prompt
- 深色模式
- 手机适配
- 无 npm、无框架、无第三方前端依赖

## 修改分类

编辑 `config.json` 的 `categoryOrder`。Skill 里的 `category` 如果不在列表里也不会丢失，会自动显示在后面。
