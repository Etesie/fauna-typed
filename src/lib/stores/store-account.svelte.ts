import type { DocumentReference, QuerySuccess } from 'fauna';
import { client, fql } from '../database/client';
import type { User } from '../types/user';
import { v } from '../types/validators';
import type { Account } from '../types/account';
import type { DocumentStore } from './store-document.svelte';

export type AccountStore = {
	byId: (id: string) => Promise<Account>;
};

const accounts: Account[] = $state<Account[]>([]);

/**
 * Add or update an account in the account store.
 * @param account
 */
const upsertAccount = (account: Account) => {
	const index = accounts.findIndex((u) => u.id === account.id);
	if (index > -1) {
		accounts[index] = account;
	} else {
		accounts.push(account);
	}
};

export const createAccountStore = (): AccountStore => {
	let UserStorePromise: Promise<DocumentStore> | null = null;

	async function getUserStore() {
		if (!UserStorePromise) {
			UserStorePromise = import('./store-document.svelte').then((module) =>
				module.createDocumentStore()
			);
		}
		return UserStorePromise;
	}

	/**
	 * Transforms a Fauna User object to a Client User object and stores it in the User store.
	 * @param user
	 * @returns
	 */
	const transformIntoClientAccount = (faunaAccount: Account): Account => {
		const { user: faunaUser, ...rest } = faunaAccount;
		const clientAccount: Account = {
			user: async () => {
				const placeholder: Promise<User> = new Promise(() => {});
				return placeholder;
			},
			...rest
		};

		// check if user is of type DocumentReference
		if (v.d.documentReference.safeParse(faunaUser).success) {
			// Transform faunaUser of type F_User to C_User by replacing each DocumentReference with a Promise that fetches the referenced document from store or database
			const user: DocumentReference = faunaUser as DocumentReference;

			clientAccount.user = async () => {
				const User = await getUserStore();
				return User.byId(user.id);
			};
		} else if (v.d.user.safeParse(faunaUser).success) {
			const user: User = faunaUser as User;

			clientAccount.user = async () => {
				const User = await getUserStore();
				return User.byId(user.id);
			};

			// TODO: store accounts in account store. Import account store here and call upsertAccount(C_Account).
		}
		// Add account to store
		upsertAccount(clientAccount);
		return clientAccount;
	};

	async function byId(id: string): Promise<Account> {
		// Try to get account from account store
		const account = accounts.filter((account) => account.id === id).at(0);
		if (account) {
			return account;
		}

		// Try to get account from database
		const response: QuerySuccess<Account> = await client.query<Account>(fql`User.byId(${id})`);
		const faunaAccount = response.data;

		if (faunaAccount) {
			return transformIntoClientAccount(faunaAccount);
		} else {
			throw new Error('User not found');
		}
	}

	return {
		byId
	};
};
