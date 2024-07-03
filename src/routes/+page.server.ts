import * as env from '$env/static/private';
import { createCollectionStore } from '$lib/stores/collection.svelte';
import { generateTypes } from '$lib/generators/types';

export const load = () => {
	if (env?.NODE_ENV === 'development') {
		const Collection = createCollectionStore().init();
		const schema = Collection.all().data;

		const generatedTypesRes = generateTypes(schema);

		console.log('generatedTypesRes: ', generatedTypesRes);
	}
};
