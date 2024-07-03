import type { Account, Account_Create, Account_Replace, Account_Update } from '$fauna-typed/types';
import { createCollectionStore } from '$lib/stores/collection.svelte';
import { createDocumentStore } from '$lib/stores/document.svelte';
import type { DocumentStores, Stores } from '$lib/types/types';

let collections = $state(createCollectionStore().init().all().data);

let initialDocStores = $derived(
	collections.reduce((acc, collection) => {
		// Assuming collection.name gives you 'User', 'Account', etc.
		acc[collection.name] = createDocumentStore<
			Account,
			Account_Create,
			Account_Replace,
			Account_Update
		>(collection.name);
		return acc;
	}, {} as DocumentStores)
);

let finalizedDocStores = $derived(
	Object.keys(initialDocStores).reduce((acc, key) => {
		// Initialize each store with the full storeObject
		const finalizedDocStore = initialDocStores[key].init(initialDocStores);
		// Assign the initialized store to the accumulator object
		acc[key] = finalizedDocStore;
		return acc;
	})
);
