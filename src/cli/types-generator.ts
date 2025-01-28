import fs from "fs";
import path from "path";
import type { Fields, NamedDocument, Collection } from "./system-types";
import { parseFaunaType, ParseMode } from "./parseFaunaType";

type GenerateTypesOptions = {
  /**
   * Directory to place generated files.
   * Defaults to "fauna-types".
   */
  generatedTypesDirPath?: string;
};

const defaultGenerateTypeOptions = {
  generatedTypesDirPath: "fauna-types",
};

/**
 * Create a TypeScript type definition for a given collection name and fields.
 *
 * @param name The name of the collection (e.g. "Account")
 * @param fields The fields to be included in the generated type.
 * @param suffix e.g. "_Create" or "" — appended to the type's name.
 * @param mode "main" | "create" | "update" | "replace"
 */
const createType = (
  name: string,
  fields: Fields,
  suffix: string,
  mode: ParseMode
): string => {
  // We'll gather each field’s type string.
  const lines: string[] = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (!value.signature) {
      console.warn(
        `Skipping field '${key}' in collection '${name}' because it has no signature.`
      );
      return;
    }

    // parseFaunaType returns the TS type, applying references => Document / Document_Create etc.
    const parsedType = parseFaunaType(value.signature, mode);
    lines.push(`  ${key}: ${parsedType};`);
  });

  // For "update" mode, we likely want a Partial of all fields
  // Because an Update in Fauna can supply just some fields
  if (mode === "update") {
    // We wrap in Partial
    return `
type ${name}${suffix} = Partial<{
${lines.join("\n")}
}>;`.trim();
  }

  // If it's "replace", typically it's the full object, just references become Document_Replace
  // If it's "create", references become Document_Create
  // If it's "main", references become Document
  // No partial needed for "create"/"replace" by default.
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
      // Make sure both fields & computed_fields are non-undefined
      const safeFields = fields ?? {};
      const safeComputed = computed_fields ?? {};

      const allFields = { ...safeFields, ...safeComputed };

      const mainTypeStr = createType(name, allFields, "", "main");
      const createTypeStr = createType(name, safeFields, "_Create", "create");
      const replaceTypeStr = createType(
        name,
        safeFields,
        "_Replace",
        "replace"
      );
      const updateTypeStr = createType(name, safeFields, "_Update", "update");

      // Add them to our final export statements
      exportTypeStr += `
  ${name},
  ${name}_Create,
  ${name}_Replace,
  ${name}_Update,`;

      // Add them to the mapping interface
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

  // Build up the final custom.ts content
  const typesFileContent = `import type { TimeStub, DateStub, DocumentReference } from 'fauna';
import type { Document, Document_Create, Document_Replace, Document_Update } from './system';

${fieldTypes}

${UserCollectionsTypeMappingStr}
}

${exportTypeStr}
  UserCollectionsTypeMapping
};
`;

  // Make sure directory exists
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
