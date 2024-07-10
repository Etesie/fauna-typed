import { createCollectionStore } from '$lib/stores/collection.svelte';
import { createDocumentStore } from '$lib/stores/document.svelte';
import { asc, desc } from '$lib/stores/_shared/order';
import type { DocumentStores } from '$lib/types/types';
import { client } from './client';

const documentStores: DocumentStores = {} as DocumentStores;

const stores = {
	Collection: createCollectionStore(client),
	User: createDocumentStore('User', documentStores, client),
	Account: createDocumentStore('Account', documentStores, client)
};

Object.assign(documentStores, stores);

export { stores, stores as s, asc, desc };
