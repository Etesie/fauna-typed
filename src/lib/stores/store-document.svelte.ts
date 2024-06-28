import {
	Module,
	type QuerySuccess,
	TimeStub,
	DocumentReference,
	DateStub,
	type QueryValueObject
} from 'fauna';
import { client, fql } from '../database/client';
import type { Ordering } from './_shared/order';
import { redo, undo } from './_shared/history';
import {
	type Predicate,
	Page,
	type Fields,
	type FunctionsT,
	type Document,
	type DocumentT,
	type Document_CreateT,
	type Document_ReplaceT,
	type Document_UpdateT,
	type ComputedFields,
	type DocumentStores,
	type Collection
} from '$lib/types/default/types';
import { storage } from './_shared/local-storage';

let s: DocumentStores;

let definition: Collection = {
	name: 'User',
	coll: new Module('Collection'),
	ts: TimeStub.fromDate(new Date()),
	history_days: 0,
	fields: {
		firstName: {
			signature: 'String'
		},
		lastName: {
			signature: 'String'
		},
		birthday: {
			signature: 'Date'
		},
		account: {
			signature: 'Ref<Account>?'
		}
	},
	computed_fields: {
		age: {
			body: '(doc) => (Date.today().difference(doc.birthday) / 365)',
			signature: 'Number'
		}
	},
	constraints: [],
	indexes: {}
};

export type CreateDocumentStore<
	T extends QueryValueObject,
	T_Create extends QueryValueObject,
	T_Replace extends QueryValueObject,
	T_Update extends QueryValueObject
> = {
	init: (stores: DocumentStores) => DocumentStore<T, T_Create, T_Replace, T_Update>; // TODO: init needs also to take the database client
	/**
	 * Empties the store. Useful if e.g. the user signs out
	 * @returns
	 */
	destroy: () => void;
};

type DocumentStore<
	T extends QueryValueObject,
	T_Create extends QueryValueObject,
	T_Replace extends QueryValueObject,
	T_Update extends QueryValueObject
> = {
	// byId: (id: string) => FunctionsT<DocumentT<T>>;
	byId: (id: string) => FunctionsT<DocumentT<T>, T_Replace, T_Update>;
	first: () => FunctionsT<DocumentT<T>, T_Replace, T_Update>;
	last: () => FunctionsT<DocumentT<T>, T_Replace, T_Update>;
	all: () => Page<FunctionsT<DocumentT<T>, T_Replace, T_Update>>;
	paginate: (after: string) => Page<FunctionsT<DocumentT<T>, T_Replace, T_Update>>; // TODO: To be implemented
	where: (filter: Predicate<DocumentT<T>>) => Page<FunctionsT<DocumentT<T>, T_Replace, T_Update>>;
	create: (doc: Document_CreateT<T_Create>) => FunctionsT<DocumentT<T>, T_Replace, T_Update>;
	definition: Definition;

	undo: () => void;
	redo: () => void;

	/**
	 * Transforms an Array of Document into a POJO that can be used in the DOM.
	 * @param users
	 * @returns
	 */
	// toObjectArray: (users: FunctionsT<DocumentT<T>>[]) => UserPojo[];
};

export const createDocumentStore = <
	T extends QueryValueObject,
	T_Create extends QueryValueObject,
	T_Replace extends QueryValueObject,
	T_Update extends QueryValueObject
>(
	collectionName: string
): CreateDocumentStore<T, T_Create, T_Replace, T_Update> => {
	const COLL_NAME: string = collectionName;

	/**
	 * Used to determine the current state of the store
	 */
	let current = $state<FunctionsT<DocumentT<T>, T_Replace, T_Update>[]>([]);

	/**
	 * Used for undo functionality
	 */
	let past = $state<[FunctionsT<DocumentT<T>, T_Replace, T_Update>[]?]>([]);

	/**
	 * Used for redo functionality
	 */
	let future = $state<[FunctionsT<DocumentT<T>, T_Replace, T_Update>[]?]>([]);

	/**
	 * Stores all documents retrieved from the database unchanged. Used as a reference to determine the difference to "current" in order to determine which documents need to be updated, deleted or created in the database when the "sync" function is called.
	 */
	const database = $state<FunctionsT<DocumentT<T>, T_Replace, T_Update>[]>([]);

	const createStoreHandler = {
		get(target: any, prop: any, receiver: any): any {
			switch (prop) {
				case 'init':
					return (stores: DocumentStores) => {
						s = stores;
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
						const result = new Page<FunctionsT<DocumentT<T>, T_Replace, T_Update>>(
							current,
							undefined
						);
						// fetchAllFromDB(result);
						return new Proxy(result, pageHandler);
					};

				case 'where':
					return (filter: Predicate<DocumentT<T>>) => {
						const result = new Page(getObjects(filter), undefined);
						// fetchWhereFromDB(result);
						return new Proxy(result, pageHandler);
					};

				case 'create':
					return (document: Document_CreateT<T_Create>) => {
						return upsertObjectFromClient(document);
					};

				case 'definition':
					// TODO: Get definition from Fauna
					return new Proxy(
						{
							fields: definition.fields
						},
						definitionHandler
					);

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
				// 	return (docs: FunctionsT<DocumentT<T>, T_Replace, T_Update>[]) => {
				// 		return docs?.map((doc) => doc.toObject());
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

	const pageHandler = createPageHandler<FunctionsT<DocumentT<T>, T_Replace, T_Update>>();

	const arrayHandler = {
		get(target: any, prop: any, receiver: any): any {
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

	const definitionHandler = {
		get(target: any, prop: any, receiver: any): any {
			return Reflect.get(target, prop, receiver);
		}
	};

	const documentHandler = {
		get(target: any, prop: any, receiver: any): any {
			// console.log('document handler accessed');
			switch (prop) {
				/**
				 * We only need to proxy update, replace and delete because they don't exist on the Document. In a 2nd step we MAYBE need to proxy also the Document References to return the document from the store instead of the function itself.
				 */
				case 'update':
					return (doc: Document_UpdateT<T_Update>): void => {
						console.log('update target', target.id);
						return updateObject(target.id, doc);
					};
				case 'replace':
					return (doc: Document_ReplaceT<T_Replace>): void => {
						console.log('replace target', target.id);
						return replaceObject(target.id, doc);
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

	const getObjects = <
		T extends QueryValueObject,
		T_Replace extends QueryValueObject,
		T_Update extends QueryValueObject
	>(
		filter: Predicate<DocumentT<T>>
	): FunctionsT<DocumentT<T>, T_Replace, T_Update>[] => {
		return current.filter(filter);
	};

	const upsertObjectFromClient = <
		T extends QueryValueObject,
		T_Create extends QueryValueObject,
		T_Replace extends QueryValueObject,
		T_Update extends QueryValueObject
	>(
		doc: Document_CreateT<T_Create>
	): FunctionsT<DocumentT<T>, T_Replace, T_Update> => {
		const index = current.findIndex((u) => $state.is(u.id, doc.id));

		let id: string;
		const ts: TimeStub = TimeStub.fromDate(new Date());
		const coll: Module = new Module(COLL_NAME);
		if (doc.id) {
			id = doc.id;
		} else {
			id = 'TEMP_' + crypto.randomUUID();
		}

		// TODO: We need to identify computed fields like age automatically and replace it
		const age: number = 0;
		const newDoc: FunctionsT<DocumentT<T>, T_Replace, T_Update> = new Proxy(
			{ id, ts, coll, age, ...doc },
			documentHandler
		);

		if (index > -1) {
			addToPast();
			current[index] = newDoc;
		} else {
			addToPast();

			current.push(newDoc);
		}
		toLocalStorage();
		const updatedDoc = current.find((u) => $state.is(u.id, newDoc.id));
		if (!updatedDoc) {
			throw new Error('Document not found after upsert');
		}
		return updatedDoc;
	};

	const upsertObjectFromStorage = <
		T extends QueryValueObject,
		T_Replace extends QueryValueObject,
		T_Update extends QueryValueObject
	>(
		doc: FunctionsT<DocumentT<T>, T_Replace, T_Update>
	): FunctionsT<DocumentT<T>, T_Replace, T_Update> => {
		const index = current.findIndex((u) => $state.is(u.id, doc.id));
		const proxiedDoc = new Proxy(doc, documentHandler);

		if (index > -1) {
			addToPast();
			current[index] = proxiedDoc;
		} else {
			addToPast();
			current.push(proxiedDoc);
		}
		const updatedDoc = current.find((u) => $state.is(u.id, doc.id));
		if (!updatedDoc) {
			throw new Error('Document not found after upsert');
		}
		return updatedDoc;
	};

	const upsertObjectFromFauna = <
		T extends QueryValueObject,
		T_Replace extends QueryValueObject,
		T_Update extends QueryValueObject
	>(
		doc: FunctionsT<DocumentT<T>, T_Replace, T_Update>
	): FunctionsT<DocumentT<T>, T_Replace, T_Update> => {
		const index = current.findIndex((u) => $state.is(u.id, doc.id));
		const proxiedDoc = new Proxy(doc, documentHandler);

		if (index > -1) {
			addToPast();
			current[index] = proxiedDoc;
		} else {
			addToPast();
			current.push(proxiedDoc);
		}
		toLocalStorage();
		const updatedDoc = current.find((u) => $state.is(u.id, doc.id));
		if (!updatedDoc) {
			throw new Error('Document not found after upsert');
		}
		return updatedDoc;
	};

	const updateObject = <T_Update extends QueryValueObject>(
		id: string,
		fields: Document_UpdateT<T_Update>
	) => {
		const doc = current.find((u) => $state.is(u.id, id));
		if (doc) {
			addToPast();
			Object.assign(doc, fields);
			toLocalStorage();
		}
	};

	const replaceObject = <T_Replace extends QueryValueObject>(
		id: string,
		fields: Document_ReplaceT<T_Replace>
	) => {
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

	const deleteObject = (id: string) => {
		const index = current.findIndex((u) => $state.is(u.id, id));
		if (index !== -1) {
			addToPast();
			current.splice(index, 1);
			toLocalStorage();
		}
	};

	const toLocalStorage = () => {
		storage.set(COLL_NAME, current);
	};

	const fromLocalStorage = <T extends QueryValueObject>() => {
		const parsedDocuments = storage.get<T>(COLL_NAME);
		if (parsedDocuments) {
			parsedDocuments.forEach((parsedDocument) => {
				upsertObjectFromStorage(parsedDocument);
			});
		}

		// Only as workaround until @link https://github.com/sveltejs/svelte/issues/11964 is resolved
		upsertObjectFromClient({
			firstName: 'John',
			lastName: 'Doe',
			birthdate: DateStub.fromDate(new Date('1990-01-01')),
			account: new DocumentReference({ coll: 'Account', id: '1' })
		});
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

	// TODO: change type to T
	async function fetchAllFromDB(page: Page<FunctionsT<DocumentT<T>, T_Replace, T_Update>>) {
		try {
			const response: QuerySuccess<Page<FunctionsT<DocumentT<T>, T_Replace, T_Update>>> =
				await client.query<Page<FunctionsT<DocumentT<T>, T_Replace, T_Update>>>(fql`User.all()`);
			if (response.data) {
				// const data: User[] = response.data.data.map(
				// 	(userWithoutMethods) => new User(userWithoutMethods)
				// );

				// Find the data in the store and replace it with the new data. If it doesn't exist, add it.
				response.data.data.forEach((newDoc) => {
					const existingUserIndex = page.data.findIndex((doc) => newDoc.id === doc.id);
					if (existingUserIndex !== -1) {
						// Replace the existing document with the new document
						page.data[existingUserIndex] = newDoc;
					} else {
						// Add the new document to the store
						page.data.push(newDoc);
					}
				});

				// TODO: Update also the localStorage

				// Object.assign(page, updatedStore);
			}
		} catch (error) {
			console.error('Error fetching document from database:', error);
		}
	}

	return new Proxy({}, createStoreHandler) as unknown as CreateDocumentStore<
		T,
		T_Create,
		T_Replace,
		T_Update
	>;
};
