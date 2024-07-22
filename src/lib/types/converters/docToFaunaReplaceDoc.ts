import { type QueryValueObject } from 'fauna';
import { type Collection, type Document_Replace } from '../types';
import {
	removeDoubleQuotesFromReference,
	transformDocValueToFaunaValue
} from './transformDocValueToFaunaValue';

export const docToFaunaReplaceDoc = <T_Replace extends QueryValueObject>(
	fields: Document_Replace<T_Replace>,
	collection: Collection
) => {
	const faunaDocData: QueryValueObject = {
		ttl: fields.ttl || null
	};

	Object.entries(collection?.fields || {}).forEach(([fieldName, fieldValue]) => {
		faunaDocData[fieldName] = transformDocValueToFaunaValue(fields[fieldName] || null, fieldValue);
	});

	return removeDoubleQuotesFromReference(JSON.stringify(faunaDocData));
};
