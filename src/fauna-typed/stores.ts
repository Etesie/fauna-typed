import { createCollectionStore } from '../lib/stores/collection.svelte';
import { createDocumentStore } from '../lib/stores/store-document.svelte';
import { asc, desc } from '../lib/stores/_shared/order';
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
