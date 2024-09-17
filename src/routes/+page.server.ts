import { NODE_ENV } from '$env/static/private';
import { createSystemCollectionStore } from '$lib/stores/system-collection.svelte';
import { generateTypes } from '$lib/generators/types';
import { generateStores } from '$lib/generators/stores.svelte';
// TODO: client should be not imported from user scope - find another way
import { client } from '$fauna-typed/client';

export const load = async () => {
	if (NODE_ENV === 'development') {
		const Collection = createSystemCollectionStore('Collection', client);
		const schema = Collection.all().data;

		let schemaValue;
		while (!schemaValue || schemaValue.length === 0) {
			schemaValue = schema;
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		console.log('schema: ', schema);

		const generatedTypesRes = generateTypes(schema);
		const generatedStoreRes = generateStores();

		console.log('generatedTypesRes: ', generatedTypesRes);
		console.log('generatedStoreRes: ', generatedStoreRes);
	}
};
