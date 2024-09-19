import {
	PageInternal,
	type NamedDocument,
	type NamedDocument_Create,
	type NamedDocument_Replace,
	type NamedDocument_Update,
	type NamedFunctions,
	type Page,
	type Predicate,
	type SystemCollectionsTypeMapping
} from '$lib/types/types';
import { Client, Module, TimeStub, type QueryValueObject } from 'fauna';
import { storage } from './_shared/local-storage';
import type { OrderList } from './_shared/order';
import { createDatabaseApi } from '$lib/database/fauna';
import isEqual from 'lodash.isequal';

type CreateSystemCollectionStore<
	T extends QueryValueObject,
	T_Create extends QueryValueObject,
	T_Replace extends QueryValueObject,
	T_Update extends QueryValueObject
> = {
	byName: (name: string) => NamedFunctions<T, T_Replace, T_Update>;
	first: () => NamedFunctions<T, T_Replace, T_Update>;
	last: () => NamedFunctions<T, T_Replace, T_Update>;
	all: () => Page<NamedFunctions<T, T_Replace, T_Update>>;
	where: (filter: Predicate<NamedDocument<T>>) => Page<NamedFunctions<T, T_Replace, T_Update>>;
	create: (doc: NamedDocument<T_Create>) => NamedFunctions<T, T_Replace, T_Update>;

	destroy: () => void;
};

export const createSystemCollectionStore = async <K extends keyof SystemCollectionsTypeMapping>(
	collectionName: K,
	client: Client
): Promise<
	CreateSystemCollectionStore<
		SystemCollectionsTypeMapping[K]['main'],
		SystemCollectionsTypeMapping[K]['create'],
		SystemCollectionsTypeMapping[K]['replace'],
		SystemCollectionsTypeMapping[K]['update']
	>
> => {
	type EnforceQueryValueObjectExtension<T> = T extends QueryValueObject ? T : never;
	type T = EnforceQueryValueObjectExtension<SystemCollectionsTypeMapping[K]['main']>;
	type T_Create = EnforceQueryValueObjectExtension<SystemCollectionsTypeMapping[K]['create']>;
	type T_Replace = EnforceQueryValueObjectExtension<SystemCollectionsTypeMapping[K]['replace']>;
	type T_Update = EnforceQueryValueObjectExtension<SystemCollectionsTypeMapping[K]['update']>;

	console.log('system-collection.svelte.ts | collectionName: ', collectionName);
	const COLL_NAME: string = collectionName;

	let systemCollection = $state<NamedFunctions<T, T_Replace, T_Update>[]>([]);

	const documentHandlerMemoizedByName = (() => {
		const cache = new Map();
		return (name: string) => {
			if (!cache.has(name)) {
				cache.set(name, new Proxy({}, createDocumentHandler(name)));
			}
			return cache.get(name);
		};
	})();

	const createDocumentHandler = (name: string) => {
		return {
			get(target: any, prop: any, receiver: any): any {
				const latestData =
					systemCollection.filter((doc) => doc.name === name).at(0) ||
					({} as NamedFunctions<T, T_Replace, T_Update>);

				// Special handling for accessing the whole object
				if (prop === Symbol.toPrimitive) {
					return (hint: any) => {
						if (hint === 'string') {
							return JSON.stringify(latestData);
						}
						return Object.keys(latestData).length > 0 ? latestData : undefined;
					};
				}

				// For regular property access
				if (prop in latestData) {
					return latestData[prop];
				}

				switch (prop) {
					/**
					 * We only need to proxy update, replace and delete because they don't exist on the Document. In a 2nd step we MAYBE need to proxy also the Document References to return the document from the store instead of the function itself.
					 */
					case 'update':
						return (doc: NamedDocument_Update<T_Update>): void => {
							console.log('update target', target.name);
							return updateObject(target.name, doc);
						};
					case 'replace':
						return (doc: NamedDocument_Replace<T_Replace>): void => {
							console.log('replace target', target.name);
							return replaceObject(target.name, doc);
						};
					case 'delete':
						return () => {
							console.log('delete target', target.name);
							deleteObject(target.name);
						};
					default:
						return Reflect.get(target, prop, receiver);
				}
			},
			ownKeys(target: any) {
				return Reflect.ownKeys(systemCollection.filter((doc) => doc.name === name).at(0) || {});
			},
			getOwnPropertyDescriptor(target: any, prop: any) {
				const latestData = systemCollection.filter((doc) => doc.name === name).at(0) || {};
				if (prop in latestData) {
					return {
						value: latestData[prop],
						writable: true,
						enumerable: true,
						configurable: true
					};
				}
				return undefined;
			}
		};
	};

	const toLocalStorage = () => {
		storage.set(COLL_NAME, systemCollection);
	};

	const updateObject = (name: string, fields: NamedDocument_Update<T_Update>) => {
		const doc = systemCollection.find((doc) => doc.name == name);
		if (doc) {
			Object.assign(doc, fields);
			toLocalStorage();
		}
	};

	const replaceObject = (name: string, fields: NamedDocument_Replace<T_Replace>) => {
		const index = systemCollection.findIndex((doc) => doc.name == name);
		if (index !== -1) {
			Object.assign(systemCollection[index], fields);
			Object.keys(systemCollection[index]).forEach((key) => {
				if (!(key in fields)) {
					if (key !== 'id' && key !== 'ts' && key !== 'coll') {
						delete systemCollection[index][key];
					}
				}
			});
			toLocalStorage();
		}
	};

	const deleteObject = (name: string) => {
		const index = systemCollection.findIndex((doc) => doc.name == name);
		if (index !== -1) {
			systemCollection.splice(index, 1);
			toLocalStorage();
		}
	};

	const upsertObjectFromClient = (
		clientDoc: NamedDocument_Create<T_Create>
	): NamedFunctions<T, T_Replace, T_Update> => {
		const index = systemCollection.findIndex((doc) => doc.name == clientDoc.name);

		const docData = {
			...clientDoc,
			ts: TimeStub.fromDate(new Date()),
			coll: new Module(COLL_NAME)
		} as NamedFunctions<T, T_Replace, T_Update>;

		if (index > -1) {
			if (!isEqual(systemCollection[index], docData)) {
				systemCollection[index] = docData;
			}
		} else {
			systemCollection.push(docData);
		}
		toLocalStorage();

		return documentHandlerMemoizedByName(docData.name);
	};

	const upsertObjectFromStorage = (
		storageDoc: NamedFunctions<T, T_Replace, T_Update>
	): NamedFunctions<T, T_Replace, T_Update> => {
		console.log('system-collection.svelte.ts | upsertObjectFromStorage', storageDoc);
		const index = systemCollection.findIndex((u) => u.name == storageDoc.name);

		if (index > -1) {
			if (!isEqual(systemCollection[index], storageDoc)) {
				systemCollection[index] = storageDoc;
			}
		} else {
			systemCollection.push(storageDoc);
		}

		return documentHandlerMemoizedByName(storageDoc.name);
	};

	const upsertObjectFromFauna = (
		faunaDoc: NamedFunctions<T, T_Replace, T_Update>
	): NamedFunctions<T, T_Replace, T_Update> => {
		console.log('collection.svelte | upsertObjectFromFauna');

		const index = systemCollection.findIndex((u) => u.name == faunaDoc.name);

		if (index > -1) {
			if (!isEqual(systemCollection[index], faunaDoc)) {
				systemCollection[index] = faunaDoc;
			}
		} else {
			systemCollection.push(faunaDoc);
		}

		toLocalStorage();

		return documentHandlerMemoizedByName(faunaDoc.name);
	};

	const fromLocalStorage = () => {
		const parsedDocuments = storage.get<NamedFunctions<T, T_Replace, T_Update>>(COLL_NAME);
		console.log(
			'system-collection.svelte.ts | fromLocalStorage | parsedDocuments: ',
			parsedDocuments
		);
		if (parsedDocuments) {
			parsedDocuments.forEach((parsedDocument) => {
				upsertObjectFromStorage(parsedDocument);
			});
		}
	};

	const db = createDatabaseApi(client, COLL_NAME, upsertObjectFromFauna, deleteObject);

	const storeHandler = {
		get(target: any, prop: any, receiver: any): any {
			switch (prop) {
				case 'byName':
					return (name: string) => {
						console.log('system-collection.svelte.ts L241 | COLL_NAME: ', COLL_NAME);
						console.log('system-collection.svelte.ts L242 | ', COLL_NAME, '.byName:', name);
						db.byName(name);
						return documentHandlerMemoizedByName(name);
					};

				case 'first':
					return () => {
						return systemCollection.at(0);
					};

				case 'last':
					return () => {
						return systemCollection.at(-1);
					};

				case 'all':
					return () => {
						console.log('system-collection.svelte.ts | storeHandler | all');
						const result = new PageInternal<NamedFunctions<T, T_Replace, T_Update>>(
							systemCollection,
							undefined
						);
						db.all();
						return new Proxy(result, pageHandler);
					};

				case 'where':
					return (filter: Predicate<NamedDocument<T>>) => {
						const result = new PageInternal(systemCollection.filter(filter), undefined);
						// fetchWhereFromDB(result);
						return new Proxy(result, pageHandler);
					};

				case 'create':
					return (document: NamedDocument_Create<T_Create>) => {
						return upsertObjectFromClient(document);
					};
			}
		}
	};

	const pageHandler = {
		get(
			target: PageInternal<NamedDocument<T>>,
			prop: keyof PageInternal<NamedDocument<T>>,
			receiver: any
		): any {
			switch (prop) {
				case 'data':
					return target.data;
				case 'after':
					return target.after;
				case 'order':
					return (...orderList: OrderList<NamedDocument<T>>[]) => {
						target.order(...orderList); // Use the Page class's order method
						return new Proxy(target, pageHandler); // Return a proxy to allow chaining
					};
				default:
					return Reflect.get(target, prop, receiver);
			}
		}
	};

	fromLocalStorage();
	return new Proxy({}, storeHandler);
};
