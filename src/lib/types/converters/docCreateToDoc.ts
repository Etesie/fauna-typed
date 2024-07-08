import type { Collection, Document_Create, DocumentStores, NamedDocument } from '../types';
import { Module, TimeStub, type QueryValueObject } from 'fauna';

export const docCreateToDoc = <CreateType extends QueryValueObject>(
	doc: Document_Create<CreateType>,
	definition: NamedDocument<Collection>,
	s: DocumentStores
) => {
	let id: string;
	const ts: TimeStub = TimeStub.fromDate(new Date());
	const coll: Module = new Module(definition.name);
	if (doc.id) {
		id = doc.id;
	} else {
		id = 'TEMP_' + crypto.randomUUID();
	}

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

	const convertedDoc: any = { id, ts, coll, ...computed_fields };

	Object.entries(doc).map(([key, val]) => {
		if (val.id) {
			convertedDoc[key] = () => s[definition.name].byId(val.id);
		}
	});

	return convertedDoc;
};
