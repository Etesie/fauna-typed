import fs from "fs";
import path from "path";
import type { Fields, NamedDocument, Collection } from "./system-types";

type GenerateTypesOptions = {
  generatedTypesDirPath?: string;
  generatedTypesFileName?: string;
};

const defaultGenerateTypeOptions = {
  generatedTypesDirPath: "fauna-types",
  generatedTypesFileName: "custom.ts",
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
  if (isArray) {
    return `Array<${value}>`;
  } else {
    return value;
  }
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

    // Long type
    case checkDataType(value, "Long"):
      return constructTypeValue("number", isArray);

    // Long type
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
  const generatedTypesDirPath =
    options?.generatedTypesDirPath ||
    defaultGenerateTypeOptions.generatedTypesDirPath;
  const generatedTypesFileName =
    options?.generatedTypesFileName ||
    defaultGenerateTypeOptions.generatedTypesFileName;
  const dir = `${process.cwd()}/`;
  let exportTypeStr = "export type {";
  let UserCollectionsTypeMappingStr = "interface UserCollectionsTypeMapping {";

  // Create types with fields and computed fields
  const fieldTypes = schema
    .map(({ name, fields, computed_fields }) => {
      if (fields) {
        let genericTypes = "";

        if (computed_fields) {
          const fieldsData = { ...fields, ...computed_fields };
          genericTypes = createType(name, fieldsData);
        } else {
          genericTypes = createType(name, fields);
        }

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
      }
    })
    .join("\n\n");

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

  if (!fs.existsSync(path.resolve(dir, generatedTypesDirPath))) {
    fs.mkdirSync(path.resolve(dir, generatedTypesDirPath), { recursive: true });
    console.log(`${generatedTypesDirPath} directory created successfully`);
  }

  fs.writeFileSync(
    path.resolve(dir, `${generatedTypesDirPath}/${generatedTypesFileName}`),
    typesStr,
    {
      encoding: "utf-8",
    }
  );

  return { message: "Types generated successfully" };
};
