import { type QueryValue, type QueryValueObject } from 'fauna';
import { type Collection, type Document_Update } from '../types';

export const toFaunaUpdateDoc = (
	fields: Document_Update<QueryValueObject>,
	collection: Collection
) => {
	const fauanDocData: QueryValueObject = {};

	if (fields.ttl !== undefined) {
		fauanDocData.ttl = fields.ttl || null;
	}

	Object.keys(collection?.fields || {}).forEach((fieldName) => {
		if (fields[fieldName] !== undefined) {
			fauanDocData[fieldName] = fields[fieldName] as QueryValue;
		}
	});

	return fauanDocData;
};
