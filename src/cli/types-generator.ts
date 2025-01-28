import fs from "fs";
import path from "path";
import type { Fields, NamedDocument, Collection } from "./system-types";
import { parseFaunaType } from "./parseFaunaType";

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
 * @param mode "main" for domain references, "create" for DocumentReference
 */
const createType = (
  name: string,
  fields: Fields,
  suffix: string,
  mode: "main" | "create"
) => {
  let typeStr = `type ${name}${suffix} = {\n`;

  Object.entries(fields).forEach(([key, value]) => {
    if (!value.signature) {
      console.warn(
        `Skipping field '${key}' in collection '${name}' because it has no signature.`
      );
      return;
    }
    const isOptional = value.signature.endsWith("?");
    const optionalMark = isOptional ? "?" : "";

    const parsedType = parseFaunaType(value.signature, mode);
    typeStr += `\t${key}${optionalMark}: ${parsedType};\n`;
  });

  return typeStr + "};";
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
      if (!fields) return null;

      // Combine normal fields + computed fields for the main type
      const allFields = computed_fields ? { ...fields, ...computed_fields } : fields;
      const mainTypeStr = createType(name, allFields, "", "main");

      // For _Create/_Replace/_Update, we only want the "base" fields (not computed?)
      // Up to you whether you include computed fields for create. Typically you don't.
      const createTypeStr = createType(name, fields, "_Create", "create");

      const combined = [
        mainTypeStr,
        "",
        createTypeStr,
        `type ${name}_Replace = ${name}_Create;`,
        `type ${name}_Update = Partial<${name}_Create>;`,
      ].join("\n");

      // Add them to our final export statements
      exportTypeStr += `
\t${name},
\t${name}_Create,
\t${name}_Replace,
\t${name}_Update,`;

      // Add them to the mapping interface
      UserCollectionsTypeMappingStr += `
\t${name}: {
\t\tmain: ${name};
\t\tcreate: ${name}_Create;
\t\treplace: ${name}_Replace;
\t\tupdate: ${name}_Update;
\t};`;

      return combined;
    })
    .filter(Boolean)
    .join("\n\n");

  // Build up the final custom.ts content
  const typesFileContent = `
import { type TimeStub, type DateStub, type DocumentReference } from 'fauna';

${fieldTypes}

${UserCollectionsTypeMappingStr}
}

${exportTypeStr}
\tUserCollectionsTypeMapping
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
