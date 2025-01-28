/**
 * Recursively parse and convert a Fauna type signature to a TypeScript type.
 *
 * Modes:
 *   - "main":  references (Ref<Foo>) become just "Foo"
 *   - "create": references become "DocumentReference"
 */
export function parseFaunaType(
  signature: string,
  mode: "main" | "create"
): string {
  let trimmed = signature.trim();

  // 1) Remove trailing "?" if present
  const isOptional = trimmed.endsWith("?");
  if (isOptional) {
    trimmed = trimmed.slice(0, -1).trim();
  }

  // 2) If it’s a top-level union type, split it properly by "|"
  if (isTopLevelUnion(trimmed)) {
    const parts = splitUnion(trimmed);
    return parts.map((part) => parseFaunaType(part, mode)).join(" | ");
  }

  // 3) Check if it's an object literal => starts with '{' and ends with '}'
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return parseFaunaObjectLiteral(trimmed, mode);
  }

  // 4) Check if it's an array => "Array< ... >"
  if (trimmed.startsWith("Array<") && trimmed.endsWith(">")) {
    const inside = trimmed.slice("Array<".length, -1).trim();
    const parsedInside = parseFaunaType(inside, mode);
    return `Array<${parsedInside}>`;
  }

  // 5) Check if it's a reference => "Ref<Foo>"
  if (trimmed.startsWith("Ref<") && trimmed.endsWith(">")) {
    const inside = trimmed.slice(4, -1).trim();
    if (mode === "create") {
      // For create mode, references become DocumentReference
      return "DocumentReference";
    } else {
      // For main mode, references become their domain type, e.g. "Foo"
      return inside;
    }
  }

  // 6) Convert known scalars
  switch (trimmed) {
    case "String":
      return "string";
    case "Boolean":
      return "boolean";
    case "Long":
    case "Int":
      return "number";
    case "Time":
      return "TimeStub";
    case "Date":
      return "DateStub";
    case "Null":
      return "null";
    default:
      // If we can’t parse it, just return it as-is
      return trimmed;
  }
}

/**
 * Helper to parse an object literal: { key: type, key2: type2, ... }
 */
function parseFaunaObjectLiteral(
  objSignature: string,
  mode: "main" | "create"
): string {
  // remove the outer braces
  const inside = objSignature.slice(1, -1).trim();

  // We need to split top-level properties by commas.
  const props = splitObjectProperties(inside);

  // parse each prop
  const parsedProps = props.map((prop) => {
    const idx = prop.indexOf(":");
    if (idx === -1) {
      // Not a valid "key: value", just return raw
      return prop;
    }
    const key = prop.slice(0, idx).trim();
    const val = prop.slice(idx + 1).trim();
    const parsedVal = parseFaunaType(val, mode);
    return `${key}: ${parsedVal}`;
  });

  return `{ ${parsedProps.join("; ")} }`;
}

/**
 * If top-level union: "Ref<User> | Ref<Account>", etc.
 */
function isTopLevelUnion(str: string): boolean {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "{" || c === "<") depth++;
    if (c === "}" || c === ">") depth--;
    if (c === "|" && depth === 0) {
      return true;
    }
  }
  return false;
}

function splitUnion(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "{" || c === "<") depth++;
    if (c === "}" || c === ">") depth--;
    if (c === "|" && depth === 0) {
      parts.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(str.slice(start).trim());
  return parts;
}

/**
 * Splits object-literal properties by commas at top-level only.
 * e.g. "name: String, nested: { foo: Int, bar: { qux: String } }, other: Boolean"
 */
function splitObjectProperties(inside: string): string[] {
  const props: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inside.length; i++) {
    const c = inside[i];
    if (c === "{" || c === "<") depth++;
    if (c === "}" || c === ">") depth--;
    if (c === "," && depth === 0) {
      props.push(inside.slice(start, i).trim());
      start = i + 1;
    }
  }
  props.push(inside.slice(start).trim());
  return props.filter(Boolean);
}
