import type {
	Collection,
	Document,
	Document_Create,
	DocumentStores,
	NamedDocument
} from '../types';
import { Module, TimeStub, type QueryValueObject } from 'fauna';
import { getDefaultComputedValue } from './getDefaultComputedValue';
import { getDocumentWithoutReference } from './getDocumentWithoutReference';

export const docCreateToDoc = <T extends QueryValueObject, T_Create extends QueryValueObject>(
	doc: Document_Create<T_Create>,
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
			return { ...acc, [key]: getDefaultComputedValue(field.signature) };
		},
		{}
	);
	const docValues = getDocumentWithoutReference(doc, definition, s);

	const convertedDoc: any = { id, ts, coll, ...docValues, ...computed_fields };
	return convertedDoc as Document<T>;
};
