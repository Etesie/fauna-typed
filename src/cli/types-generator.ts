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
    const { type, isOptional } = parseFaunaType(value.signature, mode);
    lines.push(`  ${key}${isOptional ? "?" : ""}: ${type};`);
  });

  // Build the inner object literal as a string
  const innerTypeBody = `{
    ${lines.join("\n")}
  }`;

  // Depending on the mode, wrap the type with the appropriate generic
  switch (mode) {
    case "main":
      return `\ntype ${name}${suffix} = Document<${innerTypeBody}>;`;
    case "create":
      return `\ntype ${name}${suffix} = Document_Create<${innerTypeBody}>;`;
    case "replace":
      return `\ntype ${name}${suffix} = Document_Replace<${innerTypeBody}>;`;
    case "update":
      return `\ntype ${name}${suffix} = Document_Update<Partial<${innerTypeBody}>>;`;
    default:
      return "";
  }
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
      // Safely default
      const safeFields = fields ?? {};
      const safeComputed = computed_fields ?? {};
      const allFields = { ...safeFields, ...safeComputed };

      // main
      const mainTypeStr = createType(name, allFields, "", "main");
      // create
      const createTypeStr = createType(name, safeFields, "_Create", "create");
      // replace
      const replaceTypeStr = createType(
        name,
        safeFields,
        "_Replace",
        "replace"
      );
      // update
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

  // Compose final file content:
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
  fs.writeFileSync(customFilePath, typesFileContent, "utf-8");
  console.log(`custom.ts generated successfully at ${generatedTypesDirPath}`);

  // Copy system-types.ts => system.ts
  const sourceSystemTypesTs = path.resolve(__dirname, "system-types.ts");
  const destSystemTypes = path.resolve(outputDir, "system.ts");

  if (fs.existsSync(sourceSystemTypesTs)) {
    fs.copyFileSync(sourceSystemTypesTs, destSystemTypes);
    console.log(`system.ts copied successfully to ${generatedTypesDirPath}`);
  } else {
    console.error(
      `system-types.ts not found at ${sourceSystemTypesTs}. Please create an issue.`
    );
    process.exit(1);
  }

  return {
    message: `Types generated successfully! Files created:\n- ${customFileName}\n- system.ts`,
  };
};
