import fs from "fs";
import path from "path";
import type { Fields, NamedDocument, Collection } from "./system-types";
import { parseFaunaType, ParseMode } from "./parseFaunaType";

type GenerateTypesOptions = {
  generatedTypesDirPath?: string;
};

const defaultGenerateTypeOptions = {
  generatedTypesDirPath: "fauna-types",
};

const createType = (
  name: string,
  fields: Fields,
  suffix: string,
  mode: ParseMode
): string => {
  const lines: string[] = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (!value.signature) {
      console.warn(
        `Skipping field '${key}' in collection '${name}' because it has no signature.`
      );
      return;
    }

    // parseFaunaType -> returns { type, isOptional }
    const { type, isOptional } = parseFaunaType(value.signature, mode);
    // If isOptional => use question mark in the property name
    lines.push(`  ${key}${isOptional ? '?' : ''}: ${type};`);
  });

  // For "update" mode, we might wrap the entire object in Partial<...>
  if (mode === 'update') {
    return `
type ${name}${suffix} = Partial<{
${lines.join("\n")}
}>;`.trim();
  }

  // For "main", "create", "replace"
  return `
type ${name}${suffix} = {
${lines.join("\n")}
};`.trim();
};

export const generateTypes = (
  schema: NamedDocument<Collection>[],
  options?: GenerateTypesOptions
) => {
  const generatedTypesDirPath =
    options?.generatedTypesDirPath ||
    defaultGenerateTypeOptions.generatedTypesDirPath;

  const customFileName = "custom.ts";
  const dir = process.cwd();

  let exportTypeStr = "export type {";
  let UserCollectionsTypeMappingStr = "interface UserCollectionsTypeMapping {";

  const fieldTypes = schema
    .map(({ name, fields, computed_fields }) => {
      // Safely default fields/computed_fields to empty objects if undefined
      const safeFields = fields ?? {};
      const safeComputedFields = computed_fields ?? {};
      const allFields = { ...safeFields, ...safeComputedFields };

      // 1) main
      const mainTypeStr = createType(name, allFields, "", "main");
      // 2) create
      const createTypeStr = createType(name, safeFields, "_Create", "create");
      // 3) replace
      const replaceTypeStr = createType(name, safeFields, "_Replace", "replace");
      // 4) update
      const updateTypeStr = createType(name, safeFields, "_Update", "update");

      exportTypeStr += `
  ${name},
  ${name}_Create,
  ${name}_Replace,
  ${name}_Update,`;

      UserCollectionsTypeMappingStr += `
  ${name}: {
    main: ${name};
    create: ${name}_Create;
    replace: ${name}_Replace;
    update: ${name}_Update;
  };`;

      return [
        mainTypeStr,
        "",
        createTypeStr,
        "",
        replaceTypeStr,
        "",
        updateTypeStr,
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");

  // Build final content
  const typesFileContent = `
import type { TimeStub, DateStub, DocumentReference } from 'fauna';
import type { Document, Document_Create, Document_Update, Document_Replace } from './system';

${fieldTypes}

${UserCollectionsTypeMappingStr}
}

${exportTypeStr}
  UserCollectionsTypeMapping
};
`;

  // Ensure directory
  const outputDir = path.resolve(dir, generatedTypesDirPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`${generatedTypesDirPath} directory created successfully`);
  }

  // Write custom.ts
  const customFilePath = path.resolve(outputDir, customFileName);
  fs.writeFileSync(customFilePath, typesFileContent, { encoding: "utf-8" });
  console.log(`custom.ts generated successfully at ${generatedTypesDirPath}`);

  // Copy system-types.ts => system.ts
  const sourceSystemTypesTs = path.resolve(__dirname, "system-types.ts");
  const destSystemTypes = path.resolve(outputDir, "system.ts");

  if (fs.existsSync(sourceSystemTypesTs)) {
    fs.copyFileSync(sourceSystemTypesTs, destSystemTypes);
    console.log(`system.ts copied successfully to ${generatedTypesDirPath}`);
  } else {
    console.error(
      `system-types.ts not found at ${sourceSystemTypesTs}. Please create an issue in the fauna-typed GitHub repository.`
    );
    process.exit(1);
  }

  return {
    message: `Types generated successfully! Files created:\n- ${customFileName}\n- system.ts`,
  };
};
