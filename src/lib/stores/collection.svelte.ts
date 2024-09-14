import {
	PageInternal,
	type Collection,
	type Collection_Create,
	type Collection_Replace,
	type Collection_Update,
	type NamedDocument,
	type NamedDocument_Create,
	type NamedDocument_Replace,
	type NamedDocument_Update,
	type NamedFunctions,
	type Page,
	type Predicate
} from '$lib/types/types';
import { Client, Module, TimeStub } from 'fauna';
import { storage } from './_shared/local-storage';
import type { OrderList } from './_shared/order';
import { createDatabaseApi } from '$lib/database/fauna';
import isEqual from 'lodash.isequal';

const COLL_NAME = 'Collection';

const documentHandlerMemoizedByName = (() => {
	console.log('collection.svelte.ts | documentHandlerMemoizedByName 1');
	const cache = new Map();
	return (name: string) => {
		console.log('collection.svelte.ts | documentHandlerMemoizedByName 2');
		if (!cache.has(name)) {
			console.log('collection.svelte.ts | documentHandlerMemoizedByName 2-if');
			cache.set(name, new Proxy({}, createDocumentHandler(name)));
		}
		console.log('collection.svelte.ts | documentHandlerMemoizedByName 3 | collection.svelte.ts');
		return cache.get(name);
	};
})();

type CreateCollectionStore = {
	byName: (name: string) => NamedFunctions<Collection, Collection_Replace, Collection_Update>;
	first: () => NamedFunctions<Collection, Collection_Replace, Collection_Update>;
	last: () => NamedFunctions<Collection, Collection_Replace, Collection_Update>;
	all: () => Page<NamedFunctions<Collection, Collection_Replace, Collection_Update>>;
	where: (
		filter: Predicate<NamedDocument<Collection>>
	) => Page<NamedFunctions<Collection, Collection_Replace, Collection_Update>>;
	create: (
		doc: NamedDocument<Collection_Create>
	) => NamedFunctions<Collection, Collection_Replace, Collection_Update>;

	destroy: () => void;
};

const createDocumentHandler = (name: string) => {
	return {
		get(target: any, prop: any, receiver: any): any {
			const latestData =
				collection.filter((doc) => doc.name === name).at(0) ||
				({} as NamedFunctions<Collection, Collection_Replace, Collection_Update>);

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
					return (doc: NamedDocument_Update<Collection_Update>): void => {
						console.log('update target', target.name);
						return updateObject(target.name, doc);
					};
				case 'replace':
					return (doc: NamedDocument_Replace<Collection_Replace>): void => {
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
			console.log('collection createDocumentHandler *ownKeys*');
			return Reflect.ownKeys(collection.filter((doc) => doc.name === name).at(0) || {});
		},
		getOwnPropertyDescriptor(target: any, prop: any) {
			const latestData = collection.filter((doc) => doc.name === name).at(0) || {};
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

let collection = $state<NamedFunctions<Collection, Collection_Replace, Collection_Update>[]>([]);

const toLocalStorage = () => {
	storage.set(COLL_NAME, collection);
};

const updateObject = (name: string, fields: NamedDocument_Update<Collection_Update>) => {
	const doc = collection.find((doc) => doc.name == name);
	if (doc) {
		Object.assign(doc, fields);
		toLocalStorage();
	}
};

const replaceObject = (name: string, fields: NamedDocument_Replace<Collection_Replace>) => {
	const index = collection.findIndex((doc) => doc.name == name);
	if (index !== -1) {
		Object.assign(collection[index], fields);
		Object.keys(collection[index]).forEach((key) => {
			if (!(key in fields)) {
				if (key !== 'id' && key !== 'ts' && key !== 'coll') {
					delete collection[index][key];
				}
			}
		});
		toLocalStorage();
	}
};

const deleteObject = (name: string) => {
	const index = collection.findIndex((doc) => doc.name == name);
	if (index !== -1) {
		collection.splice(index, 1);
		toLocalStorage();
	}
};

const upsertObjectFromClient = (
	clientDoc: NamedDocument_Create<Collection_Create>
): NamedFunctions<Collection, Collection_Replace, Collection_Update> => {
	const index = collection.findIndex((doc) => doc.name == clientDoc.name);

	const docData = {
		...clientDoc,
		ts: TimeStub.fromDate(new Date()),
		coll: new Module(COLL_NAME)
	} as NamedFunctions<Collection, Collection_Replace, Collection_Update>;

	if (index > -1) {
		if (!isEqual(collection[index], docData)) {
			collection[index] = docData;
		}
	} else {
		collection.push(docData);
	}
	toLocalStorage();

	return documentHandlerMemoizedByName(docData.name);
};

const upsertObjectFromStorage = (
	storageDoc: NamedFunctions<Collection, Collection_Replace, Collection_Update>
): NamedFunctions<Collection, Collection_Replace, Collection_Update> => {
	console.log('collection.svelte.ts | upsertObjectFromStorage', storageDoc);
	const index = collection.findIndex((u) => u.name == storageDoc.name);

	if (index > -1) {
		if (!isEqual(collection[index], storageDoc)) {
			collection[index] = storageDoc;
		}
	} else {
		collection.push(storageDoc);
	}

	return documentHandlerMemoizedByName(storageDoc.name);
};

const upsertObjectFromFauna = (
	faunaDoc: NamedFunctions<Collection, Collection_Replace, Collection_Update>
): NamedFunctions<Collection, Collection_Replace, Collection_Update> => {
	console.log('collection.svelte | upsertObjectFromFauna');

	const index = collection.findIndex((u) => u.name == faunaDoc.name);

	if (index > -1) {
		if (!isEqual(collection[index], faunaDoc)) {
			collection[index] = faunaDoc;
		}
	} else {
		collection.push(faunaDoc);
	}

	toLocalStorage();

	return documentHandlerMemoizedByName(faunaDoc.name);
};

const fromLocalStorage = () => {
	console.log('collection.svelte.ts L226 | fromLocalStorage');
	const parsedDocuments =
		storage.get<NamedFunctions<Collection, Collection_Replace, Collection_Update>>(COLL_NAME);
	console.log(parsedDocuments);
	if (parsedDocuments) {
		parsedDocuments.forEach((parsedDocument) => {
			upsertObjectFromStorage(parsedDocument);
		});
	}
};

export const createCollectionStore = (client: Client): CreateCollectionStore => {
	const db = createDatabaseApi(client, 'Collection', upsertObjectFromFauna, deleteObject);

	const storeHandler = {
		get(target: any, prop: any, receiver: any): any {
			switch (prop) {
				case 'byName':
					return (name: string) => {
						console.log('collection.svelte.ts L245 | Collection.byName:', name);
						// return new Proxy({}, createDocumentHandler(name));
						db.byName(name);
						return documentHandlerMemoizedByName(name);
					};

				case 'first':
					return () => {
						return collection.at(0);
					};

				case 'last':
					return () => {
						return collection.at(-1);
					};

				case 'all':
					return () => {
						const result = new PageInternal<
							NamedFunctions<Collection, Collection_Replace, Collection_Update>
						>(collection, undefined);
						db.all();
						return new Proxy(result, pageHandler);
					};

				case 'where':
					return (filter: Predicate<NamedDocument<Collection>>) => {
						const result = new PageInternal(collection.filter(filter), undefined);
						// fetchWhereFromDB(result);
						return new Proxy(result, pageHandler);
					};

				case 'create':
					return (document: NamedDocument_Create<Collection_Create>) => {
						return upsertObjectFromClient(document);
					};
			}
		}
	};

	const pageHandler = {
		get(
			target: PageInternal<NamedDocument<Collection>>,
			prop: keyof PageInternal<NamedDocument<Collection>>,
			receiver: any
		): any {
			switch (prop) {
				case 'data':
					return target.data;
				case 'after':
					return target.after;
				case 'order':
					return (...orderList: OrderList<NamedDocument<Collection>>[]) => {
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
