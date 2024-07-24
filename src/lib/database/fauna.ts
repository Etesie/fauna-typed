import type { Functions, Page, Predicate, Document } from '$lib/types/types';
import { Client, fql, type QueryValueObject } from 'fauna';

export type CreateDatabaseApi<T extends QueryValueObject> = {
	all: () => Promise<void>;
	where: (filter: Predicate<Document<T>>) => Promise<void>;
	first: () => Promise<void>;
	firstWhere: (filter: Predicate<Document<T>>) => Promise<void>;
	last: () => Promise<void>;
};

const transformWherePredicateToFauna = <T extends QueryValueObject>(
	filter: Predicate<Document<T>>
) => {
	return filter.toString().replaceAll('return ', '').replaceAll('const ', 'let ');
};

export const createDatabaseApi = <
	T extends QueryValueObject,
	T_Replace extends QueryValueObject,
	T_Update extends QueryValueObject
>(
	client: Client,
	COLL_NAME: string,
	upsertObjectFromFauna: (doc: Functions<T, T_Replace, T_Update>) => void
): CreateDatabaseApi<T> => {
	async function all() {
		try {
			const query = `${COLL_NAME}.all()`;
			// console.log('\nfauna.ts - all:\n', query);
			const response = await client.query<Page<Functions<T, T_Replace, T_Update>>>(fql([query]));
			if (response.data && response.data.data) {
				// Find the data in the store and replace it with the new data. If it doesn't exist, add it.
				// console.log('\nresponse.data.data | fauna.ts L25\n', response.data.data);
				response.data.data.forEach((newDoc) => {
					upsertObjectFromFauna(newDoc);
				});
			}
		} catch (error) {
			console.error('Error fetching document from database:', error);
		}
	}

	async function where(filter: Predicate<Document<T>>) {
		try {
			const query = `${COLL_NAME}.where(${transformWherePredicateToFauna(filter)})`;

			console.log('where:', query);
			const response = await client.query<Page<Functions<T, T_Replace, T_Update>>>(fql([query]));
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

			console.log('first:', query);
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

			console.log('firstWhere:', query);
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

			console.log('last:', query);
			const response = await client.query<Functions<T, T_Replace, T_Update>>(fql([query]));
			if (response.data) {
				// Find the data in the store and replace it with the new data. If it doesn't exist, add it.
				upsertObjectFromFauna(response.data);
			}
		} catch (error) {
			console.error('Error fetching document from database using last:', error);
		}
	}

	return {
		all,
		where,
		first,
		firstWhere,
		last
	};
};
