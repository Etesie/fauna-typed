import { Module, type QuerySuccess, TimeStub, type QueryValueObject } from 'fauna';
import { client, fql } from '../database/client';
import type { Ordering } from './_shared/order';
import { redo, undo } from './_shared/history';
import {
	type Predicate,
	Page,
	type Functions,
	type Document,
	type Document_Create,
	type Document_Replace,
	type Document_Update,
	type DocumentStores,
	type Collection,
	type NamedDocument
} from '$lib/types/types';
import { storage } from './_shared/local-storage';
import { createCollectionStore } from './collection.svelte';
import type { TypeMapping } from '$fauna-typed/types';

let s: DocumentStores = $state({});
let Collection = createCollectionStore();

export type CreateDocumentStore<
	T extends QueryValueObject,
	T_Create extends QueryValueObject,
	T_Replace extends QueryValueObject,
	T_Update extends QueryValueObject
> = {
	byId: (id: string) => Functions<T, T_Replace, T_Update>;
	first: () => Functions<T, T_Replace, T_Update>;
	last: () => Functions<T, T_Replace, T_Update>;
	all: () => Page<Functions<T, T_Replace, T_Update>>;
	paginate: (after: string) => Page<Functions<T, T_Replace, T_Update>>; // TODO: To be implemented
	where: (filter: Predicate<Document<T>>) => Page<Functions<T, T_Replace, T_Update>>;
	create: (doc: Document_Create<T_Create>) => Functions<T, T_Replace, T_Update>;
	definition: NamedDocument<Collection>;

	undo: () => void;
	redo: () => void;

	/**
	 * Empties the store. Useful if e.g. the user signs out
	 * @returns
	 */
	destroy: () => void;
};

export const createDocumentStore = <K extends keyof TypeMapping>(
	collectionName: K,
	documentStores: DocumentStores
): CreateDocumentStore<
	TypeMapping[K]['main'],
	TypeMapping[K]['create'],
	TypeMapping[K]['replace'],
	TypeMapping[K]['update']
> => {
	type EnforceQueryValueObjectExtension<T> = T extends QueryValueObject ? T : never;
	type MainType = EnforceQueryValueObjectExtension<TypeMapping[K]['main']>;
	type CreateType = EnforceQueryValueObjectExtension<TypeMapping[K]['create']>;
	type ReplaceType = EnforceQueryValueObjectExtension<TypeMapping[K]['replace']>;
	type UpdateType = EnforceQueryValueObjectExtension<TypeMapping[K]['update']>;

	s = documentStores;
	const COLL_NAME: string = collectionName;

	const definition: NamedDocument<Collection> = Collection.byName(COLL_NAME);

	/**
	 * Used to determine the current state of the store
	 */
	let current = $state<Functions<MainType, ReplaceType, UpdateType>[]>([]);

	/**
	 * Used for undo functionality
	 */
	let past = $state<[Functions<MainType, ReplaceType, UpdateType>[]?]>([]);

	/**
	 * Used for redo functionality
	 */
	let future = $state<[Functions<MainType, ReplaceType, UpdateType>[]?]>([]);

	/**
	 * Stores all documents retrieved from the database unchanged. Used as a reference to determine the difference to "current" in order to determine which documents need to be updated, deleted or created in the database when the "sync" function is called.
	 */
	const database = $state<Functions<MainType, ReplaceType, UpdateType>[]>([]);

	const createStoreHandler = {
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
						const result = new Page<Functions<MainType, ReplaceType, UpdateType>>(
							current,
							undefined
						);
						// fetchAllFromDB(result);
						return new Proxy(result, pageHandler);
					};

				case 'where':
					return (filter: Predicate<Document<MainType>>) => {
						const result = new Page(getObjects(filter), undefined);
						// fetchWhereFromDB(result);
						return new Proxy(result, pageHandler);
					};

				case 'create':
					return (document: Document_Create<CreateType>) => {
						return upsertObjectFromClient(document);
					};

				case 'definition':
					// TODO: Get definition from Fauna
					// return new Proxy(s.Collection.byName(COLL_NAME), collectionHandler);
					return definition;

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

				case 'destroy':
					return () => {
						current = [];
						if (window) {
							localStorage.removeItem(COLL_NAME);
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

	const pageHandler = {
		get(
			target: Page<Document<MainType>>,
			prop: keyof Page<Document<MainType>>,
			receiver: any
		): any {
			switch (prop) {
				case 'data':
					return target.data;
				case 'after':
					return target.after;
				case 'order':
					return (...orderings: Ordering<Document<MainType>>[]) => {
						target.order(...orderings); // Use the Page class's order method
						return new Proxy(target, pageHandler); // Return a proxy to allow chaining
					};
				default:
					return Reflect.get(target, prop, receiver);
			}
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
					return (doc: Document_Update<UpdateType>): void => {
						console.log('update target', target.id);
						updateObject(target.id, doc);
					};
				case 'replace':
					return (doc: Document_Replace<ReplaceType>): void => {
						console.log('replace target', target.id);
						replaceObject(target.id, doc);
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

	const getObjects = (
		filter: Predicate<Document<MainType>>
	): Functions<MainType, ReplaceType, UpdateType>[] => {
		return current.filter(filter);
	};

	const upsertObjectFromClient = (
		doc: Document_Create<CreateType>
	): Functions<MainType, ReplaceType, UpdateType> => {
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
		const newDoc: Functions<MainType, ReplaceType, UpdateType> = new Proxy(
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
		return newDoc;
	};

	const upsertObjectFromStorage = (
		doc: Functions<MainType, ReplaceType, UpdateType>
	): Functions<MainType, ReplaceType, UpdateType> => {
		const index = current.findIndex((u) => $state.is(u.id, doc.id));
		const newDoc = new Proxy(doc, documentHandler);

		if (index > -1) {
			addToPast();
			current[index] = newDoc;
		} else {
			addToPast();
			current.push(newDoc);
		}
		return newDoc;
	};

	const upsertObjectFromFauna = (
		doc: Functions<MainType, ReplaceType, UpdateType>
	): Functions<MainType, ReplaceType, UpdateType> => {
		const index = current.findIndex((u) => $state.is(u.id, doc.id));
		const newDoc = new Proxy(doc, documentHandler);

		if (index > -1) {
			addToPast();
			current[index] = newDoc;
		} else {
			addToPast();
			current.push(newDoc);
		}
		toLocalStorage();
		return newDoc;
	};

	const updateObject = (id: string, fields: Document_Update<UpdateType>) => {
		const doc = current.find((u) => $state.is(u.id, id));
		if (doc) {
			addToPast();
			Object.assign(doc, fields);
			toLocalStorage();
			return doc;
		}
	};

	const replaceObject = (id: string, fields: Document_Replace<ReplaceType>) => {
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

	const fromLocalStorage = () => {
		const parsedDocuments = storage.get<Functions<MainType, ReplaceType, UpdateType>>(COLL_NAME);
		if (parsedDocuments) {
			parsedDocuments.forEach((parsedDocument) => {
				upsertObjectFromStorage(parsedDocument);
			});
		}
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
	async function fetchAllFromDB(page: Page<Functions<MainType, ReplaceType, UpdateType>>) {
		try {
			const response: QuerySuccess<Page<Functions<MainType, ReplaceType, UpdateType>>> =
				await client.query<Page<Functions<MainType, ReplaceType, UpdateType>>>(fql`User.all()`);
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

	fromLocalStorage();
	return new Proxy({}, createStoreHandler) as unknown as CreateDocumentStore<
		MainType,
		CreateType,
		ReplaceType,
		UpdateType
	>;
};
