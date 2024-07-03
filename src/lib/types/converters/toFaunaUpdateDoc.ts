import { type QueryValue, type QueryValueObject } from 'fauna';
import { type Collection, type Document_Update } from '../types';

export const toFaunaUpdateDoc = <
	T_Update extends QueryValueObject,
	T_FaunaUpdate extends QueryValueObject
>(
	fields: Document_Update<T_Update>,
	collection: Collection
): Document_Update<T_FaunaUpdate> => {
	const fauanDocData: QueryValueObject = {};

	if (fields.ttl !== undefined) {
		fauanDocData.ttl = fields.ttl;
	}

	Object.keys(collection?.fields || {}).forEach((fieldName) => {
		if (fields[fieldName as keyof Document_Update<T_Update>] !== undefined) {
			fauanDocData[fieldName] = fields[fieldName] as QueryValue;
		}
	});

	return fauanDocData as Document_Update<T_FaunaUpdate>;
};
