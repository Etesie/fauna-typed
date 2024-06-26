import type { Ordering } from '$lib/stores/_shared/order';
import {
	type Document as FaunaDocument,
	DocumentReference,
	DateStub,
	type QueryValueObject
} from 'fauna';

export type Definition = {
	fields: Fields;
	computed_fields: ComputedFields;
};

type Document = Omit<FaunaDocument, 'toObject'>;
type Document_Create = Partial<Omit<Document, 'ts' | 'coll'>>;
type Document_Update = Omit<Document_Create, 'id'>;
type Document_Replace = Document_Update;
type DocumentT<T extends QueryValueObject> = Document & T;
type Document_CreateT<T extends QueryValueObject> = Document_Create & T;
type Document_UpdateT<T extends QueryValueObject> = Document_Update & T;
type Document_ReplaceT<T extends QueryValueObject> = Document_Replace & T;

type Functions<T, T_Replace extends QueryValueObject, T_Update extends QueryValueObject> = {
	update: (document: Document_UpdateT<T_Update>) => void;
	replace: (document: Document_UpdateT<T_Replace>) => void;
	delete: () => void;
};

type FunctionsT<
	T,
	T_Replace extends QueryValueObject,
	T_Update extends QueryValueObject
> = Functions<T, T_Replace, T_Update> & T;

class Page<T extends Document> {
	data: T[];
	after?: string;

	constructor(data: T[], after?: string) {
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

type Predicate<T> = (item: T, index: number, array: T[]) => boolean;

export {
	type Document,
	type DocumentT,
	type Document_CreateT,
	type Document_UpdateT,
	type Document_ReplaceT,
	type FunctionsT,
	Page,
	type Fields,
	type ComputedFields,
	type Predicate
};
