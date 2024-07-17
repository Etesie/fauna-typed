import type {
	Collection,
	Document,
	Document_Replace,
	DocumentStores,
	Functions,
	NamedDocument
} from '../types';
import { type QueryValueObject } from 'fauna';
import { getDefaultComputedValue } from './getDefaultComputedValue';
import { transformFaunaRefToStoreFunctions } from './transformFaunaRefToStoreFunctions';

export const docReplaceToDoc = <
	T extends QueryValueObject,
	T_Update extends QueryValueObject,
	T_Replace extends QueryValueObject
>(
	doc: Functions<T, T_Update, T_Replace>,
	replacedFields: Document_Replace<T_Replace>,
	definition: NamedDocument<Collection>,
	s: DocumentStores
) => {
	const computed_fields = Object.entries(definition.computed_fields || {}).reduce(
		(acc, [key, field]) => {
			return { ...acc, [key]: getDefaultComputedValue(field.signature) };
		},
		{}
	);
	const replacedFieldsWithoutReference = transformFaunaRefToStoreFunctions(
		replacedFields,
		definition,
		s
	);

	return {
		id: doc.id,
		ts: doc.ts,
		coll: doc.coll,
		...replacedFieldsWithoutReference,
		...computed_fields
	} as Document<T>;
};
