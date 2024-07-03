import { createCollectionStore } from '$lib/stores/collection.svelte';
import { createDocumentStore } from '$lib/stores/document.svelte';
import { asc, desc } from '$lib/stores/_shared/order';

let Collection = createCollectionStore().init();

const initialStores = {
	User: createDocumentStore('User'),
	Account: createDocumentStore('Account')
};

const finalizedStores = {
	Collection: Collection,
	User: initialStores.User.init(initialStores),
	Account: initialStores.Account.init(initialStores)
};

export { finalizedStores as stores, finalizedStores as s, asc, desc };
