export type ParseMode = 'main' | 'create' | 'update' | 'replace';

export interface ParsedResult {
  type: string;
  isOptional: boolean;
}

export function parseFaunaType(signature: string, mode: ParseMode): ParsedResult {
  let trimmed = signature.trim();

  // 1) Check if ends with '?'
  const isOptional = trimmed.endsWith('?');
  if (isOptional) {
    trimmed = trimmed.slice(0, -1).trim();
  }

  // 2) If top-level union
  if (isTopLevelUnion(trimmed)) {
    const parts = splitUnion(trimmed);
    const unionType = parts
      .map((part) => parseFaunaType(part, mode).type)
      .join(' | ');
    return { type: unionType, isOptional };
  }

  // 3) Object literal { ... }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return { type: parseFaunaObjectLiteral(trimmed, mode), isOptional };
  }

  // 4) Arrays: Array<...>
  if (trimmed.startsWith('Array<') && trimmed.endsWith('>')) {
    const inside = trimmed.slice('Array<'.length, -1).trim();
    const { type: innerType } = parseFaunaType(inside, mode);
    return { type: `Array<${innerType}>`, isOptional };
  }

  // 5) References: "Ref<Foo>"
  if (trimmed.startsWith('Ref<') && trimmed.endsWith('>')) {
    if (mode === 'main') {
      // for main type => Document<Foo>
      const inside = trimmed.slice(4, -1).trim();
      return { type: `Document<${inside}>`, isOptional };
    } else {
      // for create, update, replace => DocumentReference
      return { type: 'DocumentReference', isOptional };
    }
  }

  // 6) Convert known scalars
  const scalar = convertScalar(trimmed);
  if (scalar) {
    return { type: scalar, isOptional };
  }

  // 7) Fallback
  return { type: trimmed, isOptional };
}

/** e.g. "String" => "string", "Long" => "number", etc. */
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

function parseFaunaObjectLiteral(objSignature: string, mode: ParseMode): string {
  const inside = objSignature.slice(1, -1).trim();
  const props = splitObjectProperties(inside);

  const parsedProps = props.map((prop) => {
    const idx = prop.indexOf(':');
    if (idx === -1) return prop;

    const key = prop.slice(0, idx).trim();
    const val = prop.slice(idx + 1).trim();
    const { type } = parseFaunaType(val, mode);
    return `${key}: ${type}`;
  });

  return `{ ${parsedProps.join('; ')} }`;
}

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
