import fs from "fs";
import path from "path";
import type { Collection } from "./system-types";
import { parseFaunaType, ParseMode } from "./parseFaunaType";

type GenerateTypesOptions = {
  generatedTypesDirPath?: string;
};

const defaultGenerateTypeOptions = {
  generatedTypesDirPath: "fauna-typed",
};

/**
 * Generate an Arktype fields block for a single mode (main, create, update, replace).
 */
function generateArktypeFields(
  fields: Record<string, { signature: string }>,
  mode: ParseMode
): string {
  const lines: string[] = [];
  for (const [key, { signature }] of Object.entries(fields)) {
    if (!signature) {
      console.warn(`Skipping field '${key}' because it has no signature.`);
      continue;
    }
    const { type, isOptional } = parseFaunaType(signature, mode);
    // If mode=update or isOptional => add a '?' to the property key
    const keyOut = (mode === "update" || isOptional)
      ? JSON.stringify(`${key}?`)  // e.g.  "user?"
      : key;
    lines.push(`  ${keyOut}: ${type},`);
  }
  return `{\n${lines.join("\n")}\n}`;
}

export function generateTypes(schema: Collection[], options?: GenerateTypesOptions) {
  const generatedTypesDirPath =
    options?.generatedTypesDirPath || defaultGenerateTypeOptions.generatedTypesDirPath;

  const customFileName = "custom.ts";
  const outputDir = path.resolve(process.cwd(), generatedTypesDirPath);

  // 1) Gather collections
  const collectionsData = schema.map(({ name, fields, computed_fields }) => {
    return {
      name,
      fields: fields ?? {},
      computed: computed_fields ?? {}
    };
  });

  // 2) Prepare each collection's main/create/update/replace scope lines
  const scopes = {
    main: [] as string[],
    create: [] as string[],
    update: [] as string[],
    replace: [] as string[]
  } as const;

  function toPropertyKey(name: string) {
    return name.charAt(0).toLowerCase() + name.slice(1);
  }

  const modeBases: Record<ParseMode, string> = {
    main: "v.document.read",
    create: "v.document.create",
    update: "v.document.update",
    replace: "v.document.replace"
  };

  for (const { name, fields, computed } of collectionsData) {
    const propKey = toPropertyKey(name);

    // For each mode, parse the fields
    for (const mode of ["main", "create", "update", "replace"] as const) {
      // main => fields + computed
      const fieldsForMode = (mode === "main")
        ? { ...fields, ...computed }
        : fields;
      const arktypeBlock = generateArktypeFields(fieldsForMode, mode);
      const base = modeBases[mode];
      scopes[mode].push(`  ${propKey}: [${base}, "&", ${arktypeBlock}],`);
    }
  }

  function scopeBlock(mode: ParseMode) {
    return `const types${mode === "main" ? "" : "_" + mode} = scope({
${scopes[mode].join("\n")}
}).export();\n`;
  }

  // 3) Build the final types file
  const typeAliases = collectionsData.map(({ name }) => {
    const k = toPropertyKey(name);
    return `type ${name} = typeof types.${k}.infer;
type ${name}_Create = typeof types_create.${k}.infer;
type ${name}_Update = typeof types_update.${k}.infer;
type ${name}_Replace = typeof types_replace.${k}.infer;`;
  }).join("\n\n");

  const mappingEntries = collectionsData.map(({ name }) => `
  ${name}: {
    main: ${name};
    create: ${name}_Create;
    replace: ${name}_Replace;
    update: ${name}_Update;
  };`
  ).join("\n");

  const validatorEntries = collectionsData.map(({ name }) => {
    const k = toPropertyKey(name);
    return `  ${k}: {
    read: types.${k},
    create: types_create.${k},
    update: types_update.${k},
    replace: types_replace.${k},
  }`;
  }).join(",\n");

  const exportTypes = collectionsData.map(({ name }) => {
    return `${name}, ${name}_Create, ${name}_Replace, ${name}_Update,`;
  }).join("\n  ");

  const fileContent = `import { type TimeStub, type DateStub } from "fauna";
import { v } from "./system";

import { scope, type } from "arktype";

${scopeBlock("main")}
${scopeBlock("create")}
${scopeBlock("update")}
${scopeBlock("replace")}

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

  // Ensure output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`${generatedTypesDirPath} created`);
  }

  // Write custom.ts
  fs.writeFileSync(path.join(outputDir, customFileName), fileContent, "utf-8");
  console.log(`custom.ts written in ${generatedTypesDirPath}`);

  // Copy system-types => system.ts
  const src = path.resolve(__dirname, "system-types.ts");
  const dest = path.join(outputDir, "system.ts");
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`system.ts copied to ${generatedTypesDirPath}`);
  } else {
    console.warn("system-types.ts not found at", src);
  }

  return { message: "Type generation complete." };
}
