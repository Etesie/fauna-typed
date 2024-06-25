import fs from 'fs';
import path from 'path';
import { fetchSchema } from './src/lib/database/fetchSchema.svelte';

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
