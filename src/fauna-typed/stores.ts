import { createCollectionStore } from '$lib/stores/collection.svelte';
import { createDocumentStore } from '$lib/stores/document.svelte';
import { asc, desc } from '$lib/stores/_shared/order';
import type { DocumentStores } from '$lib/types/types';

const documentStores: DocumentStores = {} as DocumentStores;

const stores = {
	Collection: createCollectionStore(),
	User: createDocumentStore('User', documentStores),
	Account: createDocumentStore('Account', documentStores)
};

Object.assign(documentStores, stores);

export { stores, stores as s, asc, desc };
