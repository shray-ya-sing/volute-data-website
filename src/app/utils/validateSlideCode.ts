/**
 * Validates generated slide code before passing it to Sandpack.
 * Detects common truncation issues that cause cryptic Babel errors.
 *
 * Three layers of defense:
 * 1. Apostrophe guard: a ' preceded by a word char is never a JS string opener
 * 2. JSX text tracking: between > and < in JSX context, quotes are text
 * 3. Unified brace context stack: tracks JS braces, JSX expression containers,
 *    AND template expression ${...} closers so nested braces are never miscounted
 */

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

type BraceContext = "js" | "jsx-expr" | "template-expr";

export function validateSlideCode(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!code || code.trim().length === 0) {
    errors.push("Empty code received from API");
    return { valid: false, errors, warnings };
  }

  let braceCount = 0;
  let parenCount = 0;
  let bracketCount = 0;
  let inString: string | null = null;
  let inTemplateLiteral = false;
  let templateDepth = 0; // how many nested ${...} expressions we're inside
  let escaped = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;

  // Unified stack tracking ALL brace contexts:
  // - "js": regular JS brace (counted in braceCount)
  // - "jsx-expr": JSX expression container {}, restores inJsxText on close
  // - "template-expr": the { from ${...}, NOT counted in braceCount
  const braceContextStack: BraceContext[] = [];
  let inJsxText = false;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const next = i + 1 < code.length ? code[i + 1] : "";
    const prev = i > 0 ? code[i - 1] : "";

    // ── Newlines ──────────────────────────────────────────────────
    if (ch === "\n") {
      if (inSingleLineComment) inSingleLineComment = false;
      continue;
    }

    // ── Single-line comment ───────────────────────────────────────
    if (inSingleLineComment) continue;

    // ── Multi-line comment ────────────────────────────────────────
    if (inMultiLineComment) {
      if (ch === "*" && next === "/") {
        inMultiLineComment = false;
        i++;
      }
      continue;
    }

    // ── Escape sequences ──────────────────────────────────────────
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      if (inString || inTemplateLiteral) {
        escaped = true;
      }
      continue;
    }

    // ── Inside a regular string ───────────────────────────────────
    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }

    // ── Inside a template literal ─────────────────────────────────
    if (inTemplateLiteral) {
      if (ch === "`" && templateDepth === 0) {
        // Closing the template literal
        inTemplateLiteral = false;
        continue;
      } else if (ch === "$" && next === "{") {
        // Entering a ${...} expression
        templateDepth++;
        braceContextStack.push("template-expr");
        // DON'T increment braceCount — ${ is template syntax, not a JS brace
        i++; // skip the {
        continue;
      }

      // Template body (outside any ${...}) — skip all characters
      if (templateDepth === 0) continue;

      // Inside a ${...} expression — fall through to the main parser below
      // so that all delimiters ({, }, (, ), etc.) are tracked normally.
      // The closing } of this expression will be caught by the switch/stack.
    }

    // ── Inside JSX text content ───────────────────────────────────
    if (inJsxText) {
      if (ch === "<") {
        inJsxText = false;
        // fall through — < is structural but not a delimiter we count
      } else if (ch === "{") {
        // JSX expression container — exit JSX text mode
        inJsxText = false;
        braceCount++;
        braceContextStack.push("jsx-expr");
        continue;
      } else {
        // Any character in JSX text (including ' and ") — skip
        continue;
      }
    }

    // ── Detect comment starts ─────────────────────────────────────
    if (ch === "/" && next === "/") {
      inSingleLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inMultiLineComment = true;
      i++;
      continue;
    }

    // ── Main delimiter/character switch ───────────────────────────
    switch (ch) {
      case '"':
      case "'":
        // APOSTROPHE GUARD: In valid JS/JSX, a quote that opens a string
        // is NEVER immediately preceded by a word character [a-zA-Z0-9].
        // English apostrophes always are: "company's", "don't", "it's".
        if (/[a-zA-Z0-9]/.test(prev)) {
          break; // apostrophe in text — skip
        }
        inString = ch;
        break;

      case "`":
        inTemplateLiteral = true;
        templateDepth = 0;
        break;

      case "{":
        braceCount++;
        braceContextStack.push("js");
        break;

      case "}": {
        // Check what this } closes by looking at the stack
        const ctx =
          braceContextStack.length > 0
            ? braceContextStack.pop()!
            : null;

        if (ctx === "template-expr") {
          // This } closes a ${...} expression — return to template body
          templateDepth--;
          // DON'T change braceCount — this isn't a JS brace
        } else if (ctx === "jsx-expr") {
          // This } closes a JSX expression container — re-enter JSX text
          braceCount--;
          inJsxText = true;
        } else {
          // Regular JS brace (ctx === "js" or null)
          braceCount--;
        }
        break;
      }

      case "(":
        parenCount++;
        break;

      case ")":
        parenCount--;
        break;

      case "[":
        bracketCount++;
        break;

      case "]":
        bracketCount--;
        break;

      case ">":
        if (isLikelyJsxTagClose(code, i)) {
          inJsxText = true;
        }
        break;
    }
  }

  // ── Report errors ─────────────────────────────────────────────

  if (inString) {
    errors.push(
      `Code is truncated: unclosed string literal (opened with ${inString}). The LLM likely ran out of output tokens.`
    );
  }

  if (inTemplateLiteral) {
    errors.push(
      "Code is truncated: unclosed template literal. The LLM likely ran out of output tokens."
    );
  }

  if (braceCount > 0) {
    errors.push(
      `Code is truncated: ${braceCount} unclosed curly brace(s) { }. The LLM likely ran out of output tokens.`
    );
  } else if (braceCount < 0) {
    errors.push(
      `Syntax error: ${Math.abs(braceCount)} extra closing brace(s).`
    );
  }

  if (parenCount > 0) {
    errors.push(
      `Code is truncated: ${parenCount} unclosed parenthesis/parentheses ( ). The LLM likely ran out of output tokens.`
    );
  } else if (parenCount < 0) {
    errors.push(
      `Syntax error: ${Math.abs(parenCount)} extra closing parenthesis/parentheses.`
    );
  }

  if (bracketCount > 0) {
    errors.push(
      `Code is truncated: ${bracketCount} unclosed bracket(s) [ ]. The LLM likely ran out of output tokens.`
    );
  } else if (bracketCount < 0) {
    errors.push(
      `Syntax error: ${Math.abs(bracketCount)} extra closing bracket(s).`
    );
  }

  // Check for default export
  if (
    !code.includes("export default") &&
    !code.includes("module.exports")
  ) {
    errors.push(
      "Missing default export. The generated component must have 'export default function'."
    );
  }

  // Check if code ends suspiciously
  const trimmed = code.trimEnd();
  const lastChar = trimmed[trimmed.length - 1];
  if (lastChar && !["}", ")", ";", "`"].includes(lastChar)) {
    warnings.push(
      `Code ends with '${lastChar}' — possible truncation. Last 50 chars: "${trimmed.slice(-50)}"`
    );
  }

  // Size warnings
  if (code.length > 15000) {
    warnings.push(
      `Generated code is very large (${code.length} chars). This may cause slow rendering in Sandpack.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Heuristic: determine if a `>` at position `i` is likely closing a JSX tag.
 *
 * Strategy: scan backwards (max 200 chars) to find the matching `<`.
 * Rejects comparison operators (>=, =>, x > y) and generic type params.
 */
function isLikelyJsxTagClose(code: string, pos: number): boolean {
  // Quick rejections for operators
  if (pos > 0 && code[pos - 1] === "=") return false; // =>
  if (pos + 1 < code.length && code[pos + 1] === "=") return false; // >=

  // Find the non-whitespace char before >
  let k = pos - 1;
  while (k >= 0 && (code[k] === " " || code[k] === "\t")) k--;

  // Scan backwards to find the matching <, with a distance limit
  const MAX_SCAN = 200;
  let j = pos - 1;
  const limit = Math.max(0, pos - MAX_SCAN);
  let depth = 0;

  while (j >= limit) {
    const c = code[j];

    // Skip over string literals backwards (rough heuristic)
    if (c === '"' || c === "'") {
      const quote = c;
      j--;
      while (j >= limit && code[j] !== quote) {
        if (
          code[j] === "\\" &&
          j + 1 < code.length &&
          code[j + 1] === quote
        ) {
          j--;
        }
        j--;
      }
      j--;
      continue;
    }

    if (c === ">") {
      depth++;
      if (depth > 3) return false;
    }

    if (c === "<") {
      if (depth > 0) {
        depth--;
        j--;
        continue;
      }

      // Found the matching <. Verify it looks like a JSX tag.
      const afterOpen = code[j + 1];

      // IMPORTANT: Do NOT return true for closing tags (</div>, </span>, etc.).
      // After a closing tag, the context might be JSX text of a parent element,
      // OR it might be JS code (if this was the outermost JSX element).
      // We can't distinguish these cases without a full parser, and setting
      // inJsxText after a closing tag causes ) and } after the tag to be
      // silently skipped. The apostrophe guard handles quotes in JSX text
      // regardless of inJsxText, so it's safe to NOT set it here.
      if (afterOpen === "/") return false; // </closing> — don't enter JSX text

      // <Uppercase is a component
      if (afterOpen && /[A-Z]/.test(afterOpen)) return true;
    }

    // If we hit certain structural chars while scanning back,
    // we've probably left the JSX tag context
    if (c === ";") return false;
    if (c === "{" || c === "}") {
      // Exception: }> pattern like style={{...}}> is valid JSX
      if (c === "}" && j === k) {
        j--;
        continue;
      }
      return false;
    }

    j--;
  }

  return false;
}

const HTML_TAGS = new Set([
  "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "td", "th",
  "a", "img", "button", "input", "label", "section", "article",
  "header", "footer", "nav", "main", "aside", "form", "select",
  "option", "textarea", "strong", "em", "b", "i", "br", "hr",
  "svg", "path", "circle", "rect", "line", "text", "g", "defs",
  "tspan", "sup", "sub", "code", "pre", "blockquote", "figure",
  "figcaption", "video", "audio", "source", "canvas", "details",
  "summary", "dialog", "mark", "small", "del", "ins", "abbr",
  "caption", "col", "colgroup", "fieldset", "legend", "datalist",
  "output", "progress", "meter",
]);