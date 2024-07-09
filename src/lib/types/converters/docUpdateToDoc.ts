import type { Collection, Document_Update, Functions, NamedDocument } from '../types';
import { type QueryValueObject } from 'fauna';
import { getDefaultComputedValue } from './getDefaultComputedValue';

export const docUpdateToDoc = <
	MainType extends QueryValueObject,
	UpdateType extends QueryValueObject,
	ReplaceType extends QueryValueObject
>(
	doc: Functions<MainType, UpdateType, ReplaceType>,
	updatedFields: Document_Update<UpdateType>,
	definition: NamedDocument<Collection>
) => {
	const computed_fields = Object.entries(definition.computed_fields || {}).reduce(
		(acc, [key, field]) => {
			return { ...acc, [key]: getDefaultComputedValue(field.signature) };
		},
		{}
	);

	return { ts: doc.ts, ...updatedFields, ...computed_fields };
};
