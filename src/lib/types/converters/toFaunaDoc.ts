import type { QueryValueObject } from 'fauna';
import { TEMP_ID_PREFIX, type Collection, type Document } from '../types';

import { toFaunaValue } from './toFaunaValue';

export const toFaunaDoc = <T extends QueryValueObject>(
	doc: Document<T>,
	collection: Collection
) => {
	const fauanDocData: QueryValueObject = {
		ttl: doc.ttl || null
	};

	if (!doc.id?.startsWith(TEMP_ID_PREFIX)) {
		fauanDocData.id = doc.id;
	}

	Object.entries(collection?.fields || {}).forEach(([fieldName, fieldValue]) => {
		const value = doc[fieldName];

		if (value !== undefined) {
			fauanDocData[fieldName] = toFaunaValue(value, fieldValue);
		}
	});

	return fauanDocData;
};
