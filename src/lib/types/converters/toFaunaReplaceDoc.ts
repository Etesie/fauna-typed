import { type QueryValueObject } from 'fauna';
import { type Collection, type Document_Replace } from '../types';
import { toFaunaValue } from './toFaunaValue';

export const toFaunaReplaceDoc = <T_Replace extends QueryValueObject>(
	fields: Document_Replace<T_Replace>,
	collection: Collection
) => {
	const fauanDocData: QueryValueObject = {
		ttl: fields.ttl || null
	};

	Object.keys(collection?.fields || {}).forEach((fieldName) => {
		fauanDocData[fieldName] = toFaunaValue(fields[fieldName] || null);
	});

	return fauanDocData;
};
