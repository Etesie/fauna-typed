import { createSystemCollectionStore } from '$lib/stores/system-collection.svelte';
import { createDocumentStore } from '$lib/stores/document.svelte';
import { asc, desc } from '$lib/stores/_shared/order';
import type { Stores } from '$lib/types/types';
import { client } from './client';

const sharedStores = {} as Stores;

sharedStores.Collection = await createSystemCollectionStore('Collection', client);
sharedStores.Role = await createSystemCollectionStore('Role', client);
sharedStores.AccessProvider = await createSystemCollectionStore('AccessProvider', client);
sharedStores.Function = await createSystemCollectionStore('Function', client);

const stores = {
	Collection: sharedStores.Collection,
	Role: sharedStores.Role,
	AccessProvider: sharedStores.AccessProvider,
	Function: sharedStores.Function,
	Event: createDocumentStore('Event', sharedStores, client),
	Consequence: createDocumentStore('Consequence', sharedStores, client),
	MasterChapter: createDocumentStore('MasterChapter', sharedStores, client),
	MasterQuestion: createDocumentStore('MasterQuestion', sharedStores, client),
	MasterAnswer: createDocumentStore('MasterAnswer', sharedStores, client),
	Test: createDocumentStore('Test', sharedStores, client),
};

// Make all stores available in every store
Object.assign(sharedStores, stores);

export { stores, stores as s, asc, desc };
