import { NODE_ENV } from '$env/static/private';
import { createCollectionStore } from '$lib/stores/collection.svelte';
import { generateTypes } from '$lib/generators/types';
import { generateStores } from '$lib/generators/stores.svelte';
// TODO: client should be not imported from user scope - find another way
import { client } from '$fauna-typed/client';

export const load = () => {
	if (NODE_ENV === 'development') {
		const Collection = createCollectionStore(client);
		const schema = Collection.all().data;

		const generatedTypesRes = generateTypes(schema);
		const generatedStoreRes = generateStores();

		console.log('generatedTypesRes: ', generatedTypesRes);
		console.log('generatedStoreRes: ', generatedStoreRes);
	}
};
