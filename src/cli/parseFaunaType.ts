export type ParseMode = "main" | "create" | "update" | "replace";

export interface ParsedResult {
  /**
   * The final type text, e.g. "\"string\"", "[\"string\"]", "[v.createRef(...)]", "[{ ... }]", etc.
   */
  type: string;
  /** Was it optional (trailing '?')? */
  isOptional: boolean;
}

/**
 * parseFaunaType:
 * - If top-level union => single-quote each piece, entire union in double quotes
 * - If array => produce bracketed form [something]
 * - If reference => "v.createRef(...)"
 * - If object => parse subfields
 * - If scalar => e.g. "\"string\""
 */
export function parseFaunaType(signature: string, mode: ParseMode): ParsedResult {
  let trimmed = signature.trim();

  // 1) Check optional
  const isOptional = trimmed.endsWith("?");
  if (isOptional) {
    trimmed = trimmed.slice(0, -1).trim();
  }

  // 2) If top-level union => treat as union
  if (trimmed.includes("|") && isTopLevelUnion(trimmed)) {
    const parts = trimmed.split("|").map((p) => p.trim());
    const unionParts = parts.map(stripOuterQuotesThenSingleQuote);
    // => "'Github' | 'Google'"
    return {
      type: `"${unionParts.join(" | ")}"`,
      isOptional,
    };
  }

  // 3) If "Array<...>", produce bracketed array
  if (trimmed.startsWith("Array<") && trimmed.endsWith(">")) {
    const inside = trimmed.slice(6, -1).trim(); // e.g. "String"
    const inner = parseFaunaType(inside, mode);
    // if it's a simple scalar like "\"string\"", produce `[ "string" ]` => `["string"]`
    // if it's a reference => `[ v.createRef(type("'User'")) ]`
    // if it's an object => `[ { user: "user", ... } ]`
    return {
      type: `[${inner.type}]`,
      isOptional,
    };
  }

  // 4) If "Ref<User>"
  if (trimmed.startsWith("Ref<") && trimmed.endsWith(">")) {
    const inside = trimmed.slice(4, -1).trim(); // e.g. "User"
    if (mode === "main") {
      // => "\"user\""
      return { type: `"${inside.toLowerCase()}"`, isOptional };
    } else {
      // => "v.createRef(type("'User'"))"
      return { type: `v.createRef(type("'${inside}'"))`, isOptional };
    }
  }

  // 5) If an object literal => parse subfields
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const result = parseFaunaObjectLiteral(trimmed, mode);
    return { type: result, isOptional };
  }

  // 6) Convert known Fauna scalars
  const scalar = convertFaunaScalar(trimmed);
  if (scalar) {
    return { type: scalar, isOptional };
  }

  // 7) Fallback => wrap in double quotes => e.g. "\"someField\""
  return { type: `"${trimmed}"`, isOptional };
}

/** 
 * If there's a pipe with zero nesting => treat as top-level union
 */
function isTopLevelUnion(sig: string): boolean {
  let depth = 0;
  for (let i = 0; i < sig.length; i++) {
    const c = sig[i];
    if (c === "{" || c === "<") depth++;
    else if (c === "}" || c === ">") depth--;
    else if (c === "|" && depth === 0) {
      return true;
    }
  }
  return false;
}

/** 
 * Convert Fauna scalars:
 * String => "\"string\""
 * Boolean => "\"boolean\""
 * Long/Int => "\"number\""
 * Time => "TimeStub"
 * etc.
 */
function convertFaunaScalar(faunaType: string): string | null {
  switch (faunaType) {
    case "String":     return `"string"`;
    case "Boolean":    return `"boolean"`;
    case "Long":
    case "Int":        return `"number"`;
    case "Time":
    case "Timestamp":  return "TimeStub";
    case "Date":       return "DateStub";
    case "Null":       return "null";
    default:           return null;
  }
}

/**
 * parseFaunaObjectLiteral:
 * Splits on top-level commas => key: val => parseFaunaType => merges
 * e.g. => "{ name: "'Github' | 'Google'", userId: "\"string\"" }"
 */
function parseFaunaObjectLiteral(sig: string, mode: ParseMode): string {
  const inside = sig.slice(1, -1).trim();
  const props = splitProps(inside);

  const finalProps = props.map((chunk) => {
    const idx = chunk.indexOf(":");
    if (idx === -1) return chunk; // fallback
    const key = chunk.slice(0, idx).trim();
    const val = chunk.slice(idx + 1).trim();

    const { type } = parseFaunaType(val, mode);
    return `${key}: ${type}`;
  });

  return `{ ${finalProps.join(", ")} }`;
}

function splitProps(str: string): string[] {
  let depth = 0;
  let start = 0;
  const parts: string[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "{" || c === "<") depth++;
    else if (c === "}" || c === ">") depth--;
    else if (c === "," && depth === 0) {
      parts.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(str.slice(start).trim());
  return parts.filter(Boolean);
}

/**
 * stripOuterQuotesThenSingleQuote:
 * e.g.  "Google" => 'Google'
 *       "'Facebook'" => 'Facebook'
 *       "\"Github\"" => 'Github'
 */
function stripOuterQuotesThenSingleQuote(s: string): string {
  while (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1).trim();
  }
  return `'${s}'`;
}
