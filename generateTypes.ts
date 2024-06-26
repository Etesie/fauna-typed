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
	expectedType: 'String' | 'Number' | 'Date' | 'Boolean' | 'Time' | 'Ref<'
) => {
	return value.startsWith(expectedType);
};

// Function to extract collection name from a reference string
const extractCollectionNameFromRef = (ref: string) => {
	const regex = /Ref<([^>]+)>/;
	const match = ref.match(regex) as RegExpMatchArray;

	return match[1];
};

// Function to create an interface string
const createInterface = (
	name: string,
	fields: Field,
	typeSuffix: '_Create' | '_FaunaCreate' | '' = ''
) => {
	let typeStr = `export type ${name}${typeSuffix} = {\n`;

	Object.entries(fields).forEach(([key, value]) => {
		const signature = value.signature;
		const optionalMark = checkOptional(value.signature) ? '?' : '';

		const keyWithOptionalMark = `${key}${optionalMark}`;

		// TODO: add logic to check if the field is an array

		switch (true) {
			// String type
			case checkDataType(value.signature, 'String'):
				typeStr += `\t${keyWithOptionalMark}: string;\n`;
				break;

			// Boolean type
			case checkDataType(value.signature, 'Boolean'):
				typeStr += `\t${keyWithOptionalMark}: bool;\n`;
				break;

			// Date type
			case checkDataType(value.signature, 'Date'):
				typeStr += `\t${keyWithOptionalMark}: DateStub;\n`;
				break;

			// Number type
			case checkDataType(value.signature, 'Number'):
				typeStr += `\t${keyWithOptionalMark}: number;\n`;
				break;

			// Time type
			case checkDataType(value.signature, 'Time'):
				typeStr += `\t${keyWithOptionalMark}: TimeStub;\n`;
				break;

			// Reference type
			case checkDataType(value.signature, 'Ref<'):
				typeStr += `\t${keyWithOptionalMark}: ${extractCollectionNameFromRef(signature)};\n`;
				break;

			default:
				typeStr += `\t${keyWithOptionalMark}: ${signature};\n`;
				break;
		}
	});

	return typeStr.concat('}');
};

const generateTypedefs = async () => {
	try {
		const dir = `${process.cwd()}/`;

		const schema = await fetchSchema();

		// Create types with fields and computed fields
		const fieldTypes = schema
			.map(({ name, fields, computed_fields }) => {
				if (computed_fields) {
					const fieldsData = { ...fields, ...computed_fields };
					return createInterface(name, fieldsData);
				}

				return createInterface(name, fields);
			})
			.join('\n\n');

		const typesStr =
			"import { type TimeStub, type DateStub, type DocumentReference } from 'fauna'\n\n".concat(
				fieldTypes
			);

		fs.writeFileSync(path.resolve(dir, `src/lib/types/generated/typedefs.ts`), typesStr, {
			encoding: 'utf-8'
		});
	} catch (error) {
		console.log('error: ', error);
	}
};

generateTypedefs();
