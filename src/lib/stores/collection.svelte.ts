import {
	Page,
	type Collection,
	type Collection_Create,
	type Collection_Replace,
	type Collection_Update,
	type Functions,
	type NamedDocument,
	type NamedDocument_Create,
	type NamedDocument_Replace,
	type NamedDocument_Update,
	type Predicate
} from '$lib/types/types';
import { Module, TimeStub } from 'fauna';
import { storage } from './_shared/local-storage';
import type { Ordering } from './_shared/order';

const COLL_NAME = 'Collection';

type CreateCollectionStore = {
	init: () => CollectionStore;
	destroy: () => void;
};

type CollectionStore = {
	byName: (
		name: string
	) => Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update>;
	first: () => Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update>;
	last: () => Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update>;
	all: () => Page<Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update>>;
	where: (
		filter: Predicate<NamedDocument<Collection>>
	) => Page<Functions<Collection, Collection_Replace, Collection_Update>>;
	create: (
		doc: NamedDocument<Collection_Create>
	) => Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update>;
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

let collection = $state<
	Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update>[]
>([]);

const toLocalStorage = () => {
	storage.set(COLL_NAME, collection);
};

const getObjects = (
	filter: Predicate<NamedDocument<Collection>>
): Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update>[] => {
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
	newDoc: NamedDocument_Create<Collection_Create>
): Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update> => {
	const index = collection.findIndex((doc) => $state.is(doc.name, newDoc.name));
	const proxiedDoc = new Proxy(
		{
			...newDoc,
			ts: TimeStub.fromDate(new Date()),
			coll: new Module(COLL_NAME)
		} as Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update>,
		documentHandler
	);

	if (index > -1) {
		collection[index] = proxiedDoc;
	} else {
		collection.push(proxiedDoc);
	}
	toLocalStorage();

	const updatedDoc = collection.find((doc) => $state.is(doc.name, proxiedDoc.name));
	if (!updatedDoc) {
		throw new Error('Document not found after upsert');
	}
	return updatedDoc;
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

upsertObjectFromClient({
	name: 'Account',
	fields: {
		user: {
			signature: 'Ref<User>'
		},
		provider: {
			signature: 'String'
		},
		providerUserId: {
			signature: 'String'
		}
	}
});

const upsertObjectFromStorage = (
	storageDoc: Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update>
): Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update> => {
	const index = collection.findIndex((u) => $state.is(u.name, storageDoc.name));
	const proxiedDoc = new Proxy(storageDoc, documentHandler);
	if (index > -1) {
		collection[index] = proxiedDoc;
	} else {
		collection.push(proxiedDoc);
	}
	const updatedDoc = collection.find((u) => $state.is(u.name, storageDoc.name));
	if (!updatedDoc) {
		throw new Error('Document not found after upsert');
	}
	return updatedDoc;
};

const fromLocalStorage = () => {
	const parsedDocuments =
		storage.get<Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update>>(
			COLL_NAME
		);
	if (parsedDocuments) {
		parsedDocuments.forEach((parsedDocument) => {
			upsertObjectFromStorage(parsedDocument);
		});
	}
};

export const createCollectionStore = (): CreateCollectionStore => {
	const storeHandler = {
		get(target: any, prop: any, receiver: any): any {
			switch (prop) {
				case 'byName':
					return (name: string) => {
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
							Functions<NamedDocument<Collection>, Collection_Replace, Collection_Update>
						>(collection, undefined);
						// fetchAllFromDB(result);
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

	return {
		init: () => {
			fromLocalStorage();
			return new Proxy(collection, storeHandler);
		},
		destroy: () => {
			collection = [];
		}
	};
};
