import type { QueryValueObject } from 'fauna';
import { TEMP_ID_PREFIX, type Collection, type Document } from '../types';

export const toFaunaDoc = (doc: Document<QueryValueObject>, collection: Collection) => {
	const fauanDocData: QueryValueObject = {
		ttl: doc.ttl || null
	};

	if (!doc.id?.startsWith(TEMP_ID_PREFIX)) {
		fauanDocData.id = doc.id;
	}

	Object.keys(collection?.fields || {}).forEach((fieldName) => {
		if (doc[fieldName] !== undefined) {
			fauanDocData[fieldName] = doc[fieldName];
		}
	});

	return fauanDocData;
};
