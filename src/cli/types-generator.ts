import fs from "fs";
import path from "path";
import type { Collection } from "./system-types";
import { parseFaunaType, ParseMode } from "./parseFaunaType";

type GenerateTypesOptions = {
  generatedTypesDirPath?: string;
};

const defaultGenerateTypeOptions = {
  generatedTypesDirPath: "fauna-types",
};

/**
 * Helper: Format an object literal string.
 * 
 * For a raw input like:
 *   { name: "Github" | "Google" | "Facebook"; userId: string; email: string }
 * 
 * In update mode (optionalKeys true), every property key is wrapped in quotes with a trailing "?".
 * Expected update output:
 *   { "name?": "'Github' | 'Google' | 'Facebook'", "userId?": "string", "email?": "string" }
 * 
 * In non‑update mode, keys are left unquoted:
 *   { name: "'Github' | 'Google' | 'Facebook'", userId: "string", email: "string" }
 * 
 * Also, if a value starts with "createRef(" or "v.createRef(", it is always returned as a reference expression
 * prefixed with "v.createRef(".
 */
function formatObjectLiteral(raw: string, optionalKeys: boolean = false): string {
  // Remove the outer braces.
  let inner = raw.slice(1, -1).trim();
  // Replace semicolons with commas.
  inner = inner.replace(/;/g, ",");
  // Split into parts on commas (assumes a flat structure).
  let parts = inner.split(",").map(s => s.trim()).filter(Boolean);
  let formattedParts = parts.map(part => {
    const colonIndex = part.indexOf(":");
    if (colonIndex === -1) return part;
    let key = part.slice(0, colonIndex).trim();
    let val = part.slice(colonIndex + 1).trim();
    // In update mode, ensure key ends with "?" and wrap it in quotes.
    const keyOut = optionalKeys
      ? JSON.stringify(key.endsWith("?") ? key : key + "?")
      : key;
    // If the value is a union (contains "|"), process each member.
    if (val.includes("|")) {
      const unionParts = val.split("|").map(p => {
        p = p.trim();
        if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
          p = p.slice(1, -1);
        }
        return `'${p}'`;
      });
      const unionStr = unionParts.join(" | ");
      return `${keyOut}: "${unionStr}"`;
    } else if (val.startsWith("createRef(") || val.startsWith("v.createRef(")) {
      // Ensure the value is always prefixed with "v.createRef(".
      const refExpr = val.startsWith("v.createRef(") ? val : "v." + val;
      return `${keyOut}: ${refExpr}`;
    } else {
      // Otherwise, if not already quoted, then quote it.
      if (val.startsWith('"') || val.startsWith("'")) {
        return `${keyOut}: ${val}`;
      } else {
        return `${keyOut}: "${val}"`;
      }
    }
  });
  return `{ ${formattedParts.join(", ")} }`;
}

/**
 * Helper: Format a parsed type.
 * - If the type is an object literal, call formatObjectLiteral (with optionalKeys true in update mode).
 * - In non‑main modes, if the type is a reference snippet (starting with "createRef("), ensure it’s prefixed with "v.".
 * - If the type contains a union operator ("|") (and is not an object literal), replace double quotes with single quotes and wrap in double quotes.
 * - Otherwise, wrap plain scalars in double quotes.
 */
function formatType(mode: ParseMode, raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return formatObjectLiteral(trimmed, mode === "update");
  }
  if (mode !== "main") {
    if (trimmed.startsWith("createRef(")) {
      return trimmed.startsWith("v.createRef(") ? trimmed : "v." + trimmed;
    }
    if (trimmed.endsWith(").array()") && trimmed.startsWith("createRef(")) {
      return trimmed.startsWith("v.createRef(") ? trimmed : "v." + trimmed;
    }
  }
  if (trimmed.includes("|")) {
    return `"${trimmed.replace(/"/g, "'")}"`;
  }
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    return trimmed;
  }
  return `"${trimmed}"`;
}

/**
 * Generate an Arktype fields block given a record of fields.
 */
const generateArktypeFields = (
  fields: Record<string, { signature: string }>,
  mode: ParseMode
): string => {
  const lines: string[] = [];
  Object.entries(fields).forEach(([key, value]) => {
    if (!value.signature) {
      console.warn(`Skipping field '${key}' because it has no signature.`);
      return;
    }
    const { type, isOptional } = parseFaunaType(value.signature, mode);
    const formattedType = formatType(mode, type);
    // For update mode, force top-level keys to be optional (wrapped in quotes).
    const keyOutput =
      mode === "update"
        ? JSON.stringify(key + "?")
        : (isOptional ? JSON.stringify(key + "?") : key);
    lines.push(`  ${keyOutput}: ${formattedType},`);
  });
  return `{\n${lines.join("\n")}\n}`;
};

export const generateTypes = (
  schema: Collection[],
  options?: GenerateTypesOptions
) => {
  const generatedTypesDirPath =
    options?.generatedTypesDirPath || defaultGenerateTypeOptions.generatedTypesDirPath;
  const customFileName = "custom.ts";
  const dir = process.cwd();

  // Use all collections from the provided schema.
  const collectionsData = schema.map(({ name, fields, computed_fields }) => {
    const safeFields = fields ?? {};
    const safeComputed = computed_fields ?? {};
    return { name, fields: safeFields, computed: safeComputed };
  });

  // Use all collections without reordering.
  const scopeCollections = collectionsData;
  const mappingCollections = collectionsData;

  // Helper: convert a collection name (e.g. "User") to a property key (e.g. "user")
  const toPropertyKey = (name: string) =>
    name.charAt(0).toLowerCase() + name.slice(1);

  // Define mode bases using the validator "v" export.
  const modeBases: Record<ParseMode, string> = {
    main: "v.document.read",
    create: "v.document.create",
    update: "v.document.update",
    replace: "v.document.replace",
  };

  // Build scope blocks for each mode.
  const modes: Record<ParseMode, string[]> = {
    main: [],
    create: [],
    update: [],
    replace: [],
  };

  scopeCollections.forEach(({ name, fields, computed }) => {
    const key = toPropertyKey(name);
    (Object.keys(modeBases) as ParseMode[]).forEach(mode => {
      const fieldsForMode = mode === "main" ? { ...fields, ...computed } : fields;
      const valueStr = `[${modeBases[mode]}, "&", ${generateArktypeFields(fieldsForMode, mode)}]`;
      modes[mode].push(`  ${key}: ${valueStr},`);
    });
  });

  const scopeBlocksText = (mode: ParseMode) => {
    return `const types${mode === "main" ? "" : "_" + mode} = scope({
${modes[mode].join("\n")}
}).export();\n`;
  };

  // Generate type aliases.
  const typeAliases = scopeCollections
    .map(({ name }) => {
      const key = toPropertyKey(name);
      return `type ${name} = typeof types.${key}.infer;
type ${name}_Create = typeof types_create.${key}.infer;
type ${name}_Update = typeof types_update.${key}.infer;
type ${name}_Replace = typeof types_replace.${key}.infer;`;
    })
    .join("\n\n");

  // Generate the mapping interface.
  const mappingEntries = mappingCollections
    .map(({ name }) => {
      return `  ${name}: {
    main: ${name};
    create: ${name}_Create;
    replace: ${name}_Replace;
    update: ${name}_Update;
  };`;
    })
    .join("\n");

  // Generate the validator object.
  const validatorEntries = scopeCollections
    .map(({ name }) => {
      const key = toPropertyKey(name);
      return `  ${key}: {
    read: types.${key},
    create: types_create.${key},
    update: types_update.${key},
    replace: types_replace.${key},
  }`;
    })
    .join(",\n");

  // Generate export types.
  const exportTypes = mappingCollections
    .map(({ name }) => {
      return `${name}, ${name}_Create, ${name}_Replace, ${name}_Update,`;
    })
    .join("\n  ");

  const typesFileContent = `import { type TimeStub, type DateStub } from "fauna";
import { v } from "./system";

import { scope, type } from "arktype";

${scopeBlocksText("main")}
${scopeBlocksText("create")}
${scopeBlocksText("update")}
${scopeBlocksText("replace")}

${typeAliases}

interface UserCollectionsTypeMapping {
${mappingEntries}
}

const validator = {
${validatorEntries}
};

export type {
  validator,
  validator as v,
  ${exportTypes}
  UserCollectionsTypeMapping,
};
`;

  // Ensure the output directory exists.
  const outputDir = path.resolve(dir, generatedTypesDirPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`${generatedTypesDirPath} directory created successfully`);
  }

  // Write the custom.ts file.
  const customFilePath = path.resolve(outputDir, customFileName);
  fs.writeFileSync(customFilePath, typesFileContent, "utf-8");
  console.log(`custom.ts generated successfully at ${generatedTypesDirPath}`);

  // Copy system-types.ts → system.ts (assumes your system-types.ts is updated with Arktype code)
  const sourceSystemTypesTs = path.resolve(__dirname, "system-types.ts");
  const destSystemTypes = path.resolve(outputDir, "system.ts");

  if (fs.existsSync(sourceSystemTypesTs)) {
    fs.copyFileSync(sourceSystemTypesTs, destSystemTypes);
    console.log(`system.ts copied successfully to ${generatedTypesDirPath}`);
  } else {
    console.error(`system-types.ts not found at ${sourceSystemTypesTs}. Please create an issue.`);
    process.exit(1);
  }

  return {
    message: `Types generated successfully! Files created:\n- ${customFileName}\n- system.ts`,
  };
};
