import type {
	Collection,
	Document,
	Document_Update,
	DocumentStores,
	Functions,
	NamedDocument
} from '../types';
import { type QueryValueObject } from 'fauna';
import { getDefaultComputedValue } from './getDefaultComputedValue';
import { transformFaunaRefToStoreFunctions } from './transformFaunaRefToStoreFunctions';

export const docUpdateToDoc = <
	T extends QueryValueObject,
	T_Update extends QueryValueObject,
	T_Replace extends QueryValueObject
>(
	doc: Functions<T, T_Update, T_Replace>,
	updatedFields: Document_Update<T_Update>,
	definition: NamedDocument<Collection>,
	s: DocumentStores
) => {
	const computed_fields = Object.entries(definition.computed_fields || {}).reduce(
		(acc, [key, field]) => {
			return { ...acc, [key]: getDefaultComputedValue(field.signature) };
		},
		{}
	);
	const updatedFieldsWithoutReference = transformFaunaRefToStoreFunctions(
		updatedFields,
		definition,
		s
	);

	return { ts: doc.ts, ...updatedFieldsWithoutReference, ...computed_fields } as Document<T>;
};
