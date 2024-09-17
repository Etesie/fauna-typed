import { createSystemCollectionStore } from '$lib/stores/system-collection.svelte';
import fs from 'fs';
import path from 'path';
import { NODE_ENV } from '$env/static/private';
// TODO: BAD - need to replace it - the generator should not access user generated data.
import { client } from '$fauna-typed/client';

type GenerateStoresOptions = {
	generatedStoreDirPath?: string;
	generatedStoreFileName?: string;
};

// TODO: How to get the client from fauna-typed? It's in the user scope
const collections = $state(createSystemCollectionStore('Collection', client).all().data);

const defaultGenerateStoreOptions = {
	generatedStoreDirPath: 'src/fauna-typed',
	generatedStoreFileName: 'stores.ts'
};

const storeStr = `import { createSystemCollectionStore } from '$lib/stores/system-collection.svelte';
import { createDocumentStore } from '$lib/stores/document.svelte';
import { asc, desc } from '$lib/stores/_shared/order';
import type { Stores } from '$lib/types/types';
import { client } from './client';

const sharedStores = {} as Stores;

storesObject

// Make all stores available in every store
Object.assign(sharedStores, stores);

export { stores, stores as s, asc, desc };
`;

export const generateStores = (options?: GenerateStoresOptions) => {
	if (NODE_ENV !== 'development') {
		return { message: 'Ok' };
	}

	const generatedStoreDirPath =
		options?.generatedStoreDirPath || defaultGenerateStoreOptions.generatedStoreDirPath;
	const generatedStoreFileName =
		options?.generatedStoreFileName || defaultGenerateStoreOptions.generatedStoreFileName;
	const dir = `${process.cwd()}/`;
	let documentStoreStr =
		"const stores = {\n	Collection: createSystemCollectionStore('Collection', client),\n	Role: createSystemCollectionStore('Role', client),\n	AccessProvider: createSystemCollectionStore('AccessProvider', client),\n	Function: createSystemCollectionStore('Function', client),";

	collections.forEach((collection) => {
		documentStoreStr += `\n\t${collection.name}: createDocumentStore('${collection.name}', sharedStores, client),`;
	});

	documentStoreStr += '\n};';

	if (!fs.existsSync(path.resolve(dir, generatedStoreDirPath))) {
		fs.mkdirSync(path.resolve(dir, generatedStoreDirPath), { recursive: true });
		console.log(`${generatedStoreDirPath} directory created successfully`);
	}

	fs.writeFileSync(
		path.resolve(dir, `${generatedStoreDirPath}/${generatedStoreFileName}`),
		storeStr.replace('storesObject', documentStoreStr),
		{
			encoding: 'utf-8'
		}
	);

	return { message: 'Stores generated successfully' };
};
