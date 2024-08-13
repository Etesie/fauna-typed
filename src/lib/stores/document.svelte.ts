import { type QueryValueObject, Client } from 'fauna';
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
import { docCreateToDoc, docReplaceToDoc, docUpdateToDoc } from '$lib/types/converters';
import { createDatabaseApi } from '$lib/database/fauna';
import isEqual from 'lodash.isequal';

let s: DocumentStores = $state({});

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
	firstWhere: (filter: Predicate<Document<T>>) => Functions<T, T_Replace, T_Update>;
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
	documentStores: DocumentStores,
	client: Client
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
	const COLL_NAME: string = collectionName;

	const upsertObjectFromClient = (
		doc: Document_Create<CreateType>
	): Functions<MainType, ReplaceType, UpdateType> => {
		const index = current.findIndex((u) => $state.is(u.id, doc.id));

		const convertedDoc = docCreateToDoc(doc, definition, s);
		const newDoc: Functions<MainType, ReplaceType, UpdateType> = new Proxy(
			convertedDoc,
			createDocumentHandler(convertedDoc.id)
		);

		if (index > -1) {
			if (!isEqual(current[index], newDoc)) {
				addToPast();
				current[index] = newDoc;
			}
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
		const newDoc = new Proxy(doc, createDocumentHandler(doc.id));

		if (index > -1) {
			if (!isEqual(current[index], newDoc)) {
				addToPast();
				current[index] = newDoc;
			}
		} else {
			addToPast();
			current.push(newDoc);
		}
		return newDoc;
	};

	const upsertObjectFromFauna = (
		doc: Functions<MainType, ReplaceType, UpdateType>,
		tempDocId?: string
	): Functions<MainType, ReplaceType, UpdateType> => {
		const index = current.findIndex((u) => $state.is(u.id, tempDocId || doc.id));
		const newDoc = new Proxy(doc, createDocumentHandler(tempDocId || doc.id));

		if (index > -1) {
			if (!isEqual(current[index], newDoc)) {
				addToPast();
				current[index] = newDoc;
			}
		} else {
			addToPast();
			current.push(newDoc);
		}
		toLocalStorage();
		return newDoc;
	};

	const deleteObject = (id: string) => {
		const index = current.findIndex((u) => $state.is(u.id, id));
		if (index !== -1) {
			addToPast();
			current.splice(index, 1);
			toLocalStorage();
		}
	};

	const db = createDatabaseApi(client, COLL_NAME, upsertObjectFromFauna, deleteObject);
	const Collection = createCollectionStore(client);

	s = documentStores;

	const definition = Collection.byName(COLL_NAME);

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
						db.byId(args[0]);

						return new Proxy({ id: args[0] }, createDocumentHandler(args[0]));
					};

				case 'first':
					return () => {
						db.first();
						return current.at(0);
					};

				case 'last':
					return () => {
						db.last();
						return current.at(-1);
					};

				case 'all':
					return () => {
						const result = new Page<Functions<MainType, ReplaceType, UpdateType>>(
							current,
							undefined
						);
						db.all();
						return new Proxy(result, pageHandler);
					};

				case 'where':
					return (filter: Predicate<Document<MainType>>) => {
						const result = new Page(getObjects(filter), undefined);
						db.where(filter);
						return new Proxy(result, pageHandler);
					};

				case 'firstWhere':
					return (filter: Predicate<Document<MainType>>) => {
						db.firstWhere(filter);
						return getObjects(filter).at(0);
					};

				case 'create':
					return (document: Document_Create<CreateType>) => {
						const optimisticResult = upsertObjectFromClient(document);
						db.create({ ...document, id: optimisticResult.id }, definition);

						return optimisticResult;
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

	const createDocumentHandler = (id: string) => {
		return {
			get(target: any, prop: any, receiver: any): any {
				const existingDoc = $state(current.find((doc) => doc.id === id) || {});

				// Special handling for accessing the whole object
				if (prop === Symbol.toPrimitive) {
					return (hint) => {
						if (hint === 'string') {
							return JSON.stringify(existingDoc);
						}
						return Object.keys(existingDoc).length > 0 ? existingDoc : undefined;
					};
				}

				// For regular property access
				if (prop in existingDoc) {
					return existingDoc[prop as keyof typeof existingDoc];
				}

				switch (prop) {
					/**
					 * We only need to proxy update, replace and delete because they don't exist on the Document. In a 2nd step we MAYBE need to proxy also the Document References to return the document from the store instead of the function itself.
					 */
					case 'update':
						return (doc: Document_Update<UpdateType>): void => {
							updateObject(target.id, doc);
							db.update(target.id, doc, definition);
						};
					case 'replace':
						return (doc: Document_Replace<ReplaceType>): void => {
							replaceObject(target.id, doc);
							db.replace(target.id, doc, definition);
						};
					case 'delete':
						return () => {
							deleteObject(target.id);
						};
					default:
						return Reflect.get(target, prop, receiver);
				}
			},
			ownKeys(target) {
				return Reflect.ownKeys(current.find((doc) => doc.id === id) || {});
			},
			getOwnPropertyDescriptor(target, prop) {
				const latestData = $state(current.find((doc) => doc.id === id) || {});
				// If the property is a symbol, return undefined
				if (prop instanceof Symbol) {
					return undefined;
				}

				// For regular property access
				if (prop in latestData) {
					return (
						Reflect.getOwnPropertyDescriptor(latestData, prop) || {
							value: latestData[prop as keyof typeof latestData],
							writable: true,
							enumerable: true,
							configurable: true
						}
					);
				}

				return undefined;
			}
		};
	};

	const getObjects = (
		filter: Predicate<Document<MainType>>
	): Functions<MainType, ReplaceType, UpdateType>[] => {
		return current.filter(filter);
	};

	const updateObject = (id: string, fields: Document_Update<UpdateType>) => {
		const doc = current.find((u) => $state.is(u.id, id));
		if (doc) {
			addToPast();
			const converted = docUpdateToDoc(doc, fields, definition, s);
			Object.assign(doc, converted);
			toLocalStorage();

			return doc;
		}
	};

	const replaceObject = (id: string, fields: Document_Replace<ReplaceType>) => {
		const doc = current.find((u) => $state.is(u.id, id));
		if (doc) {
			addToPast();
			const converted = docReplaceToDoc(doc, fields, definition, s);
			Object.assign(doc, converted);
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

	fromLocalStorage();
	return new Proxy({}, createStoreHandler) as unknown as CreateDocumentStore<
		TypeMapping[K]['main'],
		TypeMapping[K]['create'],
		TypeMapping[K]['replace'],
		TypeMapping[K]['update']
	>;
};
