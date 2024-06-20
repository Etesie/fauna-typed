import { createAccountStore } from './store-account.svelte';
import { createDocumentStore } from './store-document.svelte';
import { asc, desc } from './_shared/order';
import { User } from '$lib/types/user';

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
const UserStore = createDocumentStore<User>('User', userFields);

// const collections = Collection.all();
// collections.data.map((collection) => {
// 	createDocumentStore(collection.name, collection.definition.fields);
// });

const initUserStore = UserStore.init(AccountStore);

export { initUserStore as User, asc, desc };
