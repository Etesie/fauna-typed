import type { Collection, Document_Replace, Functions, NamedDocument } from '../types';
import { type QueryValueObject } from 'fauna';
import { getDefaultComputedValue } from './getDefaultComputedValue';

export const docReplaceToDoc = <
	MainType extends QueryValueObject,
	UpdateType extends QueryValueObject,
	ReplaceType extends QueryValueObject
>(
	doc: Functions<MainType, UpdateType, ReplaceType>,
	updatedFields: Document_Replace<ReplaceType>,
	definition: NamedDocument<Collection>
) => {
	const computed_fields = Object.entries(definition.computed_fields || {}).reduce(
		(acc, [key, field]) => {
			return { ...acc, [key]: getDefaultComputedValue(field.signature) };
		},
		{}
	);

	return { id: doc.id, ts: doc.ts, coll: doc.coll, ...updatedFields, ...computed_fields };
};
