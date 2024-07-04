import { createCollectionStore } from '$lib/stores/collection.svelte';
import { createDocumentStore } from '$lib/stores/document.svelte';
import { asc, desc } from '$lib/stores/_shared/order';
import type { TypeMapping } from './types';
import type { DocumentStores } from '$lib/types/types';

const Collection = createCollectionStore();

type Stores = DocumentStores & {
	Collection: typeof Collection;
};

let documentStores: DocumentStores = {} as DocumentStores;

documentStores = Collection.all().data?.reduce((acc, curr) => {
	return Object.assign(acc, {
		[curr.name]: createDocumentStore(curr.name as keyof TypeMapping, documentStores)
	});
}, {} as DocumentStores);

const stores: Stores = Object.assign(documentStores, {
	Collection
});

export { stores, stores as s, asc, desc };
