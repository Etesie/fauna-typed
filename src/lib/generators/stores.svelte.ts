import { createCollectionStore } from '$lib/stores/collection.svelte';
import fs from 'fs';
import path from 'path';
import { NODE_ENV } from '$env/static/private';

type GenerateStoresOptions = {
	generatedStoreDirPath?: string;
	generatedStoreFileName?: string;
};

// TODO: How to get the client from fauna-typed? It's in the user scope
const collections = $state(createCollectionStore().all().data);

const defaultGenerateStoreOptions = {
	generatedStoreDirPath: 'src/fauna-typed',
	generatedStoreFileName: 'stores.ts'
};

const storeStr = `import { createCollectionStore } from '$lib/stores/collection.svelte';
import { createDocumentStore } from '$lib/stores/document.svelte';
import { asc, desc } from '$lib/stores/_shared/order';
import type { DocumentStores } from '$lib/types/types';
import { client } from './client';

const documentStores: DocumentStores = {} as DocumentStores;

storesObject

Object.assign(documentStores, stores);

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
	let documentStoreStr = 'const stores = {\n	Collection: createCollectionStore(client),';

	collections.forEach((collection) => {
		documentStoreStr += `\n\t${collection.name}: createDocumentStore('${collection.name}', documentStores, client),`;
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
