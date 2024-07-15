import { createCollectionStore } from '$lib/stores/collection.svelte';
import { createDocumentStore } from '$lib/stores/document.svelte';
import { asc, desc } from '$lib/stores/_shared/order';
import type { DocumentStores } from '$lib/types/types';
import { client } from './client';

const documentStores: DocumentStores = {} as DocumentStores;

const stores = {
	Collection: createCollectionStore(client),
	Event: createDocumentStore('Event', documentStores, client),
	Consequence: createDocumentStore('Consequence', documentStores, client),
	MasterChapter: createDocumentStore('MasterChapter', documentStores, client),
	MasterQuestion: createDocumentStore('MasterQuestion', documentStores, client),
	MasterAnswer: createDocumentStore('MasterAnswer', documentStores, client),
};

Object.assign(documentStores, stores);

export { stores, stores as s, asc, desc };
