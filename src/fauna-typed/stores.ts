import { createCollectionStore } from '$lib/stores/collection.svelte';
import { createDocumentStore } from '$lib/stores/store-document.svelte';
import { asc, desc } from '$lib/stores/_shared/order';
import type {
	Account,
	Account_Create,
	Account_Replace,
	Account_Update,
	User,
	User_Create,
	User_Replace,
	User_Update
} from './types';
import type { DocumentStores } from '$lib/types/types';

let Collection = createCollectionStore().init();

const initialStores = {
	User: createDocumentStore<User, User_Create, User_Replace, User_Update>('User'),
	Account: createDocumentStore<Account, Account_Create, Account_Replace, Account_Update>('Account')
} as DocumentStores;

const finalizedStores = {
	Collection: Collection,
	User: initialStores.User.init(initialStores),
	Account: initialStores.Account.init(initialStores)
};

export { finalizedStores as stores, finalizedStores as s, asc, desc };
