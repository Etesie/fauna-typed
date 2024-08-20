import type { TypeMapping } from '$fauna-typed/types';
import { docToFaunaDoc, docToFaunaReplaceDoc, docToFaunaUpdateDoc } from '$lib/types/converters';
import type {
	Functions,
	Predicate,
	Document,
	Document_Create,
	Collection,
	Document_Update,
	Document_Replace,
	PageInternal
} from '$lib/types/types';
import { Client, fql, type QueryValueObject } from 'fauna';

export type CreateDatabaseApi<T extends QueryValueObject, K extends keyof TypeMapping> = {
	all: () => Promise<string | undefined>;
	paginate: (after: string) => Promise<PageInternal<Document<T>> | undefined>;
	where: (filter: Predicate<Document<T>>) => Promise<void>;
	first: () => Promise<void>;
	firstWhere: (filter: Predicate<Document<T>>) => Promise<void>;
	last: () => Promise<void>;
	create: (
		document: Document_Create<TypeMapping[K]['create']>,
		collection: Collection
	) => Promise<void>;
	update: (
		id: string,
		fields: Document_Update<TypeMapping[K]['update']>,
		collection: Collection
	) => Promise<void>;
	replace: (
		id: string,
		fields: Document_Replace<TypeMapping[K]['replace']>,
		collection: Collection
	) => Promise<void>;
};

const transformWherePredicateToFauna = <T extends QueryValueObject>(
	filter: Predicate<Document<T>>
) => {
	return filter.toString().replaceAll('return ', '').replaceAll('const ', 'let ');
};

export const createDatabaseApi = <
	T extends QueryValueObject,
	T_Replace extends QueryValueObject,
	T_Update extends QueryValueObject,
	K extends keyof TypeMapping
>(
	client: Client,
	COLL_NAME: string,
	upsertObjectFromFauna: (doc: Functions<T, T_Replace, T_Update>, tempDocId?: string) => void
): CreateDatabaseApi<T, K> => {
	async function all() {
		try {
			const query = `${COLL_NAME}.all()`;
			const response = await client.query<PageInternal<Functions<T, T_Replace, T_Update>>>(
				fql([query])
			);
			if (response.data && response.data.data) {
				// Find the data in the store and replace it with the new data. If it doesn't exist, add it.
				response.data.data.forEach((newDoc) => {
					upsertObjectFromFauna(newDoc);
				});
				return response.data.after as string | undefined;
			}
		} catch (error) {
			console.error('Error fetching document from database:', error);
			return undefined;
		}
	}

	async function paginate(after: string): Promise<PageInternal<Document<T>> | undefined> {
		try {
			const query = `Set.paginate("${after}")`;
			const response = await client.query<PageInternal<Functions<T, T_Replace, T_Update>>>(
				fql([query])
			);

			if (response.data) {
				return response.data as unknown as PageInternal<Document<T>>;
			}
		} catch (error) {
			console.error('Error fetching document from database:', error);
			return undefined;
		}
	}

	async function where(filter: Predicate<Document<T>>) {
		try {
			const query = `${COLL_NAME}.where(${transformWherePredicateToFauna(filter)})`;

			const response = await client.query<PageInternal<Functions<T, T_Replace, T_Update>>>(
				fql([query])
			);
			if (response.data) {
				// Find the data in the store and replace it with the new data. If it doesn't exist, add it.
				response.data.data.forEach((newDoc) => {
					upsertObjectFromFauna(newDoc);
				});
			}
		} catch (error) {
			console.error('Error fetching document from database:', error);
		}
	}

	async function first() {
		try {
			const query = `${COLL_NAME}.all().first()`;

			const response = await client.query<Functions<T, T_Replace, T_Update>>(fql([query]));
			if (response.data) {
				// Find the data in the store and replace it with the new data. If it doesn't exist, add it.
				upsertObjectFromFauna(response.data);
			}
		} catch (error) {
			console.error('Error fetching document from database using first:', error);
		}
	}

	async function firstWhere(filter: Predicate<Document<T>>) {
		try {
			const query = `${COLL_NAME}.firstWhere(${transformWherePredicateToFauna(filter)})`;

			const response = await client.query<Functions<T, T_Replace, T_Update>>(fql([query]));
			if (response.data) {
				// Find the data in the store and replace it with the new data. If it doesn't exist, add it.
				upsertObjectFromFauna(response.data);
			}
		} catch (error) {
			console.error('Error fetching document from database using firstWhere:', error);
		}
	}

	async function last() {
		try {
			const query = `${COLL_NAME}.all().last()`;

			const response = await client.query<Functions<T, T_Replace, T_Update>>(fql([query]));
			if (response.data) {
				// Find the data in the store and replace it with the new data. If it doesn't exist, add it.
				upsertObjectFromFauna(response.data);
			}
		} catch (error) {
			console.error('Error fetching document from database using last:', error);
		}
	}

	async function create(
		document: Document_Create<TypeMapping[K]['create']>,
		collection: Collection
	) {
		try {
			const query = `${COLL_NAME}.create(${docToFaunaDoc(document, collection)})`;

			const response = await client.query<Functions<T, T_Replace, T_Update>>(fql([query]));
			if (response.data) {
				// Find the data in the store and replace it with the new data. If it doesn't exist, add it.
				upsertObjectFromFauna(response.data, document.id);
			}
		} catch (error) {
			console.error('Error fetching document from database using create:', error);
		}
	}

	async function update(
		id: string,
		fields: Document_Update<TypeMapping[K]['update']>,
		collection: Collection
	) {
		try {
			const query = `${COLL_NAME}.byId("${id}")!.update(${docToFaunaUpdateDoc(fields, collection)})`;

			const response = await client.query<Functions<T, T_Replace, T_Update>>(fql([query]));
			if (response.data) {
				// Find the data in the store and replace it with the new data. If it doesn't exist, add it.
				upsertObjectFromFauna(response.data);
			}
		} catch (error) {
			console.error('Error in updating in database using update:', error);
		}
	}

	async function replace(
		id: string,
		fields: Document_Replace<TypeMapping[K]['replace']>,
		collection: Collection
	) {
		try {
			const query = `${COLL_NAME}.byId("${id}")!.replace(${docToFaunaReplaceDoc(fields, collection)})`;

			const response = await client.query<Functions<T, T_Replace, T_Update>>(fql([query]));
			if (response.data) {
				// Find the data in the store and replace it with the new data. If it doesn't exist, add it.
				upsertObjectFromFauna(response.data);
			}
		} catch (error) {
			console.error('Error in updating in database using replace:', error);
		}
	}

	return {
		all,
		paginate,
		where,
		first,
		firstWhere,
		last,
		create,
		update,
		replace
	};
};
