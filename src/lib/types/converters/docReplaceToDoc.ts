import type { Collection, Document_Replace, Functions, NamedDocument } from '../types';
import { type QueryValueObject } from 'fauna';

export const docReplaceToDoc = <
	MainType extends QueryValueObject,
	UpdateType extends QueryValueObject,
	ReplaceType extends QueryValueObject
>(
	doc: Functions<MainType, UpdateType, ReplaceType>,
	updatedFields: Document_Replace<ReplaceType>,
	definition: NamedDocument<Collection>
) => {
	Object.keys(doc).forEach((key) => {
		if (!(key in updatedFields)) {
			if (key !== 'id' && key !== 'ts' && key !== 'coll') {
				delete doc[key];
			}
		}
	});

	const computed_fields = Object.entries(definition.computed_fields || {}).reduce(
		(acc, [key, field]) => {
			if (field.signature === 'Number') {
				return { ...acc, [key]: 0 };
			} else {
				return { ...acc, [key]: '' };
			}
		},
		{}
	);

	return { ...doc, ...computed_fields };
};
