import { createCollectionStore } from './collection.svelte';
import { createDocumentStore } from './store-document.svelte';
import { asc, desc } from './_shared/order';
import type {
	Account,
	Account_Create,
	Account_Replace,
	Account_Update,
	User,
	User_Create,
	User_Replace,
	User_Update
} from '$lib/types/generated/types';
import type { DocumentStores } from '$lib/types/default/types';

let Collection = createCollectionStore().init();

/**
 * TODO: Create stores from API and inject types on the fly
 * Every time this code in this file runs we need to
 * - generate the types from fauna // only dev side
 * - inject the types in this file
 * - create the stores with the injected types
 * !!! Challenge: Collection.all() is lazy, that means you get outdated data
 * instant and updated fauna data only after some time => Solved by reactivity
 */
// Collection.all().data.map((collection) => {
// 	createDocumentStore(collection.name);
// });

const AccountStore = createDocumentStore<Account, Account_Create, Account_Replace, Account_Update>(
	'Account'
);
// console.log('fields:', Object.entries(AccountStore.init().definition.fields).at(0));
const UserStore = createDocumentStore<User, User_Create, User_Replace, User_Update>('User');
const stores = {
	User: UserStore,
	Account: AccountStore
} as DocumentStores;

const initializedStores = {
	Collection: Collection,
	User: UserStore.init(stores),
	Account: AccountStore.init(stores)
};

export { initializedStores as stores, initializedStores as s, asc, desc };
