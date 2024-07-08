import type { Collection, Document_Update, Functions, NamedDocument } from '../types';
import { type QueryValueObject } from 'fauna';

export const docUpdateToDoc = <
	MainType extends QueryValueObject,
	UpdateType extends QueryValueObject,
	ReplaceType extends QueryValueObject
>(
	doc: Functions<MainType, UpdateType, ReplaceType>,
	updatedFields: Document_Update<UpdateType>,
	definition: NamedDocument<Collection>
) => {
	Object.keys(doc).forEach((key) => {
		if (!(key in updatedFields)) {
			if (key !== 'ts') {
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
