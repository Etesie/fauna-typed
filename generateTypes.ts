import fs from 'fs';
import path from 'path';
import { fetchSchema } from './src/lib/database/fetchSchema.svelte';

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
const extractCollectionNameFromRef = (ref) => {
	const regex = /Ref<([^>]+)>/;
	const match = ref.match(regex);
	return match[1];
};

const generateTypedefs = async () => {
	try {
		const dir = `${process.cwd()}/`;

		const schema = await fetchSchema();

		const types = "export type Test = 'test'";

		fs.writeFileSync(path.resolve(dir, `src/lib/types/generated/typedefs.ts`), types, {
			encoding: 'utf-8'
		});
	} catch (error) {
		console.log('error: ', error);
	}
};

generateTypedefs();
