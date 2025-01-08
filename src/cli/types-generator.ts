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
 * If a field doesn't have a signature, it is skipped with a warning logged.
 */
const createType = (
  name: string,
  fields: Fields,
  typeSuffix: "_Create" | "_FaunaCreate" | "" = ""
) => {
  // pick mode for parseFaunaType
  let mode: "main" | "create" | "faunaCreate" = "main";
  if (typeSuffix === "_Create") mode = "create";
  if (typeSuffix === "_FaunaCreate") mode = "faunaCreate";

  let typeStr = `type ${name}${typeSuffix} = {\n`;

  Object.entries(fields).forEach(([key, value]) => {
    // If no signature, skip and warn
    if (!value.signature) {
      console.warn(
        `Skipping field '${key}' in collection '${name}' because it has no signature.`
      );
      return; // Continue to next field
    }

    const isOptional = value.signature.endsWith("?");
    const optionalMark = isOptional ? "?" : "";

    // parseFaunaType with the selected mode
    const parsedType = parseFaunaType(value.signature, mode);
    typeStr += `\t${key}${optionalMark}: ${parsedType};\n`;
  });

  return typeStr.concat("};");
};

export const generateTypes = (
  schema: NamedDocument<Collection>[],
  options?: GenerateTypesOptions
) => {
  // Define final output folder
  const generatedTypesDirPath =
    options?.generatedTypesDirPath ||
    defaultGenerateTypeOptions.generatedTypesDirPath;

  // We always generate "custom.ts" now
  const customFileName = "custom.ts";

  // Root of user’s project
  const dir = process.cwd();

  let exportTypeStr = "export type {";
  let UserCollectionsTypeMappingStr = "interface UserCollectionsTypeMapping {";

  // Create types with fields and computed fields
  const fieldTypes = schema
    .map(({ name, fields, computed_fields }) => {
      if (!fields) return;

      // Merge fields + computed fields
      const fieldsData = computed_fields
        ? { ...fields, ...computed_fields }
        : fields;

      // Main type includes both fields + computed fields
      const genericTypes = createType(name, fieldsData);

      // CRUD variants only need base fields (not computed)
      // but you could also let them include computed fields if you like
      const crudTypeStr = createType(name, fields, "_Create");
      const faunaCrudTypeStr = createType(name, fields, "_FaunaCreate");

      exportTypeStr = exportTypeStr.concat(
        "\n\t",
        name,
        ",\n\t",
        `${name}_Create`,
        ",\n\t",
        `${name}_Update`,
        ",\n\t",
        `${name}_Replace`,
        ",\n\t",
        `${name}_FaunaCreate`,
        ",\n\t",
        `${name}_FaunaUpdate`,
        ",\n\t",
        `${name}_FaunaReplace`,
        ","
      );

      UserCollectionsTypeMappingStr = UserCollectionsTypeMappingStr.concat(
        "\n\t",
        `${name}: {`,
        "\n\t\t",
        `main: ${name};`,
        "\n\t\t",
        `create: ${name}_Create;`,
        "\n\t\t",
        `replace: ${name}_Replace;`,
        "\n\t\t",
        `update: ${name}_Update;`,
        "\n\t",
        "};"
      );

      return genericTypes.concat(
        "\n\n",
        crudTypeStr,
        "\n",
        `type ${name}_Replace = ${name}_Create;`,
        "\n",
        `type ${name}_Update = Partial<${name}_Create>;`,
        "\n\n",
        faunaCrudTypeStr,
        "\n",
        `type ${name}_FaunaReplace = ${name}_FaunaCreate;`,
        "\n",
        `type ${name}_FaunaUpdate = Partial<${name}_FaunaCreate>;`
      );
    })
    .filter(Boolean) // remove undefined
    .join("\n\n");

  // Build up the final custom.ts content
  const typesStr =
    "import { type TimeStub, type DateStub, type DocumentReference } from 'fauna';".concat(
      "\n\n",
      fieldTypes,
      "\n\n",
      `${UserCollectionsTypeMappingStr}\n}`,
      "\n\n",
      `${exportTypeStr}\n\tUserCollectionsTypeMapping\n};`,
      "\n"
    );

  // Ensure our output directory exists
  const outputDir = path.resolve(dir, generatedTypesDirPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`${generatedTypesDirPath} directory created successfully`);
  }

  // Write custom.ts
  const customFilePath = path.resolve(outputDir, customFileName);
  fs.writeFileSync(customFilePath, typesStr, { encoding: "utf-8" });
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
