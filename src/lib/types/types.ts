import type { Ordering } from '$lib/stores/_shared/order';
import type { CollectionStore } from '$lib/stores/collection.svelte';
import type { CreateDocumentStore, DocumentStore } from '$lib/stores/document.svelte';
import { Module, TimeStub, type QueryValueObject } from 'fauna';

type Document<T extends QueryValueObject> = {
	id: string;
	coll: Module;
	ts: TimeStub;
	ttl?: TimeStub;
} & T;
type Document_Create<T extends QueryValueObject> = Partial<Omit<Document<T>, 'ts' | 'coll'>>;
type Document_Update<T extends QueryValueObject> = Omit<Document_Create<T>, 'id'>;
type Document_Replace<T extends QueryValueObject> = Document_Update<T>;

type NamedDocument<
	T extends QueryValueObject,
	T_Metadata extends QueryValueObject = Record<string, never>
> = {
	coll: Module;
	name: string;
	ts: TimeStub;
} & T & {
		data?: T_Metadata;
	};

type NamedDocument_Create<
	T extends QueryValueObject,
	T_Metadata extends QueryValueObject = Record<string, never>
> = {
	name: string;
} & T & {
		data?: T_Metadata;
	};

type NamedDocument_Update<
	T extends QueryValueObject,
	T_Metadata extends QueryValueObject = Record<string, never>
> = {
	name?: string;
} & T & {
		data?: T_Metadata;
	};

type NamedDocument_Replace<
	T extends QueryValueObject,
	T_Metadata extends QueryValueObject = Record<string, never>
> = NamedDocument_Update<T, T_Metadata>;

type Collection = {
	history_days: number;
	ttl_days?: number;
	document_ttls?: boolean;

	fields?: Fields;
	computed_fields?: ComputedFields;
	wildcard?: string;
	constraints: any[];
	indexes: any;

	migrations?: any;
};

type Collection_Create = Partial<Collection>;
type Collection_Update = Partial<Collection>;
type Collection_Replace = Partial<Collection>;

type Functions<
	T extends QueryValueObject,
	T_Replace extends QueryValueObject,
	T_Update extends QueryValueObject
> = {
	update: (document: Document_Update<T_Update>) => void;
	replace: (document: Document_Replace<T_Replace>) => void;
	delete: () => void;
} & Document<T>;

type NamedFunctions<
	T extends QueryValueObject,
	T_Replace extends QueryValueObject,
	T_Update extends QueryValueObject
> = {
	update: (document: NamedDocument_Update<T_Update>) => void;
	replace: (document: NamedDocument_Update<T_Replace>) => void;
	delete: () => void;
} & NamedDocument<T>;

class Page<T extends QueryValueObject> {
	data: T[];
	after?: string | number;

	constructor(data: T[], after?: string | number) {
		this.data = data;
		if (after) {
			this.after = after;
		}
	}

	/**
	 * Sorts the Page data based on provided orderings. The first entry in the Ordering has the highest sorting priority, with priority decreasing with each following entry.
	 * @param orderings - A list of ordering functions, created by `asc` or `desc`.
	 * @example
	 * import { asc, desc } from 'fauna-typed/stores';
	 * User.all().order(asc((u) => u.firstName), desc((u) => u.lastName)))
	 */
	order(...orderings: Ordering<T>[]): Page<T> {
		this.data.sort((a: T, b: T) => {
			for (const ordering of orderings) {
				const result = ordering(a, b);
				if (result !== 0) return result;
			}
			return 0;
		});
		return this;
	}
}

type Field = {
	signature: string;
};

type Fields = {
	[key: string]: Field;
};

type ComputedField = {
	body: string;
	signature: string;
};

type ComputedFields = {
	[key: string]: ComputedField;
};

const baseFields = {
	id: {
		signature: 'String'
	},
	coll: {
		signature: 'String'
	},
	ts: {
		signature: 'Timestamp'
	},
	ttl: {
		signature: 'Timestamp'
	}
};

type Predicate<T> = (item: T, index: number, array: T[]) => boolean;

type DocumentStores = {
	[key: string]: CreateDocumentStore<any, any, any, any>;
};

export {
	type NamedDocument,
	type NamedDocument_Create,
	type NamedDocument_Update,
	type NamedDocument_Replace,
	type Collection,
	type Collection_Create,
	type Collection_Update,
	type Collection_Replace,
	type Document,
	type Document_Create,
	type Document_Update,
	type Document_Replace,
	type Functions,
	type NamedFunctions,
	Page,
	type Fields,
	type ComputedFields,
	baseFields,
	type Predicate,
	type DocumentStores
};
