/**
 * Attempts to repair truncated slide code so it can still render in Sandpack.
 * This is a best-effort recovery — it closes unclosed strings, braces,
 * parentheses, brackets, and JSX tags to produce syntactically valid output.
 */

interface RepairResult {
  code: string;
  repaired: boolean;
  repairs: string[];
}

export function repairSlideCode(code: string): RepairResult {
  const repairs: string[] = [];
  let result = code;

  // ── Step 1: Close unclosed string literals ──────────────────
  // Walk the code to find if we're inside an unclosed string at the end
  let inString: string | null = null;
  let inTemplateLiteral = false;
  let templateDepth = 0;
  let escaped = false;

  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    const prev = i > 0 ? result[i - 1] : "";
    const next = i + 1 < result.length ? result[i + 1] : "";

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

    if (inString) {
      if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (inTemplateLiteral) {
      if (ch === "`" && templateDepth === 0) {
        inTemplateLiteral = false;
        continue;
      } else if (ch === "$" && next === "{") {
        templateDepth++;
        i++; // skip {
        continue;
      } else if (ch === "}" && templateDepth > 0) {
        // Note: this greedy approach is OK for Step 1 (string detection)
        // because we only care about whether we end inside a string/template,
        // not about brace balance (that's Step 3's job).
        templateDepth--;
        continue;
      }
      if (templateDepth === 0) continue;
      // Inside ${...} — fall through to check for nested strings
    }

    switch (ch) {
      case '"':
      case "'":
        // Apostrophe guard: if preceded by a word char, it's an apostrophe
        // in text content (e.g. "company's"), not a string delimiter.
        if (/[a-zA-Z0-9]/.test(prev)) break;
        inString = ch;
        break;
      case "`":
        inTemplateLiteral = true;
        templateDepth = 0;
        break;
    }
  }

  if (inString) {
    result += inString;
    repairs.push(`Closed unclosed ${inString === "'" ? "single" : "double"}-quoted string`);
  }
  if (inTemplateLiteral) {
    result += "`";
    repairs.push("Closed unclosed template literal");
  }

  // ── Step 2: Close unclosed JSX expression containers {  } ───
  // After closing strings, re-scan for brace/paren/bracket balance
  // We need to be context-aware: inside JSX vs JS

  // ── Step 3: Balance braces, parens, brackets ────────────────
  // Re-scan the (possibly string-closed) code
  const closers = balanceDelimiters(result);
  if (closers.length > 0) {
    // We need to figure out a reasonable closing sequence.
    // Heuristic: if the code has JSX (contains `return (`), we likely need
    // to close JSX tags before closing JS delimiters.
    const needsJsxClose = detectUnclosedJsxTags(result);

    // Close any open JSX tags first
    for (const tag of needsJsxClose) {
      result += `</${tag}>`;
      repairs.push(`Closed unclosed <${tag}> tag`);
    }

    // Now close remaining delimiters
    result += closers;
    repairs.push(
      `Closed ${closers.length} unclosed delimiter(s): ${closers
        .split("")
        .map((c) => `'${c}'`)
        .join(", ")}`
    );
  }

  // ── Step 4: Ensure there's a default export ─────────────────
  if (
    !result.includes("export default") &&
    !result.includes("module.exports")
  ) {
    // Try to find the function name
    const funcMatch = result.match(
      /function\s+([A-Z]\w*)\s*\(/
    );
    if (funcMatch) {
      result += `\nexport default ${funcMatch[1]};`;
      repairs.push(`Added missing default export for ${funcMatch[1]}`);
    }
  }

  return {
    code: result,
    repaired: repairs.length > 0,
    repairs,
  };
}

/**
 * Returns a string of closing delimiters needed to balance the code.
 * E.g. if there are 2 unclosed `{` and 1 unclosed `(`, returns ")}}".
 *
 * Uses a context-aware stack that properly tracks ${...} expressions
 * inside template literals so nested braces/parens are counted correctly.
 */
function balanceDelimiters(code: string): string {
  // Stack of expected closers: "}", ")", "]", or "template-expr-close"
  // "template-expr-close" is a sentinel meaning "this } closes a ${...}"
  const stack: string[] = [];
  let inString: string | null = null;
  let inTemplateLiteral = false;
  let templateDepth = 0;
  let escaped = false;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const next = i + 1 < code.length ? code[i + 1] : "";
    const prev = i > 0 ? code[i - 1] : "";

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

    if (inString) {
      if (ch === inString) inString = null;
      continue;
    }

    if (inTemplateLiteral) {
      if (ch === "`" && templateDepth === 0) {
        inTemplateLiteral = false;
        continue;
      } else if (ch === "$" && next === "{") {
        // Enter ${...} expression — push sentinel, don't push a real closer
        templateDepth++;
        stack.push("template-expr-close");
        i++; // skip {
        continue;
      }
      // Template body (not inside ${...}) — skip
      if (templateDepth === 0) continue;
      // Inside ${...} — fall through to normal delimiter tracking
    }

    switch (ch) {
      case '"':
      case "'":
        if (/[a-zA-Z0-9]/.test(prev)) break;
        inString = ch;
        break;
      case "`":
        inTemplateLiteral = true;
        templateDepth = 0;
        break;
      case "{":
        stack.push("}");
        break;
      case "(":
        stack.push(")");
        break;
      case "[":
        stack.push("]");
        break;
      case "}":
        if (stack.length > 0) {
          const top = stack[stack.length - 1];
          if (top === "template-expr-close") {
            // This } closes a ${...} expression
            stack.pop();
            templateDepth--;
          } else if (top === "}") {
            stack.pop();
          }
          // else: mismatched — leave stack as-is
        }
        break;
      case ")":
        if (stack.length > 0 && stack[stack.length - 1] === ")") {
          stack.pop();
        }
        break;
      case "]":
        if (stack.length > 0 && stack[stack.length - 1] === "]") {
          stack.pop();
        }
        break;
    }
  }

  // Filter out template-expr-close sentinels — we only want real closers
  return stack
    .filter((c) => c !== "template-expr-close")
    .reverse()
    .join("");
}

/**
 * Best-effort detection of unclosed JSX tags.
 * Looks for `<TagName` patterns without matching `</TagName>` or self-closing `/>`
 * Only tracks capitalized tags (React components) and common HTML block tags.
 */
function detectUnclosedJsxTags(code: string): string[] {
  const tagStack: string[] = [];

  // Match opening and closing JSX tags
  // Opening: <TagName or <div etc. (not self-closing)
  // Closing: </TagName> or </div>
  const tagRegex = /<\/?([A-Za-z][A-Za-z0-9.]*)[^>]*\/?>/g;
  let match;

  while ((match = tagRegex.exec(code)) !== null) {
    const fullMatch = match[0];
    const tagName = match[1];

    // Skip self-closing tags
    if (fullMatch.endsWith("/>")) continue;

    // Closing tag
    if (fullMatch.startsWith("</")) {
      // Pop matching opening tag from stack
      const lastIdx = tagStack.lastIndexOf(tagName);
      if (lastIdx !== -1) {
        tagStack.splice(lastIdx, 1);
      }
    } else {
      // Opening tag
      tagStack.push(tagName);
    }
  }

  // Also check for tags that were opened but never closed (truncated mid-tag)
  // e.g. code ends with `<div style={{...}}` without the closing `>`
  const trailingOpenTag = code.match(/<([A-Za-z][A-Za-z0-9.]*)\s[^>]*$/);
  if (trailingOpenTag) {
    // The tag was never closed with >, so it's part of the truncation.
    // We'll let the delimiter balancer handle the attributes; just note it.
  }

  // Return tags in reverse order so innermost close first
  return tagStack.reverse();
}