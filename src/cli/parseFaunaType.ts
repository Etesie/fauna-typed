export type ParseMode = 'main' | 'create' | 'update' | 'replace';

// We'll return both the parsed type and a boolean isOptional.
export interface ParsedResult {
  type: string;
  isOptional: boolean;
}

/**
 * Recursively parse a Fauna type signature to a TS type, returning:
 *   - type: the TypeScript type string
 *   - isOptional: boolean for whether the original field had a trailing '?'
 */
export function parseFaunaType(signature: string, mode: ParseMode): ParsedResult {
  let trimmed = signature.trim();

  // 1) Track if it ends with '?'
  const isOptional = trimmed.endsWith('?');
  if (isOptional) {
    trimmed = trimmed.slice(0, -1).trim(); // remove the trailing '?'
  }

  // 2) Handle unions like "Ref<User> | Ref<Account>"
  if (isTopLevelUnion(trimmed)) {
    const parts = splitUnion(trimmed);
    const unionTypes = parts
      .map((part) => parseFaunaType(part, mode).type) // parse each piece
      .join(' | ');
    // We'll return that entire union as the type, but keep isOptional as derived
    // from the original question mark.
    return { type: unionTypes, isOptional };
  }

  // 3) Check if it's an object literal => starts with '{' and ends with '}'
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const objType = parseFaunaObjectLiteral(trimmed, mode);
    return { type: objType, isOptional };
  }

  // 4) Arrays => "Array<...>"
  if (trimmed.startsWith('Array<') && trimmed.endsWith('>')) {
    const inside = trimmed.slice('Array<'.length, -1).trim();
    const { type: innerType } = parseFaunaType(inside, mode);
    return { type: `Array<${innerType}>`, isOptional };
  }

  // 5) References => "Ref<Foo>"
  if (trimmed.startsWith('Ref<') && trimmed.endsWith('>')) {
    const inside = trimmed.slice(4, -1).trim(); // e.g. "User"
    let result: string = inside;

    switch (mode) {
      case 'main':
        // Ref<User> => Document<User>
        result = `Document<${inside}>`;
        break;
      case 'create':
        // Ref<User> => Document_Create<User_Create>
        result = `Document_Create<${inside}_Create>`;
        break;
      case 'update':
        // Ref<User> => Document_Update<User_Update>
        result = `Document_Update<${inside}_Update>`;
        break;
      case 'replace':
        // Ref<User> => Document_Replace<User_Replace>
        result = `Document_Replace<${inside}_Replace>`;
        break;
    }

    return { type: result, isOptional };
  }

  // 6) Convert known Fauna scalars => TS scalars
  const convertedScalar = convertScalar(trimmed);
  if (convertedScalar) {
    return { type: convertedScalar, isOptional };
  }

  // 7) If we can't parse it, just return as-is
  return { type: trimmed, isOptional };
}

/** Convert Fauna scalar => TS scalar */
function convertScalar(faunaType: string): string | null {
  switch (faunaType) {
    case 'String':
      return 'string';
    case 'Boolean':
      return 'boolean';
    case 'Long':
    case 'Int':
      return 'number';
    case 'Time':
    case 'Timestamp':
      return 'TimeStub';
    case 'Date':
      return 'DateStub';
    case 'Null':
      return 'null';
    default:
      return null;
  }
}

/** If top-level union: "Ref<User> | Ref<Account>" */
function isTopLevelUnion(str: string): boolean {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '{' || c === '<') depth++;
    if (c === '}' || c === '>') depth--;
    if (c === '|' && depth === 0) {
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
    if (c === '{' || c === '<') depth++;
    if (c === '}' || c === '>') depth--;
    if (c === '|' && depth === 0) {
      parts.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(str.slice(start).trim());
  return parts;
}

/** Parse an object literal { ... } */
function parseFaunaObjectLiteral(objSignature: string, mode: ParseMode): string {
  // remove outer braces
  const inside = objSignature.slice(1, -1).trim();
  const props = splitObjectProperties(inside);

  const parsedProps = props.map((prop) => {
    const idx = prop.indexOf(':');
    if (idx === -1) {
      // Not valid key: value
      return prop;
    }
    const key = prop.slice(0, idx).trim();
    const val = prop.slice(idx + 1).trim();

    const { type } = parseFaunaType(val, mode);
    return `${key}: ${type}`;
  });

  return `{ ${parsedProps.join('; ')} }`;
}

/** Splits object-literal properties by commas at top-level only. */
function splitObjectProperties(inside: string): string[] {
  const props: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inside.length; i++) {
    const c = inside[i];
    if (c === '{' || c === '<') depth++;
    if (c === '}' || c === '>') depth--;
    if (c === ',' && depth === 0) {
      props.push(inside.slice(start, i).trim());
      start = i + 1;
    }
  }
  props.push(inside.slice(start).trim());
  return props.filter(Boolean);
}
