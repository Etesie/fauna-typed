import { createAccountStore } from './store-account.svelte';
import { createDocumentStore } from './store-document.svelte';
import { asc, desc } from './_shared/order';
import type { User, User_Create, User_Replace, User_Update } from '$lib/types/NEW/types';

const userFields = {
	firstName: {
		signature: 'String'
	},
	lastName: {
		signature: 'String'
	},
	account: {
		signature: 'Ref<Account>?'
	}
};

const AccountStore = createAccountStore();
// const UserStore = createDocumentStore<User>('User');
// Can I pass a class instead of a string?
const UserStore = createDocumentStore<User, User_Create, User_Replace, User_Update>(
	'User',
	userFields
);
// UserStore.init(AccountStore).byId('1').repl;
// const collections = Collection.all();
// collections.data.map((collection) => {
// 	createDocumentStore(collection.name, collection.definition.fields);
// });

const stores = {
	User: UserStore.init(AccountStore)
};

export { stores, asc, desc };
