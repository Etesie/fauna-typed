import * as env from '$env/static/public';
import { createCollectionStore } from '$lib/stores/collection.svelte';
import { generateTypes } from '$lib/types/generateTypes';

export const load = () => {
	if (env?.PUBLIC_NODE_ENV === 'development') {
		const Collection = createCollectionStore().init();
		const schema = Collection.all().data;

		const generatedTypesRes = generateTypes(schema);

		console.log('generatedTypesRes: ', generatedTypesRes);
	}
};
