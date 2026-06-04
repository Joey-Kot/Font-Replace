# Font Replace

全局网页字体替换用户脚本，提供两个版本：

- `font_replace_local.js`：优先使用本地已安装字体，不依赖在线字体服务。
- `font_replace_web.js`：按需从 Google Fonts 拉取字体 `@font-face` 规则后再替换。

两个脚本都在页面早期执行（`@run-at document-start`），并且对动态内容（SPA、懒加载）持续生效。

## 设计思路

这个项目的目标不是“给页面统一写一个 `font-family`”，而是做一层更稳健的“字体映射”：

1. 扫描页面里真正可见的文本节点，收集当前页面实际在用的字体族。
2. 对字体族分类：`regular`、`mono`（代码/等宽）、`math`、`emoji`、`symbol`、`generic`。
3. 为需要替换的字体族动态生成同名字的 `@font-face` 规则（别名映射），让浏览器在不改站点 CSS 的情况下切换字体来源。
4. 可选地移除原始样式表中同名 `@font-face`，降低冲突概率。
5. 通过 `MutationObserver + debounce` 监听 DOM 变化，内容更新后自动重算并增量更新样式。

### 为什么这样做

- 兼容性更好：很多站点字体声明复杂，直接覆盖 `font-family` 容易破版或漏掉局部字体。
- 粒度更细：代码字体、数学字体、Emoji 可以单独开关，不会一刀切。
- 性能可控：基于签名判断，字体使用集合没有变化就跳过重复更新。

## 版本区别

### `font_replace_local.js`

- 使用 `local('...')` 作为字体来源。
- 适合本机字体已完整安装、希望离线可用、或网络环境限制较多的场景。

### `font_replace_web.js`

- 从 Google Fonts 样式表提取目标字体的 `@font-face` 后再重命名映射到页面字体族。
- 字体包按需加载（regular/mono/math/emoji 分开），首次访问相关页面可能有一次加载过程。

## 安装方式

支持 Tampermonkey、Violentmonkey、ScriptCat 等类油猴脚本管理器。

1. 安装任意用户脚本扩展：
   - Chrome/Edge：Tampermonkey 或 Violentmonkey
   - Firefox：Tampermonkey 或 Violentmonkey
2. 在扩展中新建脚本。
3. 从项目中选择一个版本并复制完整内容：
   - `font_replace_local.js` 或
   - `font_replace_web.js`
4. 覆盖默认模板后保存。
5. 刷新任意网页验证效果。

## 使用方式

安装并启用后，无需额外操作，脚本会自动对匹配页面生效（`*://*/*`）。

### `font_replace_web.js` 字体缓存预热（可选）

如果你使用的是 `font_replace_web.js`，可以通过访问一次 all-unicode.txt 进行字体分片预热：

1. 保持 `font_replace_web.js` 已启用。
2. 在浏览器里直接打开 `all-unicode.txt`（本地文件、仓库页面或自己的静态托管地址都可以）。
3. 等页面稳定加载完成后关闭即可。

原理：`all-unicode.txt` 包含非常广的 Unicode 字符集合，会触发在线字体的大部分（甚至接近全部）分片下载。
效果：后续正常浏览时可更大概率直接命中浏览器磁盘缓存，减少首次字体加载等待。

默认配置说明（两份脚本一致）：

- `ENABLE_MONO_REPLACEMENT = true`：替换代码/等宽字体。
- `ENABLE_MATH_REPLACEMENT = false`：默认不替换数学字体。
- `ENABLE_EMOJI_REPLACEMENT = true`：替换 Emoji 字体。
- `REMOVE_ORIGINAL_FONT_FACE = true`：尝试删除原始同名字体声明。
- `ENABLE_DEBUG_LOG = false`：关闭调试日志。

### 常见自定义

1. 修改目标字体

- 在 `font_replace_local.js` 中改本地字体链：
  - `FALLBACK_LOCALS`
  - `MONO_LOCALS`
  - `MATH_LOCALS`
  - `EMOJI_LOCALS`
- 在 `font_replace_web.js` 中改在线字体来源：
  - `REGULAR_FONT_STYLESHEET_URL`
  - `MONO_FONT_STYLESHEET_URL`
  - `MATH_FONT_STYLESHEET_URL`
  - `EMOJI_FONT_STYLESHEET_URL`
  - 同步调整 `FONT_PACKS` 里的 `sourceFamilies`

2. 调整排除策略

- `EXCLUDE_FONTS`：排除不希望被替换的字体族。
- `GENERIC_SKIP`：控制是否跳过 `serif` / `sans-serif` / `monospace` 等泛型家族。

3. 站点级启停

- 通过脚本头部 `@match` / `@exclude` 控制作用范围。
- 当前默认排除了 `*://developers.openai.com/*`。

## 调试与排错

1. 打开调试日志
将 `ENABLE_DEBUG_LOG` 改为 `true`，在浏览器开发者工具 Console 查看 `[font-override]` 日志。

2. 页面无变化
- 先确认脚本已启用且命中 `@match`。
- 若使用 `web` 版，确认网络可访问 Google Fonts。
- 若使用 `local` 版，确认本机安装了配置中的字体。

3. 个别图标变方块
图标字体被误替换时，可把对应字体名加入 `EXCLUDE_FONTS`。

## License

本项目基于 GNU General Public License v3.0 or later（GPL-3.0-or-later）发布，详见 `LICENSE`。
