import { NODE_ENV } from '$env/static/private';
import { createCollectionStore } from '$lib/stores/collection.svelte';
import { generateTypes } from '$lib/generators/types';
import { generateStores } from '$lib/generators/stores.svelte';

export const load = () => {
	if (NODE_ENV === 'development') {
		const Collection = createCollectionStore();
		const schema = Collection.all().data;

		const generatedTypesRes = generateTypes(schema);
		const generatedStoreRes = generateStores();

		console.log('generatedTypesRes: ', generatedTypesRes);
		console.log('generatedStoreRes: ', generatedStoreRes);
	}
};
