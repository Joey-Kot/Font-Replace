// ==UserScript==
// @name         Font Replace Web
// @description  Immersive global font replacement
// @copyright    2026 Joey Kot <joey.kot.x@gmail.com>
// @license      GPL-3.0-or-later
// @version      2026-08-13
// @match        *://*/*
// @exclude      *://developers.openai.com/*
// @exclude      *://cloudflare.com/*
// @exclude      *://*.cloudflare.com/*
// @run-at       document-start
// @grant        none
// @icon         data:image/svg+xml;charset=utf-8;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjU2IDI1NiI+CiAgPHRleHQKICAgIHg9IjEyOCIKICAgIHk9IjEyOCIKICAgIHRleHQtYW5jaG9yPSJtaWRkbGUiCiAgICBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIKICAgIGZvbnQtc2l6ZT0iMjAwIgogICAgZm9udC1mYW1pbHk9IkFyaWFsLCBIZWx2ZXRpY2EsIHNhbnMtc2VyaWYiCiAgICBmb250LXdlaWdodD0iNDAwIgogICAgZmlsbD0iIzAwMDAwMCI+UzwvdGV4dD4KPC9zdmc+
// ==/UserScript==

// Copyright (C) 2026 Joey Kot <joey.kot.x@gmail.com>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed WITHOUT ANY WARRANTY; without even the
// implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See <https://www.gnu.org/licenses/> for more details.

(function () {
  const hostname = location.hostname.toLowerCase();
  if (hostname === "cloudflare.com" || hostname.endsWith(".cloudflare.com")) {
    return;
  }

  const STYLE_ID = "customFont";

  // Runtime stylesheets used to load the latest online font rules.
  const REGULAR_FONT_STYLESHEET_URL = "https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&family=Noto+Sans+SC:wght@100..900&family=Noto+Sans+JP:wght@100..900&family=Noto+Sans+KR:wght@100..900&display=swap";
  const MONO_FONT_STYLESHEET_URL = "https://fonts.googleapis.com/css2?family=Noto+Sans+Mono:wght@100..900&display=swap";
  const MATH_FONT_STYLESHEET_URL = "https://fonts.googleapis.com/css2?family=Noto+Sans+Math&display=swap";
  const EMOJI_FONT_STYLESHEET_URL = "https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap";

  // Feature toggles for the replacement pipeline below.
  // Set to false to stop forcing mono/code glyph replacement.
  const ENABLE_MONO_REPLACEMENT = true;

  // Set to false to stop forcing math glyph replacement.
  const ENABLE_MATH_REPLACEMENT = false;

  // Set to false to stop forcing emoji glyph replacement.
  const ENABLE_EMOJI_REPLACEMENT = true;

  // Set to false to keep original @font-face rules from other stylesheets.
  const REMOVE_ORIGINAL_FONT_FACE = true;

  // Set to true to print aggregated debug logs to the browser console.
  const ENABLE_DEBUG_LOG = false;

  // Manual fallback exclusion list for specific font families.
  // Commented entries are optional candidates that only apply after uncommenting.
  const EXCLUDE_FONTS = new Set([
    "lastresort",
    "adobe blank",
    // Common math fonts kept commented for manual opt-in.
    // "KaTeX_AMS",
    // "KaTeX_Caligraphic",
    // "KaTeX_Fraktur",
    // "KaTeX_Main",
    // "KaTeX_Math",
    // "KaTeX_SansSerif",
    // "KaTeX_Script",
    // "KaTeX_Size1",
    // "KaTeX_Size2",
    // "KaTeX_Size3",
    // "KaTeX_Size4",
    // "KaTeX_Typewriter",
    // "Cambria Math",
    // "Latin Modern Math",
    // "STIX Math",
    // "STIX Two Math",
    // "XITS Math",
    // "Libertinus Math",
    // "Asana Math",
    // "TeX Gyre Termes Math",
    // "TeX Gyre Pagella Math",
  ].map(s => s.toLowerCase()));

  // Generic/semantic family names to skip treating as concrete replacement targets.
  // Commented entries can be enabled later if you want to skip those generic families.
  const GENERIC_SKIP = new Set([
    // "serif",
    // "sans-serif",
    // "system-ui",
    // "ui-sans-serif",
    // "ui-serif",
    // "monospace",
    // "ui-monospace",
    // "emoji",
    // "math",
    // "fangsong",
  ]);

  // Text under these tags is ignored during visible font usage collection.
  const SKIP_PARENT_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"
  ]);

  // Common mono/code font family names for accurate detection.
  // Stored in normalized form (lowercase, no spaces/hyphens/underscores).
  const MONO_FONT_NAMES = new Set([
    "Consolas", "Lucida Console", "Courier New", "Menlo", "Monaco",
    "SF Mono", "Ubuntu Mono", "DejaVu Sans Mono", "DejaVu Serif Mono",
    "Liberation Mono", "Noto Sans Mono", "Noto Mono", "Cascadia Code",
    "Cascadia Mono", "Fira Code", "Fira Mono", "JetBrains Mono",
    "Source Code Pro", "IBM Plex Mono", "Inconsolata", "Hack",
    "Anonymous Pro", "Operator Mono", "Roboto Mono", "PT Mono",
    "Space Mono", "Victor Mono", "Iosevka", "Monaspace", "Recursive Mono",
    "PragmataPro", "Dank Mono", "Input Mono", "Commit Mono", "Geist Mono",
    "Maple Mono", "Cozette", "Tamsyn", "Terminus", "Terminess",
    "ProggyClean", "ProggyTiny", "Courier", "Courier Prime",
    "Prestige Elite", "Letter Gothic", "Andale Mono", "OCR A Std", "OCR B",
    "American Typewriter", "Fixedsys", "GNU Unifont", "Fantasque Sans Mono",
    "Sarasa Mono", "LXGW WenKai Mono", "Noto Sans Mono CJK",
    "WenQuanYi Zen Hei Mono", "Migu 1M", "BIZ UDゴシック", "MS Gothic",
    "MS PGothic", "SimSun-ExtB", "Source Han Mono", "Sarasa Gothic Mono",
    "Monoid", "M Plus 1 Code", "Lilex", "Aptos Mono", "B612 Mono",
    "Overpass Mono"
  ].map(s => normalizeForMatch(s)));

  // Common emoji font family names for accurate detection.
  // Stored in normalized form (lowercase, no spaces/hyphens/underscores).
  const EMOJI_FONT_NAMES = new Set([
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol",
    "Segoe UI Historic", "Noto Color Emoji", "Noto Emoji",
    "Twemoji", "Twemoji Mozilla", "Twitter Color Emoji",
    "EmojiOne Color", "EmojiOne Mozilla", "JoyPixels",
    "Samsung Color Emoji", "Android Emoji", "OpenMoji", "OpenMoji Color",
    "Symbola", "GNU Unifont", "Fluent Emoji"
  ].map(s => normalizeForMatch(s)));

  // Common math font family names for accurate detection.
  // Stored in normalized form (lowercase, no spaces/hyphens/underscores).
  const MATH_FONT_NAMES = new Set([
    "Cambria Math", "Latin Modern Math", "STIX Math", "STIX Two Math",
    "Asana Math", "XITS Math", "New Computer Modern Math",
    "Computer Modern Math", "TeX Gyre Bonum Math", "TeX Gyre Pagella Math",
    "TeX Gyre Schola Math", "TeX Gyre Termes Math", "TeX Gyre DejaVu Math",
    "Libertinus Math", "Minion Math", "Lucida Bright Math", "Lucida Math",
    "GFS Neohellenic Math", "KpMath", "KpMath-Regular",
    "Noto Sans Math", "Noto Serif Math", "Fira Math", "Euler Math",
    "MathJax_Main", "MathJax_Math", "MathJax_AMS", "MathJax_Caligraphic",
    "MathJax_Fraktur", "MathJax_Script", "MathJax_Typewriter",
    "MathJax_Size1", "MathJax_Size2", "MathJax_Size3", "MathJax_Size4",
    "Symbola", "DejaVu Math TeX Gyre"
  ].map(s => normalizeForMatch(s)));

  /**
   * Normalize font name for matching purposes.
   * Removes spaces, hyphens, underscores and converts to lowercase.
   */
  function normalizeForMatch(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/[\s\-_]+/g, "");
  }

  const FONT_PACKS = {
    regular: {
      stylesheetUrl: REGULAR_FONT_STYLESHEET_URL,
      sourceFamilies: ["Rubik", "Noto Sans SC", "Noto Sans TC", "Noto Sans HK", "Noto Sans JP", "Noto Sans KR"],
      state: "idle",
      css: "",
      promise: null
    },
    mono: {
      stylesheetUrl: MONO_FONT_STYLESHEET_URL,
      sourceFamilies: ["Noto Sans Mono"],
      state: "idle",
      css: "",
      promise: null
    },
    math: {
      stylesheetUrl: MATH_FONT_STYLESHEET_URL,
      sourceFamilies: ["Noto Sans Math"],
      state: "idle",
      css: "",
      promise: null
    },
    emoji: {
      stylesheetUrl: EMOJI_FONT_STYLESHEET_URL,
      sourceFamilies: ["Noto Color Emoji"],
      state: "idle",
      css: "",
      promise: null
    }
  };

  let lastSignature = "";

  function debugLog(...args) {
    if (!ENABLE_DEBUG_LOG) return;
    console.debug("[font-override]", ...args);
  }

  function ensureStyleTag() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    return style;
  }

  function normalizeFontName(name) {
    return String(name || "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function escapeFontName(name) {
    return String(name || "").replace(/'/g, "\\'");
  }

  function parseFontFamily(fontFamilyValue) {
    if (!fontFamilyValue) return [];

    const result = [];
    let buf = "";
    let quote = null;

    for (let i = 0; i < fontFamilyValue.length; i++) {
      const ch = fontFamilyValue[i];

      if (quote) {
        buf += ch;
        if (ch === quote) quote = null;
        continue;
      }

      if (ch === "'" || ch === '"') {
        quote = ch;
        buf += ch;
        continue;
      }

      if (ch === ",") {
        pushBuffer();
        buf = "";
        continue;
      }

      buf += ch;
    }

    pushBuffer();
    return result;

    function pushBuffer() {
      const s = buf.trim().replace(/^["']|["']$/g, "");
      if (s) result.push(s);
    }
  }

  function ensureAbsoluteFontURLs(cssText, baseUrl) {
    if (!cssText) return "";

    return cssText.replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, rawUrl) => {
      const trimmed = String(rawUrl || "").trim();
      if (!trimmed || /^data:/i.test(trimmed)) return match;

      try {
        const absoluteUrl = new URL(trimmed, baseUrl).href;
        return `url('${absoluteUrl}')`;
      } catch (_) {
        return match;
      }
    });
  }

  function extractFontFaceCSS(cssText, sourceFamilies) {
    if (!cssText) return "";

    const matches = cssText.match(/@font-face\s*{[\s\S]*?}/gi) || [];
    const familyMatchers = sourceFamilies.map(family => {
      const escaped = String(family).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`font-family\\s*:\\s*['"]?${escaped}['"]?\\s*;`, "i");
    });
    const blocks = matches
      .filter(block => familyMatchers.some(matcher => matcher.test(block)))
      .map(block => block.trim())
      .filter(Boolean);

    return blocks.join("\n\n");
  }

  function renameFontFaceFamily(fontFaceCSS, family, sourceFamilies) {
    if (!fontFaceCSS) return "";

    let renamed = fontFaceCSS;

    for (const sourceFamily of sourceFamilies) {
      const escaped = String(sourceFamily).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      renamed = renamed.replace(
        new RegExp(`font-family\\s*:\\s*['"]?${escaped}['"]?\\s*;`, "gi"),
        `font-family: '${escapeFontName(family)}';`
      );
    }

    return renamed;
  }

  async function ensureFontPackLoaded(packKey) {
    const pack = FONT_PACKS[packKey];
    if (!pack) return "";
    if (pack.state === "ready") return pack.css;
    if (pack.promise) return pack.promise;

    pack.state = "loading";
    pack.promise = fetch(pack.stylesheetUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.text();
      })
      .then(cssText => {
        const absoluteCSS = ensureAbsoluteFontURLs(cssText, pack.stylesheetUrl);
        const extractedCSS = extractFontFaceCSS(absoluteCSS, pack.sourceFamilies);

        if (!extractedCSS) {
          throw new Error(`No matching @font-face rules found for ${packKey}`);
        }

        pack.css = extractedCSS;
        pack.state = "ready";
        debugLog("font pack loaded", {
          pack: packKey,
          stylesheetUrl: pack.stylesheetUrl,
          ruleCount: (extractedCSS.match(/@font-face/g) || []).length
        });
        lastSignature = "";
        applyDynamicFontOverride();
        return pack.css;
      })
      .catch(error => {
        pack.css = "";
        pack.state = "error";
        debugLog("font pack load failed", {
          pack: packKey,
          stylesheetUrl: pack.stylesheetUrl,
          error: error && error.message ? error.message : String(error)
        });
        lastSignature = "";
        applyDynamicFontOverride();
        return "";
      })
      .finally(() => {
        pack.promise = null;
      });

    return pack.promise;
  }

  function isFontPackReady(packKey) {
    const pack = FONT_PACKS[packKey];
    return Boolean(pack && pack.state === "ready" && pack.css);
  }

  function triggerFontPackLoad(packKey) {
    const pack = FONT_PACKS[packKey];
    if (!pack || pack.state !== "idle") return;
    ensureFontPackLoaded(packKey);
  }

  function buildAliasedFontFaceCSS(packKey, targetFamilies) {
    const pack = FONT_PACKS[packKey];
    if (!pack || !pack.css || !targetFamilies || targetFamilies.length === 0) {
      return "";
    }

    const css = [pack.css];
    const seenFamilies = new Set(pack.sourceFamilies.map(normalizeFontName));

    for (const family of targetFamilies) {
      const normalizedFamily = normalizeFontName(family);
      if (!normalizedFamily || seenFamilies.has(normalizedFamily)) continue;
      seenFamilies.add(normalizedFamily);
      css.push(renameFontFaceFamily(pack.css, family, pack.sourceFamilies));
    }

    return css.join("\n\n");
  }

  function buildFontPackDebugState(packKey, usageCount, hasRules) {
    const pack = FONT_PACKS[packKey];
    return {
      enabled: usageCount > 0 || packKey === "regular" || packKey === "emoji",
      cssState: pack ? pack.state : "missing",
      cssReady: Boolean(pack && pack.css),
      usageCount,
      hasRules
    };
  }

  function isGenericFamily(name) {
    return GENERIC_SKIP.has(normalizeFontName(name));
  }

  function isSymbolFamily(name) {
    const lower = normalizeFontName(name);
    if (!lower) return false;

    return (
      /\bsymbols?\b/.test(lower) ||
      /\bicon(s)?\b/.test(lower) ||
      /\bmaterial icons?\b/.test(lower) ||
      /\bmaterial symbols?\b/.test(lower) ||
      /\bfont awesome\b/.test(lower) ||
      /\bremixicon\b/.test(lower) ||
      /\bheroicons?\b/.test(lower) ||
      /\bionicons?\b/.test(lower)
    );
  }

  function isMonoFamily(name) {
    const normalized = normalizeForMatch(name);
    if (!normalized) return false;

    // Check against known mono font names (normalized)
    if (MONO_FONT_NAMES.has(normalized)) return true;

    // Fallback keyword matching for unlisted mono fonts
    return (
      normalized === "mono" ||
      /mono/.test(normalized) ||
      /code/.test(normalized)
    );
  }

  function isMathFamily(name) {
    const normalized = normalizeForMatch(name);
    if (!normalized) return false;

    // Check against known math font names (normalized)
    if (MATH_FONT_NAMES.has(normalized)) return true;

    // Fallback keyword matching for unlisted math fonts
    return normalized === "math" || /math/.test(normalized);
  }

  function isEmojiFamily(name) {
    const normalized = normalizeForMatch(name);
    if (!normalized) return false;

    // Check against known emoji font names (normalized)
    if (EMOJI_FONT_NAMES.has(normalized)) return true;

    // Fallback keyword matching for unlisted emoji fonts
    return normalized === "emoji" || /emoji/.test(normalized);
  }

  function shouldExcludeFamily(name) {
    const lower = normalizeFontName(name);
    if (!lower) return true;
    return EXCLUDE_FONTS.has(lower) || isSymbolFamily(lower);
  }

  function classifyFamily(name) {
    if (shouldExcludeFamily(name)) return "symbol";
    if (isMonoFamily(name)) return "mono";
    if (isMathFamily(name)) return "math";
    if (isEmojiFamily(name)) return "emoji";
    if (isGenericFamily(name)) return "generic";
    return "regular";
  }

  function isActuallyVisible(element, cache) {
    if (!element || !element.isConnected) return false;

    if (cache.has(element)) return cache.get(element);

    let visible = false;

    if (typeof element.checkVisibility === "function") {
      try {
        visible = element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
          contentVisibilityAuto: true
        });
      } catch (_) {
        // Some browsers have incomplete implementations, so use the fallback.
      }
    }

    if (!visible) {
      const cs = getComputedStyle(element);
      visible =
        cs.display !== "none" &&
        cs.visibility !== "hidden" &&
        cs.opacity !== "0";
    }

    cache.set(element, visible);
    return visible;
  }

  function textNodeHasRenderedBox(textNode, range) {
    if (!textNode || !textNode.isConnected) return false;
    if (!textNode.nodeValue || !textNode.nodeValue.trim()) return false;

    try {
      range.selectNodeContents(textNode);
      return range.getClientRects().length > 0;
    } catch (_) {
      return false;
    }
  }

  function createUsageBucket() {
    return {
      regular: new Map(),
      eligible: new Map(),
      mono: new Set(),
      math: new Set(),
      emoji: new Set()
    };
  }

  function addUsage(map, family) {
    map.set(family, { family });
  }

  function addSpecialUsage(set, family) {
    set.add(family);
  }

  function collectFontUsages(root = document.documentElement) {
    const bucket = createUsageBucket();
    const visibilityCache = new WeakMap();
    const styleCache = new WeakMap();
    const range = document.createRange();

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node || !node.nodeValue || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }

          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (SKIP_PARENT_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (!parent) {
        node = walker.nextNode();
        continue;
      }

      if (!isActuallyVisible(parent, visibilityCache)) {
        node = walker.nextNode();
        continue;
      }

      if (!textNodeHasRenderedBox(node, range)) {
        node = walker.nextNode();
        continue;
      }

      let cs = styleCache.get(parent);
      if (!cs) {
        cs = getComputedStyle(parent);
        styleCache.set(parent, cs);
      }

      const families = parseFontFamily(cs.fontFamily);

      for (const family of families) {
        const classification = classifyFamily(family);

        if (classification === "symbol") continue;

        if (classification !== "generic") {
          addUsage(bucket.eligible, family);
        }

        if (classification === "regular") {
          addUsage(bucket.regular, family);
        } else if (classification === "mono") {
          addSpecialUsage(bucket.mono, family);
        } else if (classification === "math") {
          addSpecialUsage(bucket.math, family);
        } else if (classification === "emoji") {
          addSpecialUsage(bucket.emoji, family);
        }
      }

      node = walker.nextNode();
    }

    // Convert special font Sets to usage objects
    const monoUsages = [...bucket.mono].map(family => ({ family }));
    const mathUsages = [...bucket.math].map(family => ({ family }));
    const emojiUsages = [...bucket.emoji].map(family => ({ family }));

    const result = {
      regularUsages: [...bucket.regular.values()],
      eligibleUsages: [...bucket.eligible.values()],
      monoUsages,
      mathUsages,
      emojiUsages
    };

    debugLog("collectFontUsages", {
      regularCount: result.regularUsages.length,
      eligibleCount: result.eligibleUsages.length,
      monoCount: result.monoUsages.length,
      mathCount: result.mathUsages.length,
      emojiCount: result.emojiUsages.length
    });

    return result;
  }

  function buildRegularFontFaceCSS(usages) {
    if (!usages.length) return "";
    if (!isFontPackReady("regular")) return "";
    return buildAliasedFontFaceCSS("regular", usages.map(({ family }) => family));
  }

  function buildSpecialFontFaceCSS(usageData) {
    const css = [];

    if (ENABLE_MONO_REPLACEMENT) {
      if (isFontPackReady("mono")) {
        const monoCSS = buildAliasedFontFaceCSS("mono", usageData.monoUsages.map(({ family }) => family));
        if (monoCSS) css.push(monoCSS);
      }
    }

    if (ENABLE_MATH_REPLACEMENT) {
      if (isFontPackReady("math")) {
        const mathCSS = buildAliasedFontFaceCSS("math", usageData.mathUsages.map(({ family }) => family));
        if (mathCSS) css.push(mathCSS);
      }
    }

    if (ENABLE_EMOJI_REPLACEMENT) {
      if (isFontPackReady("emoji")) {
        const emojiCSS = buildAliasedFontFaceCSS("emoji", usageData.emojiUsages.map(({ family }) => family));
        if (emojiCSS) css.push(emojiCSS);
      }
    }

    debugLog("buildSpecialFontFaceCSS", {
      monoEnabled: ENABLE_MONO_REPLACEMENT,
      mathEnabled: ENABLE_MATH_REPLACEMENT,
      emojiEnabled: ENABLE_EMOJI_REPLACEMENT,
      regularFontCSSState: FONT_PACKS.regular.state,
      monoFontCSSState: FONT_PACKS.mono.state,
      mathFontCSSState: FONT_PACKS.math.state,
      emojiFontCSSState: FONT_PACKS.emoji.state,
      specialRuleCount: css.length
    });

    return css.join("\n\n");
  }

  function collectReplacementFamiliesForRemoval(usageData, ruleState) {
    return collectReplacementFamilies(
      ruleState.hasRegularRules ? usageData.regularUsages : [],
      ruleState.hasRegularRules ? usageData.eligibleUsages : [],
      ruleState.hasMonoRules ? usageData.monoUsages : [],
      ruleState.hasMathRules ? usageData.mathUsages : [],
      ruleState.hasEmojiRules ? usageData.emojiUsages : []
    );
  }

  function collectReplacementFamilies(...usageLists) {
    const families = new Set();

    for (const usages of usageLists) {
      for (const { family } of usages) {
        const normalized = normalizeFontName(family);
        if (normalized) families.add(normalized);
      }
    }

    return families;
  }

  function clearReplacedFontFaces(targetFamilies) {
    if (!targetFamilies || targetFamilies.size === 0) return 0;

    let removed = 0;

    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (sheet.ownerNode && sheet.ownerNode.id === STYLE_ID) continue;
        removed += removeFontFacesFromContainer(sheet, targetFamilies);
      } catch (_) {
        // Cross-origin stylesheet / inaccessible stylesheet, ignore
      }
    }

    return removed;
  }

  function removeFontFacesFromContainer(container, targetFamilies) {
    let rules;
    try {
      rules = container.cssRules || container.rules;
    } catch (_) {
      return 0;
    }

    if (!rules) return 0;

    let removed = 0;

    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i];
      if (!rule) continue;

      try {
        if (rule.type === CSSRule.FONT_FACE_RULE) {
          const rawFamily = rule.style.getPropertyValue("font-family");
          const normalized = normalizeFontName(rawFamily);

          if (normalized && targetFamilies.has(normalized)) {
            container.deleteRule(i);
            removed += 1;
          }
          continue;
        }

        if (rule.type === CSSRule.IMPORT_RULE && rule.styleSheet) {
          removed += removeFontFacesFromContainer(rule.styleSheet, targetFamilies);
          continue;
        }

        if ("cssRules" in rule && rule.cssRules && typeof rule.deleteRule === "function") {
          removed += removeFontFacesFromContainer(rule, targetFamilies);
        }
      } catch (_) {
        // Some rules are not operable, ignore them
      }
    }

    return removed;
  }

  function buildSignature(usageData) {
    const usageParts = [
      ...usageData.regularUsages.map(u => `regular:${normalizeFontName(u.family)}||${u.style}||${u.weight}||${u.stretch}`),
      ...usageData.eligibleUsages.map(u => `eligible:${normalizeFontName(u.family)}||${u.style}||${u.weight}||${u.stretch}`),
      ...usageData.monoUsages.map(u => `mono:${normalizeFontName(u.family)}||${u.style}||${u.weight}||${u.stretch}`),
      ...usageData.mathUsages.map(u => `math:${normalizeFontName(u.family)}||${u.style}||${u.weight}||${u.stretch}`),
      ...usageData.emojiUsages.map(u => `emoji:${normalizeFontName(u.family)}||${u.style}||${u.weight}||${u.stretch}`)
    ].sort();

    const toggles = [
      `toggle:mono:${ENABLE_MONO_REPLACEMENT ? 1 : 0}`,
      `toggle:math:${ENABLE_MATH_REPLACEMENT ? 1 : 0}`,
      `toggle:emoji:${ENABLE_EMOJI_REPLACEMENT ? 1 : 0}`,
      `toggle:regular_css_state:${FONT_PACKS.regular.state}`,
      `toggle:mono_css_state:${FONT_PACKS.mono.state}`,
      `toggle:math_css_state:${FONT_PACKS.math.state}`,
      `toggle:emoji_css_state:${FONT_PACKS.emoji.state}`,
      `toggle:remove_original_font_face:${REMOVE_ORIGINAL_FONT_FACE ? 1 : 0}`,
      `toggle:debug_log:${ENABLE_DEBUG_LOG ? 1 : 0}`
    ];

    return usageParts.concat(toggles).join("::");
  }

  function applyDynamicFontOverride() {
    const usageData = collectFontUsages();

    if (usageData.regularUsages.length > 0) {
      triggerFontPackLoad("regular");
    }

    if (ENABLE_MONO_REPLACEMENT && usageData.monoUsages.length > 0) {
      triggerFontPackLoad("mono");
    }

    if (ENABLE_MATH_REPLACEMENT && usageData.mathUsages.length > 0) {
      triggerFontPackLoad("math");
    }

    if (ENABLE_EMOJI_REPLACEMENT && usageData.emojiUsages.length > 0) {
      triggerFontPackLoad("emoji");
    }

    const signature = buildSignature(usageData);

    debugLog("applyDynamicFontOverride:start", {
      signature,
      lastSignature
    });

    if (signature === lastSignature) {
      debugLog("applyDynamicFontOverride:skip", {
        reason: "signature unchanged"
      });
      return;
    }
    lastSignature = signature;

    const style = ensureStyleTag();
    const hasRegularRules = usageData.regularUsages.length > 0 && isFontPackReady("regular");
    const hasMonoRules =
      ENABLE_MONO_REPLACEMENT &&
      usageData.monoUsages.length > 0 &&
      isFontPackReady("mono");
    const hasMathRules =
      ENABLE_MATH_REPLACEMENT &&
      usageData.mathUsages.length > 0 &&
      isFontPackReady("math");
    const hasEmojiRules =
      ENABLE_EMOJI_REPLACEMENT &&
      usageData.emojiUsages.length > 0 &&
      isFontPackReady("emoji");
    const hasApplicableRules =
      hasRegularRules ||
      hasMonoRules ||
      hasMathRules ||
      hasEmojiRules;
    const ruleState = {
      hasRegularRules,
      hasMonoRules,
      hasMathRules,
      hasEmojiRules
    };

    debugLog("applyDynamicFontOverride:rule-state", {
      hasRegularRules,
      hasMonoRules,
      hasMathRules,
      hasEmojiRules,
      hasApplicableRules,
      regular: buildFontPackDebugState("regular", usageData.regularUsages.length, hasRegularRules),
      mono: buildFontPackDebugState("mono", usageData.monoUsages.length, hasMonoRules),
      math: buildFontPackDebugState("math", usageData.mathUsages.length, hasMathRules),
      emoji: buildFontPackDebugState("emoji", usageData.emojiUsages.length, hasEmojiRules),
      removeOriginalFontFace: REMOVE_ORIGINAL_FONT_FACE
    });

    if (!hasApplicableRules) {
      style.textContent = "";
      debugLog("no visible text font usages found");
      return;
    }

    const targetFamilies = collectReplacementFamiliesForRemoval(usageData, ruleState);

    const specialCSS = buildSpecialFontFaceCSS(usageData);
    const regularCSS = buildRegularFontFaceCSS(usageData.regularUsages);
    const css = [specialCSS, regularCSS].filter(Boolean).join("\n\n");
    let removedOriginalFontFaces = 0;

    if (REMOVE_ORIGINAL_FONT_FACE) {
      removedOriginalFontFaces = clearReplacedFontFaces(targetFamilies);
      debugLog("clearReplacedFontFaces", {
        targetFamilyCount: targetFamilies.size,
        removedOriginalFontFaces
      });
    } else {
      debugLog("clearReplacedFontFaces:skip", {
        reason: "REMOVE_ORIGINAL_FONT_FACE disabled",
        targetFamilyCount: targetFamilies.size
      });
    }
    style.textContent = css;

    debugLog("update", {
      regular: usageData.regularUsages.map(u => u.family),
      mono: usageData.monoUsages.map(u => u.family),
      math: usageData.mathUsages.map(u => u.family),
      emoji: usageData.emojiUsages.map(u => u.family),
      removeOriginalFontFace: REMOVE_ORIGINAL_FONT_FACE,
      removedOriginalFontFaces
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      debugLog("trigger", { source: "DOMContentLoaded" });
      applyDynamicFontOverride();
    }, { once: true });
  } else {
    debugLog("trigger", { source: "immediate" });
    applyDynamicFontOverride();
  }

  const debounce = (fn, wait = 300) => {
    let t;
    return () => {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  };

  const mo = new MutationObserver(debounce(() => {
    debugLog("trigger", { source: "MutationObserver" });
    applyDynamicFontOverride();
  }, 400));
  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
