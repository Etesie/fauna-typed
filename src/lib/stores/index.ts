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

const AccountStore = createDocumentStore<Account, Account_Create, Account_Replace, Account_Update>(
	'Account'
);
// console.log('fields:', Object.entries(AccountStore.init().definition.fields).at(0));
const UserStore = createDocumentStore<User, User_Create, User_Replace, User_Update>('User');
// const collections = Collection.all();
// collections.data.map((collection) => {
// 	createDocumentStore(collection.name, collection.definition.fields);
// });
const stores = {
	User: UserStore,
	Account: AccountStore
} as DocumentStores;

const initializedStores = {
	Collection: Collection,
	User: UserStore.init(stores),
	Account: AccountStore.init(stores)
};

export { initializedStores as stores, asc, desc };
