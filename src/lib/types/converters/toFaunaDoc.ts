import type { QueryValueObject } from 'fauna';
import { TEMP_ID_PREFIX, type Collection, type Document_Create } from '../types';
import { toFaunaValue } from './toFaunaValue';

export const toFaunaDoc = <T extends QueryValueObject>(
	doc: Document_Create<T>,
	collection: Collection
) => {
	const faunaDocData: QueryValueObject = {
		ttl: doc.ttl || null
	};

	if (doc.id && !doc.id?.startsWith(TEMP_ID_PREFIX)) {
		faunaDocData.id = doc.id;
	}

	Object.entries(collection?.fields || {}).forEach(([fieldName, fieldValue]) => {
		const value = doc[fieldName];

		if (value !== undefined) {
			faunaDocData[fieldName] = toFaunaValue(value, fieldValue);
		}
	});

	return faunaDocData;
};
