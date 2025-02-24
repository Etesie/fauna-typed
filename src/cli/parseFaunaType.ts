export type ParseMode = "main" | "create" | "update" | "replace";

export interface ParsedResult {
  /**
   * The final string for the type, e.g.
   *  - "\"string\""
   *  - "\"string[]\""
   *  - "v.createRef(type(\"'User'\"))"
   *  - "v.createRef(type(\"'User'\")).array()"
   *  - "[{ user: \"user\" }, \"[]\"]"
   */
  type: string;
  isOptional: boolean;
}

/**
 * parseFaunaType
 * The special logic for arrays:
 *   - If the inside is a *quoted scalar* => produce `"something[]"`
 *   - If the inside is a reference => produce e.g. v.createRef(...).array()
 *   - If the inside is an object => produce `[ { ... }, "[]" ]`
 */
export function parseFaunaType(
  signature: string,
  mode: ParseMode
): ParsedResult {
  let trimmed = signature.trim();

  // 1) optional check
  const isOptional = trimmed.endsWith("?");
  if (isOptional) {
    trimmed = trimmed.slice(0, -1).trim();
  }

  // 2) top-level union?
  if (trimmed.includes("|") && isTopLevelUnion(trimmed)) {
    const parts = trimmed.split("|").map((p) => p.trim());
    const finalParts = parts.map(stripOuterQuotesThenSingleQuote);
    // => "'Github' | 'Google'"
    return {
      type: `"${finalParts.join(" | ")}"`,
      isOptional,
    };
  }

  // 3) Array check
  if (trimmed.startsWith("Array<") && trimmed.endsWith(">")) {
    const inside = trimmed.slice(6, -1).trim();
    const inner = parseFaunaType(inside, mode); // parse inside

    // a) If the inside is a "quoted scalar" => produce "something[]"
    //    e.g. if inside.type = "\"string\"", we want => "string[]"
    if (isQuotedScalar(inner.type)) {
      // strip leading/trailing quotes from the inside
      const scalar = inner.type.slice(1, -1); // e.g. string
      return { type: `"${scalar}[]"`, isOptional };
    }

    // b) If the inside is a reference => produce => v.createRef(...).array()
    if (mode !== "main" && inner.type.startsWith("v.createRef(")) {
      return { type: `${inner.type}.array()`, isOptional };
    }

    // c) If the inside is an object => produce => [ { ... }, "[]" ]
    //    e.g. => "[{ user: \"user\" }, \"[]\"]"
    if (inner.type.startsWith("{") && inner.type.endsWith("}")) {
      return { type: `[${inner.type}, "[]"]`, isOptional };
    }

    // d) fallback => e.g. => "TimeStub[]" or just "string[]" if it’s a weird scenario
    return { type: `${inner.type}[]`, isOptional };
  }

  // 4) If "Ref<User>"
  if (trimmed.startsWith("Ref<") && trimmed.endsWith(">")) {
    const inside = trimmed.slice(4, -1).trim(); // "User"
    if (mode === "main") {
      // => "\"user\""
      return { type: `"${inside.toLowerCase()}"`, isOptional };
    } else {
      // => v.createRef(type("'User'"))
      return { type: `v.createRef(type("'${inside}'"))`, isOptional };
    }
  }

  // 5) object literal
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    const obj = parseFaunaObjectLiteral(trimmed, mode);
    return { type: obj, isOptional };
  }

  // 6) convert known fauna scalars => e.g. "\"string\""
  const scalar = convertFaunaScalar(trimmed);
  if (scalar) {
    return { type: scalar, isOptional };
  }

  // 7) fallback => wrap in quotes => e.g. "\"myType\""
  return { type: `"${trimmed}"`, isOptional };
}

/** Only treat '|' as union if it occurs with zero brace nesting. */
function isTopLevelUnion(sig: string): boolean {
  let depth = 0;
  for (let i = 0; i < sig.length; i++) {
    const c = sig[i];
    if (c === "{" || c === "<") depth++;
    else if (c === "}" || c === ">") depth--;
    else if (c === "|" && depth === 0) return true;
  }
  return false;
}

/**
 * e.g. "String" => "\"string\"", "Boolean" => "\"boolean\"",
 * "Long"/"Int" => "\"number\"", "Time"/"Timestamp" => "TimeStub", etc.
 */
function convertFaunaScalar(faunaType: string): string | null {
  switch (faunaType) {
    case "String":
      return `"string"`;
    case "Boolean":
      return `"boolean"`;
    case "Long":
    case "Int":
      return `"number"`;
    case "Time":
    case "Timestamp":
      return "TimeStub";
    case "Date":
      return "DateStub";
    case "Null":
      return "null";
    default:
      return null;
  }
}

/**
 * parseFaunaObjectLiteral => splits top-level commas => "key: val" => parseFaunaType
 */
function parseFaunaObjectLiteral(sig: string, mode: ParseMode): string {
  const inside = sig.slice(1, -1).trim();
  const props = splitProps(inside);
  const finalProps = props.map((chunk) => {
    const idx = chunk.indexOf(":");
    if (idx === -1) return chunk;
    const key = chunk.slice(0, idx).trim();
    const val = chunk.slice(idx + 1).trim();
    const { type } = parseFaunaType(val, mode);
    return `${key}: ${type}`;
  });
  return `{ ${finalProps.join(", ")} }`;
}

/** Splits object fields on commas not nested in { or <. */
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
 * If the type is a double-quoted string, e.g. "\"string\"" => that is a "quoted scalar".
 */
function isQuotedScalar(typeStr: string): boolean {
  // e.g. "\"string\"" => at least 2 chars, starts+ends with quote
  return (
    typeStr.length >= 2 &&
    typeStr.startsWith('"') &&
    typeStr.endsWith('"') &&
    // not an object literal
    !typeStr.startsWith('"{') &&
    !typeStr.endsWith('}"')
  );
}

/**
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
