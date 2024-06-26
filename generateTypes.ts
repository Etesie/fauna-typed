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
	let typeStr = `type ${name}${typeSuffix} = {\n`;

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
			case checkDataType(value.signature, 'Ref<'): {
				const collName = extractCollectionNameFromRef(signature);
				const refType = typeSuffix
					? typeSuffix === '_Create'
						? `${collName} | DocumentReference`
						: 'DocumentReference'
					: collName;

				typeStr += `\t${keyWithOptionalMark}: ${refType};\n`;
				break;
			}

			default:
				typeStr += `\t${keyWithOptionalMark}: ${signature};\n`;
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

		fs.writeFileSync(path.resolve(dir, `src/lib/types/generated/typedefs.ts`), typesStr, {
			encoding: 'utf-8'
		});
	} catch (error) {
		console.log('error: ', error);
	}
};

generateTypedefs();
