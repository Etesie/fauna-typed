import type {
	Collection,
	Document,
	Document_Create,
	DocumentStores,
	NamedDocument
} from '../types';
import { DateStub, Module, TimeStub, type QueryValueObject } from 'fauna';

const defaultFieldValue: Record<string, any> = {
	Number: 0,
	String: '',
	Boolean: false,
	Date: DateStub.fromDate(new Date()),
	Time: TimeStub.fromDate(new Date()),
	Ref: () => null,
	Object: {}
};

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
			return { ...acc, [key]: defaultFieldValue[field.signature] };
		},
		{}
	);

	const docValues = Object.entries(doc).reduce((acc, [key, val]) => {
		if (val?.id) {
			return { ...acc, [key]: () => s[definition.name].byId(val.id) };
		} else {
			return { ...acc, [key]: val };
		}
	}, {});

	const convertedDoc: any = { id, ts, coll, ...docValues, ...computed_fields };

	return convertedDoc as Document<T>;
};
