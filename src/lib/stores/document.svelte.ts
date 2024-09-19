import { type QueryValueObject, Client } from 'fauna';
import type { OrderList } from './_shared/order';
import { redo, undo } from './_shared/history';
import {
	type Predicate,
	type Functions,
	type Document,
	type Document_Create,
	type Document_Replace,
	type Document_Update,
	type Stores,
	type Collection,
	type NamedDocument,
	type Page,
	PageInternal
} from '$lib/types/types';
import { storage } from './_shared/local-storage';
import type { UserCollectionsTypeMapping } from '$fauna-typed/types';
import { docCreateToDoc, docReplaceToDoc, docUpdateToDoc } from '$lib/types/converters';
import { createDatabaseApi } from '$lib/database/fauna';
import isEqual from 'lodash.isequal';

const DEFAULT_PAGE_SIZE = 16;

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

export const createDocumentStore = <K extends keyof UserCollectionsTypeMapping>(
	collectionName: K,
	s: Stores,
	client: Client
): CreateDocumentStore<
	UserCollectionsTypeMapping[K]['main'],
	UserCollectionsTypeMapping[K]['create'],
	UserCollectionsTypeMapping[K]['replace'],
	UserCollectionsTypeMapping[K]['update']
> => {
	type EnforceQueryValueObjectExtension<T> = T extends QueryValueObject ? T : never;
	type MainType = EnforceQueryValueObjectExtension<UserCollectionsTypeMapping[K]['main']>;
	type CreateType = EnforceQueryValueObjectExtension<UserCollectionsTypeMapping[K]['create']>;
	type ReplaceType = EnforceQueryValueObjectExtension<UserCollectionsTypeMapping[K]['replace']>;
	type UpdateType = EnforceQueryValueObjectExtension<UserCollectionsTypeMapping[K]['update']>;
	const COLL_NAME: string = collectionName;

	const upsertObjectFromClient = (
		doc: Document_Create<CreateType>
	): Functions<MainType, ReplaceType, UpdateType> => {
		const index = current.findIndex((u) => u.id == doc.id);

		const newDoc: Functions<MainType, ReplaceType, UpdateType> = new Proxy(
			docCreateToDoc(doc, s.Collection.byName(COLL_NAME), s),
			documentHandler
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
		const index = current.findIndex((u) => u.id == doc.id);
		const newDoc = new Proxy(doc, documentHandler);

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
		const index = current.findIndex((u) => u.id == tempDocId || doc.id);
		const newDoc = new Proxy(doc, documentHandler);

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

	const updateObject = (id: string, fields: Document_Update<UpdateType>) => {
		const doc = current.find((u) => u.id == id);
		if (doc) {
			addToPast();
			const converted = docUpdateToDoc(doc, fields, s.Collection.byName(COLL_NAME), s);
			Object.assign(doc, converted);
			toLocalStorage();

			return doc;
		}
	};

	const replaceObject = (id: string, fields: Document_Replace<ReplaceType>) => {
		const doc = current.find((u) => u.id == id);
		if (doc) {
			addToPast();
			const converted = docReplaceToDoc(doc, fields, s.Collection.byName(COLL_NAME), s);
			Object.assign(doc, converted);
			toLocalStorage();
		}
	};

	const deleteObject = (id: string) => {
		const index = current.findIndex((u) => u.id == id);
		if (index !== -1) {
			addToPast();
			current.splice(index, 1);
			toLocalStorage();
		}
	};

	const db = createDatabaseApi(client, COLL_NAME, upsertObjectFromFauna, deleteObject);

	console.log('document.svelte.ts L165 | COLL_NAME', COLL_NAME);
	console.log('document.svelte.ts | documentStores: ', s);

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
						return current.filter((doc) => doc.id === args[0]).at(0);
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
						const result = new PageInternal<Functions<MainType, ReplaceType, UpdateType>>(
							current.slice(0, DEFAULT_PAGE_SIZE),
							{} as PageInternal<Functions<MainType, ReplaceType, UpdateType>>
						);

						const resultState = $state({ ...result }) as PageInternal<
							Functions<MainType, ReplaceType, UpdateType>
						>;

						db.all().then((afterCursor: string | undefined) => {
							if (afterCursor !== resultState.afterCursor) {
								resultState.afterCursor = afterCursor;
							}
						});

						return new Proxy(resultState, pageHandler);
					};

				case 'where':
					return (filter: Predicate<Document<MainType>>) => {
						const result = new PageInternal(current.filter(filter), undefined);
						db.where(filter);
						return new Proxy(result as unknown as PageInternal<Document<MainType>>, pageHandler);
					};

				case 'firstWhere':
					return (filter: Predicate<Document<MainType>>) => {
						db.firstWhere(filter);
						return current.filter(filter).at(0);
					};

				case 'create':
					return (document: Document_Create<CreateType>) => {
						const optimisticResult = upsertObjectFromClient(document);
						db.create({ ...document, id: optimisticResult.id }, s.Collection.byName(COLL_NAME));

						return optimisticResult;
					};

				case 'definition':
					// TODO: Get definition from Fauna
					// return new Proxy(s.Collection.byName(COLL_NAME), collectionHandler);
					console.log('document.svelte.ts | Collection: ', s.Collection);
					return s.Collection.byName(COLL_NAME);

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
			target: PageInternal<Document<MainType>>,
			prop: keyof PageInternal<Document<MainType>>,
			receiver: any
		): any {
			switch (prop) {
				case 'data':
					return target.data;
				case 'after': {
					const afterValue = target.afterCursor;
					if (afterValue) {
						db.paginate(afterValue).then(
							(paginatedRes: PageInternal<Document<MainType>> | undefined) => {
								if (paginatedRes) {
									if (!target.after) {
										// Initialize the after property
										const after = new PageInternal<Document<MainType>>(
											[],
											{} as PageInternal<Document<MainType>>
										);

										// Set the after property in target
										target.after = {
											...after
										};
									}
									if (
										target.after &&
										(target?.after?.afterCursor !== paginatedRes?.after ||
											!isEqual(target.after?.data, paginatedRes.data))
									) {
										target.after.afterCursor = paginatedRes?.after as unknown as string;
										target.after.data = paginatedRes.data?.map(
											(d) => new Proxy(d, documentHandler)
										);
									}
								}
							}
						);

						return new Proxy(target.after || {}, pageHandler);
					}

					return null;
				}
				case 'order':
					return (...orderings: OrderList<Document<MainType>>[]) => {
						const page = new PageInternal<Document<MainType>>([]);
						const sortedData = page.order([...(target.data || [])], ...orderings); // Use the Page class's order method

						return new Proxy(
							{ ...target, data: sortedData } as unknown as PageInternal<Document<MainType>>,
							pageHandler
						); // Return a proxy to allow chaining
					};
				default:
					return Reflect.get(target, prop, receiver);
			}
		}
	};

	const documentHandler = {
		get(target: any, prop: any, receiver: any): any {
			switch (prop) {
				/**
				 * We only need to proxy update, replace and delete because they don't exist on the Document. In a 2nd step we MAYBE need to proxy also the Document References to return the document from the store instead of the function itself.
				 */
				case 'update':
					return (doc: Document_Update<UpdateType>): void => {
						console.log('update target', target.id);
						updateObject(target.id, doc);
						db.update(target.id, doc, s.Collection.byName(COLL_NAME));
					};
				case 'replace':
					return (doc: Document_Replace<ReplaceType>): void => {
						console.log('replace target', target.id);
						replaceObject(target.id, doc);
						db.replace(target.id, doc, s.Collection.byName(COLL_NAME));
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
		UserCollectionsTypeMapping[K]['main'],
		UserCollectionsTypeMapping[K]['create'],
		UserCollectionsTypeMapping[K]['replace'],
		UserCollectionsTypeMapping[K]['update']
	>;
};
