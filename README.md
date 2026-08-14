# Skill Shelf

一个很轻的个人技能网页仓库。

**日常只维护一个文件：`skills.md`。**

GitHub Actions 会读取这个 Markdown 文件，把每个 Prompt 自动变成网页卡片，然后发布到 GitHub Pages。

## 如何新增技能

打开 GitHub 网页里的 `skills.md`，滚到底部 append：

````md
### 新技能名字

```markdown
粘贴完整提示词。
```
````

Commit changes 后，Actions 自动重新生成网站。

### 分类是可选的

如果你想让卡片进入某个分类，在它前面加一个 `##`：

````md
## 论文 / 学术

### 新的论文 Skill

```markdown
提示词……
```
````

解析规则很简单：

- `### 标题` = 一个 Skill / Prompt 的名字
- 标题后面的**第一个 fenced code block** = 点击“复制”时复制的完整内容
- 最近的 `## 标题` = 分类
- `skills.md` 里的其他正文、说明、表格不会被当成 Skill

所以你完全可以一直在同一个文件里往下追加。


## 目录结构

```text
.
├── skills.md                     # ★ 你平时只编辑这个
├── .github/workflows/pages.yml  # 自动构建 + 发布
├── static/                       # 网页界面，一般不用碰
├── config.json                  # 网站标题、分类顺序
├── build.py                     # 解析 skills.md
└── README.md
```

## 本地预览（可选）

```bash
python3 build.py
python3 -m http.server 8000 -d dist
```

然后访问 `http://localhost:8000`。
