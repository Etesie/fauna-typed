import {
	Page,
	type Collection,
	type Collection_Create,
	type Collection_Replace,
	type Collection_Update,
	type NamedDocument,
	type NamedDocument_Create,
	type NamedDocument_Replace,
	type NamedDocument_Update,
	type NamedFunctions,
	type Predicate
} from '$lib/types/types';
import { Client, Module, TimeStub } from 'fauna';
import { storage } from './_shared/local-storage';
import type { Ordering } from './_shared/order';
import { createDatabaseApi } from '$lib/database/fauna';

const COLL_NAME = 'Collection';

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

const documentHandler = {
	get(target: any, prop: any, receiver: any): any {
		// console.log('document handler accessed');
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
	}
};

let collection = $state<NamedFunctions<Collection, Collection_Replace, Collection_Update>[]>([]);

const toLocalStorage = () => {
	storage.set(COLL_NAME, collection);
};

const getObjects = (
	filter: Predicate<NamedDocument<Collection>>
): NamedFunctions<Collection, Collection_Replace, Collection_Update>[] => {
	return collection.filter(filter);
};

const updateObject = (name: string, fields: NamedDocument_Update<Collection_Update>) => {
	const doc = collection.find((doc) => $state.is(doc.name, name));
	if (doc) {
		Object.assign(doc, fields);
		toLocalStorage();
	}
};

const replaceObject = (name: string, fields: NamedDocument_Replace<Collection_Replace>) => {
	const index = collection.findIndex((doc) => $state.is(doc.name, name));
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
	const index = collection.findIndex((doc) => $state.is(doc.name, name));
	if (index !== -1) {
		collection.splice(index, 1);
		toLocalStorage();
	}
};

const upsertObjectFromClient = (
	clientDoc: NamedDocument_Create<Collection_Create>
): NamedFunctions<Collection, Collection_Replace, Collection_Update> => {
	const index = collection.findIndex((doc) => $state.is(doc.name, clientDoc.name));
	const newDoc = new Proxy(
		{
			...clientDoc,
			ts: TimeStub.fromDate(new Date()),
			coll: new Module(COLL_NAME)
		} as NamedFunctions<Collection, Collection_Replace, Collection_Update>,
		documentHandler
	);

	if (index > -1) {
		collection[index] = newDoc;
	} else {
		collection.push(newDoc);
	}
	toLocalStorage();

	return newDoc;
};

// TODO: REMOVE AFTER TESTING
upsertObjectFromClient({
	name: 'User',
	fields: {
		firstName: {
			signature: 'String'
		},
		lastName: {
			signature: 'String'
		},
		birthdate: {
			signature: 'Date'
		},
		account: {
			signature: 'Array<Ref<Account>>?'
		}
	},
	computed_fields: {
		age: {
			body: '(doc) => (Date.today().difference(doc.birthdate) / 365)',
			signature: 'Number'
		}
	}
});

// upsertObjectFromClient({
// 	name: 'Account',
// 	fields: {
// 		user: {
// 			signature: 'Ref<User>'
// 		},
// 		provider: {
// 			signature: 'String'
// 		},
// 		providerUserId: {
// 			signature: 'String'
// 		}
// 	}
// });

const upsertObjectFromStorage = (
	storageDoc: NamedFunctions<Collection, Collection_Replace, Collection_Update>
): NamedFunctions<Collection, Collection_Replace, Collection_Update> => {
	console.log('\nupsertObjectFromStorage - collection.svelte.ts\n', storageDoc);
	const index = collection.findIndex((u) => $state.is(u.name, storageDoc.name));
	const newDoc = new Proxy(storageDoc, documentHandler);
	if (index > -1) {
		collection[index] = newDoc;
	} else {
		collection.push(newDoc);
	}

	return newDoc;
};

const upsertObjectFromFauna = (
	faunaDoc: NamedFunctions<Collection, Collection_Replace, Collection_Update>
): NamedFunctions<Collection, Collection_Replace, Collection_Update> => {
	const index = collection.findIndex((u) => $state.is(u.name, faunaDoc.name));
	const newDoc = new Proxy(faunaDoc, documentHandler);
	if (index > -1) {
		console.log('\nupsertObjectFromFauna - collection.svelte.ts\n', faunaDoc);
		collection[index] = newDoc;
	} else {
		collection.push(newDoc);
	}

	toLocalStorage();

	return newDoc;
};

const fromLocalStorage = () => {
	console.log('\nfromLocalStorage - collection.svelte.ts L203\n');
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
	const db = createDatabaseApi(client, 'Collection', upsertObjectFromFauna);

	const storeHandler = {
		get(target: any, prop: any, receiver: any): any {
			switch (prop) {
				case 'byName':
					return (name: string) => {
						console.log('byName', name);
						return getObjects((doc) => doc.name === name).at(0);
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
						const result = new Page<
							NamedFunctions<Collection, Collection_Replace, Collection_Update>
						>(collection, undefined);
						db.all();
						return new Proxy(result, pageHandler);
					};

				case 'where':
					return (filter: Predicate<NamedDocument<Collection>>) => {
						const result = new Page(getObjects(filter), undefined);
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
			target: Page<NamedDocument<Collection>>,
			prop: keyof Page<NamedDocument<Collection>>,
			receiver: any
		): any {
			switch (prop) {
				case 'data':
					return target.data;
				case 'after':
					return target.after;
				case 'order':
					return (...orderings: Ordering<NamedDocument<Collection>>[]) => {
						target.order(...orderings); // Use the Page class's order method
						return new Proxy(target, pageHandler); // Return a proxy to allow chaining
					};
				default:
					return Reflect.get(target, prop, receiver);
			}
		}
	};

	fromLocalStorage();
	return new Proxy(collection, storeHandler);
};
