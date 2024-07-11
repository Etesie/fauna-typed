import { type QueryValueObject } from 'fauna';
import { type Collection, type Document_Update } from '../types';
import { toFaunaValue } from './toFaunaValue';

export const toFaunaUpdateDoc = <T_Update extends QueryValueObject>(
	fields: Document_Update<T_Update>,
	collection: Collection
) => {
	const fauanDocData: QueryValueObject = {};

	if (fields.ttl !== undefined) {
		fauanDocData.ttl = fields.ttl || null;
	}

	Object.keys(collection?.fields || {}).forEach((fieldName) => {
		const fieldValue = fields[fieldName as keyof typeof fields];

		if (fieldValue !== undefined) {
			fauanDocData[fieldName] = toFaunaValue(fieldValue);
		}
	});

	return fauanDocData;
};
