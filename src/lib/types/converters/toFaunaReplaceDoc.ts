import { type QueryValueObject } from 'fauna';
import { type Collection, type Document_Replace } from '../types';
import { toFaunaValue } from './toFaunaValue';

export const toFaunaReplaceDoc = <T_Replace extends QueryValueObject>(
	fields: Document_Replace<T_Replace>,
	collection: Collection
) => {
	const faunaDocData: QueryValueObject = {
		ttl: fields.ttl || null
	};

	Object.entries(collection?.fields || {}).forEach(([fieldName, fieldValue]) => {
		faunaDocData[fieldName] = toFaunaValue(fields[fieldName] || null, fieldValue);
	});

	return faunaDocData;
};
