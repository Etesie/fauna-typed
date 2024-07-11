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

	Object.keys(collection?.fields || {}).forEach((fieldName) => {
		const fieldValue = doc[fieldName];

		if (fieldValue !== undefined) {
			fauanDocData[fieldName] = toFaunaValue(fieldValue);
		}
	});

	return fauanDocData;
};
