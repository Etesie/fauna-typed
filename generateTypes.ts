import fs from 'fs';
import path from 'path';
import { Field, fetchSchema } from './src/lib/database/fetchSchema.svelte';

// Function to check if value is optional
const checkOptional = (value: string) => {
	return value.endsWith('?');
};

// Function to check if value type is primitive
const checkDataType = (
	value: string,
	expectedType: 'String' | 'Number' | 'Date' | 'Boolean' | 'Time' | 'Ref<' | 'Array<'
) => {
	return value.startsWith(expectedType);
};

// Function to extract collection name from a reference string
const extractDataTypeFromNonPrimitiveSignature = (
	signatureType: 'Ref' | 'Array',
	signature: string
) => {
	const regex =
		signatureType === 'Ref' ? /Ref<([^>]+)>/ : /Array<([^<>]*(?:(?:<[^<>]*>)+)?[^<>]*)>/;

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

// Function to create an interface string
const createInterface = (
	name: string,
	fields: Field,
	typeSuffix: '_Create' | '_FaunaCreate' | '' = ''
) => {
	let typeStr = `type ${name}${typeSuffix} = {\n`;

	Object.entries(fields).forEach(([key, value]) => {
		const isArray = checkDataType(value.signature, 'Array<');
		const optionalMark = checkOptional(value.signature) ? '?' : '';
		const signature = isArray
			? `${extractDataTypeFromNonPrimitiveSignature('Array', value.signature)}${optionalMark}`
			: value.signature;

		const keyWithOptionalMark = `${key}${optionalMark}`;

		switch (true) {
			// String type
			case checkDataType(signature, 'String'):
				typeStr += `\t${keyWithOptionalMark}: ${constructTypeValue('string', isArray)};\n`;
				break;

			// Boolean type
			case checkDataType(signature, 'Boolean'):
				typeStr += `\t${keyWithOptionalMark}: ${constructTypeValue('boolean', isArray)};\n`;
				break;

			// Date type
			case checkDataType(signature, 'Date'):
				typeStr += `\t${keyWithOptionalMark}: ${constructTypeValue('DateStub', isArray)};\n`;
				break;

			// Number type
			case checkDataType(signature, 'Number'):
				typeStr += `\t${keyWithOptionalMark}: ${constructTypeValue('number', isArray)};\n`;
				break;

			// Time type
			case checkDataType(signature, 'Time'):
				typeStr += `\t${keyWithOptionalMark}: ${constructTypeValue('TimeStub', isArray)};\n`;
				break;

			// Reference type
			case checkDataType(signature, 'Ref<'): {
				const collName = extractDataTypeFromNonPrimitiveSignature('Ref', signature);
				const refType = typeSuffix
					? typeSuffix === '_Create'
						? `${collName} | DocumentReference`
						: 'DocumentReference'
					: collName;

				typeStr += `\t${keyWithOptionalMark}: ${constructTypeValue(refType, isArray)};\n`;
				break;
			}

			default:
				typeStr += `\t${keyWithOptionalMark}: ${constructTypeValue(signature, isArray)};\n`;
				break;
		}
	});

	return typeStr.concat('};');
};

const generateTypedefs = async () => {
	try {
		const dir = `${process.cwd()}/`;

		const schema = await fetchSchema();

		let exportTypeStr = 'export type {';

		// Create types with fields and computed fields
		const fieldTypes = schema
			.map(({ name, fields, computed_fields }) => {
				let genericTypes = '';

				if (computed_fields) {
					const fieldsData = { ...fields, ...computed_fields };
					genericTypes = createInterface(name, fieldsData);
				} else {
					genericTypes = createInterface(name, fields);
				}

				const crudTypeStr = createInterface(name, fields, '_Create');
				const faunaCrudTypeStr = createInterface(name, fields, '_FaunaCreate');

				exportTypeStr = exportTypeStr.concat(
					'\n\t',
					name,
					',\n\t',
					`${name}_Create`,
					',\n\t',
					`${name}_Update`,
					',\n\t',
					`${name}_Replace`,
					',\n\t',
					`${name}_FaunaCreate`,
					',\n\t',
					`${name}_FaunaUpdate`,
					',\n\t',
					`${name}_FaunaReplace`,
					','
				);

				return genericTypes.concat(
					'\n\n',
					crudTypeStr,
					'\n',
					`type ${name}_Replace = ${name}_Create;`,
					'\n',
					`type ${name}_Update = Partial<${name}_Create>;`,
					'\n\n',
					faunaCrudTypeStr,
					'\n',
					`type ${name}_FaunaReplace = ${name}_FaunaCreate;`,
					'\n',
					`type ${name}_FaunaUpdate = Partial<${name}_FaunaCreate>;`
				);
			})
			.join('\n\n');

		const typesStr =
			"import { type TimeStub, type DateStub, type DocumentReference } from 'fauna';".concat(
				'\n\n',
				fieldTypes,
				'\n\n',
				`${exportTypeStr}\n};`
			);

		fs.writeFileSync(path.resolve(dir, `src/lib/types/generated/types.ts`), typesStr, {
			encoding: 'utf-8'
		});
	} catch (error) {
		console.log('error: ', error);
	}
};

generateTypedefs();
