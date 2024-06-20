import { Module, type QuerySuccess, TimeStub, DocumentReference, DateStub } from 'fauna';
import { client, fql } from '../database/client';
import { type Predicate } from '../types/fauna';
// import { User, type UserProperties, type UserPojo } from '../types/user';
import type { AccountStore } from './store-account.svelte';
import type { Ordering } from './_shared/order';
import { redo, undo } from './_shared/history';
import { browser } from '$app/environment';
import {
	Page,
	type Document,
	type DocumentT,
	type Fields,
	type User,
	type FunctionsT,
	type Document_CreateT,
	type User_CreateReplace,
	type Document_UpdateReplaceT,
	type User_Update
} from '$lib/types/NEW/types';
import { storage } from './_shared/local-storage';

let COLL_NAME: string;
let schema: Fields;

export type CreateUserStore = {
	users: User[];
	init: (accountStore: AccountStore) => UserStore; // TODO: init needs also to take the database client
	initS: UserStore; // TODO: Only for testing - delete later
	/**
	 * Empties the store. Useful if e.g. the user signs out
	 * @returns
	 */
	destroy: () => void;
};

export type UserStore = {
	byId: (id: string) => FunctionsT<DocumentT<User>>;
	first: () => FunctionsT<DocumentT<User>>;
	last: () => FunctionsT<DocumentT<User>>;
	all: () => Page<FunctionsT<DocumentT<User>>>;
	paginate: (after: string) => Page<FunctionsT<DocumentT<User>>>; // TODO: To be implemented
	where: (filter: Predicate<User>) => Page<FunctionsT<DocumentT<User>>>;
	create: (user: Document_CreateT<User_CreateReplace>) => FunctionsT<DocumentT<User>>;

	undo: () => void;
	redo: () => void;

	/**
	 * Transforms an Array of User into a POJO that can be used in the DOM.
	 * @param users
	 * @returns
	 */
	// toObjectArray: (users: FunctionsT<DocumentT<User>>[]) => UserPojo[];
};

const documentHandler = {
	get(target: any, prop: any, receiver: any): any {
		// console.log('document handler accessed');
		switch (prop) {
			/**
			 * We only need to proxy update, replace and delete because they don't exist on the Document. In a 2nd step we MAYBE need to proxy also the Document References to return the document from the store instead of the function itself.
			 */
			// case 'id':
			// 	return target.id;
			// case 'ts':
			// 	return target.ts;
			// case 'coll':
			// 	return target.coll;
			// case 'ttl':
			// 	return target.ttl;
			// case 'firstName':
			// 	return target.firstName;
			// case 'lastName':
			// 	return target.lastName;
			case 'update':
				return (user: Document_UpdateReplaceT<User_Update>): void => {
					console.log('update target', target.id);
					return updateObject(target.id, user);
				};
			case 'replace':
				return (user: Document_UpdateReplaceT<User_CreateReplace>): void => {
					console.log('replace target', target.id);
					return replaceObject(target.id, user);
				};
			case 'delete':
				return () => {
					console.log('delete target', target.id);
					deleteObject(target.id);
				};
			default:
				return Reflect.get(target, prop, receiver);
		}
	}
};

/**
 * Used to determine the current state of the store
 */
let current = $state<FunctionsT<DocumentT<User>>[]>([]);

/**
 * Used for undo functionality
 */
let past = $state<[FunctionsT<DocumentT<User>>[]?]>([]);

/**
 * Used for redo functionality
 */
let future = $state<[FunctionsT<DocumentT<User>>[]?]>([]);

/**
 * Stores all documents retrieved from the database unchanged. Used as a reference to determine the difference to "current" in order to determine which documents need to be updated, deleted or created in the database when the "sync" function is called.
 */
const database: User[] = $state<User[]>([]);

const getObjects = (filter: Predicate<DocumentT<User>>): FunctionsT<DocumentT<User>>[] => {
	return current.filter(filter);
};

const upsertObjectFromClient = (
	user: Document_CreateT<User_CreateReplace>
): FunctionsT<DocumentT<User>> => {
	// const newUser: DocumentT<User> = new Proxy(user, documentHandler);
	// let newUser: Partial<DocumentT<User>> = transformCreateUpdateReplaceToDocument(user);

	const index = current.findIndex((u) => $state.is(u.id, user.id));

	let id: string;
	const ts: TimeStub = TimeStub.fromDate(new Date());
	const coll: Module = new Module(COLL_NAME);
	if (user.id) {
		id = user.id;
	} else {
		id = 'TEMP_' + crypto.randomUUID();
	}
	const age: number = 0;
	const newUser: FunctionsT<DocumentT<User>> = new Proxy(
		{ id, ts, coll, age, ...user },
		documentHandler
	);

	if (index > -1) {
		addToPast();
		current[index] = newUser;
	} else {
		addToPast();

		current.push(newUser);
	}
	toLocalStorage();
	const updatedUser = current.find((u) => $state.is(u.id, newUser.id));
	if (!updatedUser) {
		throw new Error('User not found after upsert');
	}
	console.log('***current***\n', current);
	return updatedUser;
};

const upsertObjectFromStorage = (
	user: FunctionsT<DocumentT<User>>
): FunctionsT<DocumentT<User>> => {
	const index = current.findIndex((u) => $state.is(u.id, user.id));
	const proxiedUser = new Proxy(user, documentHandler);

	if (index > -1) {
		addToPast();
		current[index] = proxiedUser;
	} else {
		addToPast();
		current.push(proxiedUser);
	}
	const updatedUser = current.find((u) => $state.is(u.id, user.id));
	if (!updatedUser) {
		throw new Error('User not found after upsert');
	}
	return updatedUser;
};

const upsertObjectFromFauna = (user: FunctionsT<DocumentT<User>>): FunctionsT<DocumentT<User>> => {
	const index = current.findIndex((u) => $state.is(u.id, user.id));
	const proxiedUser = new Proxy(user, documentHandler);

	if (index > -1) {
		addToPast();
		current[index] = proxiedUser;
	} else {
		addToPast();
		current.push(proxiedUser);
	}
	toLocalStorage();
	const updatedUser = current.find((u) => $state.is(u.id, user.id));
	if (!updatedUser) {
		throw new Error('User not found after upsert');
	}
	return updatedUser;
};

export const updateObject = (id: string, fields: Document_UpdateReplaceT<User_Update>) => {
	const user = current.find((u) => $state.is(u.id, id));
	if (user) {
		addToPast();
		Object.assign(user, fields);
		toLocalStorage();
	}
};

export const replaceObject = (id: string, fields: Document_UpdateReplaceT<User_CreateReplace>) => {
	const index = current.findIndex((u) => $state.is(u.id, id));
	if (index !== -1) {
		addToPast();
		Object.assign(current[index], fields);
		Object.keys(current[index]).forEach((key) => {
			if (!(key in fields)) {
				if (key !== 'id' && key !== 'ts' && key !== 'coll') {
					delete current[index][key];
				}
			}
		});
		toLocalStorage();
	}
};

export const deleteObject = (id: string) => {
	const index = current.findIndex((u) => $state.is(u.id, id));
	if (index !== -1) {
		addToPast();
		current.splice(index, 1);
		toLocalStorage();
	}
};

export const toLocalStorage = () => {
	storage.set(COLL_NAME, current);
};

export const fromLocalStorage = () => {
	const parsedDocuments = storage.get<User>(COLL_NAME);
	if (parsedDocuments) {
		parsedDocuments.forEach((parsedUser) => {
			upsertObjectFromStorage(parsedUser);
		});
	}

	// Only as workaround until @link https://github.com/sveltejs/svelte/issues/11964 is resolved
	upsertObjectFromClient({
		firstName: 'John',
		lastName: 'Doe',
		birthdate: DateStub.fromDate(new Date('1990-01-01')),
		account: new DocumentReference({ coll: 'Account', id: '1' })
	});
	console.log('Test user added:', current);
};

/**
 * Add the `current` store to the `past` store to support undo functionality.
 * It also resets the `future` store, because the future store must only active if undo was used (If not old states will interfere).
 */
const addToPast = (): void => {
	past.push([...current]);
	if (past.length > 20) {
		past.shift();
	}
	future = [];
};

export const createDocumentStore = <T>(collectionName: string, fields: Fields): CreateUserStore => {
	COLL_NAME = collectionName;
	schema = fields;

	let AccountStore: AccountStore | null = null;

	const createStoreHandler = {
		get(target: any, prop: any, receiver: any): any {
			switch (prop) {
				case 'users':
					return current;
				case 'init':
					return (accountStore: AccountStore) => {
						AccountStore = accountStore;
						fromLocalStorage();
						return new Proxy(current, storeHandler);
					};
				case 'destroy':
					return () => {
						current = [];
						if (window) {
							localStorage.removeItem(COLL_NAME);
						}
					};
				default:
					return undefined;
			}
		}
	};

	const storeHandler = {
		get(target: any, prop: any, receiver: any): any {
			console.log('storeProp:', prop);

			switch (prop) {
				case 'byId':
					return (...args: string[]) => {
						return getObjects((doc) => doc.id === args[0]).at(0);
					};

				case 'first':
					return () => {
						return current.at(0);
					};

				case 'last':
					return () => {
						return current.at(-1);
					};

				case 'all':
					return () => {
						const result: Page<FunctionsT<DocumentT<User>>> = new Page(current, undefined);
						// fetchAllFromDB(result);
						return new Proxy(result, pageHandler);
					};

				case 'where':
					return (filter: Predicate<DocumentT<User>>) => {
						const result = new Page(getObjects(filter), undefined);
						// fetchWhereFromDB(result);
						return new Proxy(result, pageHandler);
					};

				case 'create':
					return (user: Document_CreateT<User_CreateReplace>) => {
						return upsertObjectFromClient(user);
					};

				/*************
				 * Undo/Redo
				 ************/

				case 'undo':
					return () => {
						const result = undo(current, past, future);
						if (result) {
							current = result.current;
							past = result.past;
							future = result.future;

							toLocalStorage();
						}
					};

				case 'redo':
					return () => {
						const result = redo(current, past, future);
						if (result) {
							current = result.current;
							past = result.past;
							future = result.future;
							toLocalStorage();
						}
					};

				// case 'toObjectArray':
				// 	return (users: User[]) => {
				// 		return users?.map((user) => user.toObject());
				// 	};

				default:
					// This will handle all other cases, including 'then' for Promises
					return Reflect.get(target, prop, receiver);
			}
		}
	};

	function createPageHandler<T extends Document>() {
		return {
			get(target: Page<T>, prop: keyof Page<T>, receiver: any): any {
				console.log('pageProp:', prop);

				switch (prop) {
					case 'data':
						return new Proxy(target.data, arrayHandler);
					case 'after':
						return target.after;
					case 'order':
						return (...orderings: Ordering<T>[]) => {
							target.order(...orderings); // Use the Page class's order method
							return new Proxy(target, createPageHandler<T>()); // Return a proxy to allow chaining
						};
					default:
						return Reflect.get(target, prop, receiver);
				}
			}
		};
	}

	const pageHandler = createPageHandler<FunctionsT<DocumentT<User>>>();

	const arrayHandler = {
		get(target: any, prop: any, receiver: any): any {
			console.log('arrayProp:', prop);

			switch (prop) {
				case 'at':
					return (index: number) => {
						if (target.at(index) != null) {
							return target.at(index);
						} else {
							target.at(index);
						}
					};
				default:
					return Reflect.get(target, prop, receiver);
			}
		}
	};

	// TODO: change type to T
	async function fetchAllFromDB(page: Page<FunctionsT<DocumentT<User>>>) {
		try {
			const response: QuerySuccess<Page<FunctionsT<DocumentT<User>>>> = await client.query<
				Page<FunctionsT<DocumentT<User>>>
			>(fql`User.all()`);
			if (response.data) {
				// const data: User[] = response.data.data.map(
				// 	(userWithoutMethods) => new User(userWithoutMethods)
				// );

				// Find the data in the store and replace it with the new data. If it doesn't exist, add it.
				response.data.data.forEach((newUser) => {
					const existingUserIndex = page.data.findIndex((user) => newUser.id === user.id);
					if (existingUserIndex !== -1) {
						// Replace the existing user with the new user
						page.data[existingUserIndex] = newUser;
					} else {
						// Add the new user to the store
						page.data.push(newUser);
					}
				});

				// TODO: Update also the localStorage

				// Object.assign(page, updatedStore);
			}
		} catch (error) {
			console.error('Error fetching user from database:', error);
		}
	}

	return new Proxy({}, createStoreHandler) as unknown as CreateUserStore;
};
