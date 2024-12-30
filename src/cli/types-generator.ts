import fs from "fs";
import path from "path";
import type { Fields, NamedDocument, Collection } from "./system-types";

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

// Function to check if value is optional
const checkOptional = (value: string) => {
  return value.endsWith("?");
};

// Function to check signature of given data type
const checkDataType = (
  value: string,
  expectedType:
    | "String"
    | "Int"
    | "Long"
    | "Date"
    | "Boolean"
    | "Time"
    | "Null"
    | "Ref<"
    | "Array<"
) => {
  return value.startsWith(expectedType);
};

// Function to extract collection name from a signature string
const extractDataTypeFromNonPrimitiveSignature = (
  signatureType: "Ref" | "Array",
  signature: string
) => {
  const regex =
    signatureType === "Ref"
      ? /Ref<([^>]+)>/
      : /Array<([^<>]*(?:<(?:[^<>]+|<(?:[^<>]+)>)*>[^<>]*)*)>/;

  const match = signature.match(regex) as RegExpMatchArray;
  return match[1];
};

const constructTypeValue = (value: string, isArray: boolean) => {
  return isArray ? `Array<${value}>` : value;
};

const getFieldType = (
  value: string,
  isArray: boolean,
  typeSuffix: "_Create" | "_FaunaCreate" | "" = ""
) => {
  switch (true) {
    // String type
    case checkDataType(value, "String"):
      return constructTypeValue("string", isArray);

    // Boolean type
    case checkDataType(value, "Boolean"):
      return constructTypeValue("boolean", isArray);

    // Date type
    case checkDataType(value, "Date"):
      return constructTypeValue("DateStub", isArray);

    // Long / Int type
    case checkDataType(value, "Long"):
    case checkDataType(value, "Int"):
      return constructTypeValue("number", isArray);

    // Null type
    case checkDataType(value, "Null"):
      return constructTypeValue("null", isArray);

    // Time type
    case checkDataType(value, "Time"):
      return constructTypeValue("TimeStub", isArray);

    // Reference type
    case checkDataType(value, "Ref<"): {
      const collName = extractDataTypeFromNonPrimitiveSignature("Ref", value);
      const refType = typeSuffix
        ? typeSuffix === "_Create"
          ? `${collName} | DocumentReference`
          : "DocumentReference"
        : collName;
      return constructTypeValue(refType, isArray);
    }

    default:
      // Fallback for unknown/complex signatures
      return constructTypeValue(value, isArray);
  }
};

// Function to create a type string
const createType = (
  name: string,
  fields: Fields,
  typeSuffix: "_Create" | "_FaunaCreate" | "" = ""
) => {
  let typeStr = `type ${name}${typeSuffix} = {\n`;

  Object.entries(fields).forEach(([key, value]) => {
    const isArray = checkDataType(value.signature, "Array<");
    const optionalMark = checkOptional(value.signature) ? "?" : "";
    const signature = isArray
      ? `${extractDataTypeFromNonPrimitiveSignature(
          "Array",
          value.signature
        )}${optionalMark}`
      : value.signature;

    const keyWithOptionalMark = `${key}${optionalMark}`;

    // In case of union types
    const isUnionType = signature.includes("|");
    if (isUnionType) {
      const signatureTypes = signature.split("|");
      const types = signatureTypes.map((type) =>
        getFieldType(type.trim(), isArray, typeSuffix)
      );

      typeStr += `\t${keyWithOptionalMark}: ${types.join(" | ")};\n`;
    } else {
      typeStr += `\t${keyWithOptionalMark}: ${getFieldType(
        signature,
        isArray,
        typeSuffix
      )};\n`;
    }
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

      let genericTypes = "";
      if (computed_fields) {
        const fieldsData = { ...fields, ...computed_fields };
        genericTypes = createType(name, fieldsData);
      } else {
        genericTypes = createType(name, fields);
      }

      // CRUD variants
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
