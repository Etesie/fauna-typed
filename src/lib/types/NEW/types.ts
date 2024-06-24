import type { Ordering } from '$lib/stores/_shared/order';
import {
	type Document as FaunaDocument,
	DocumentReference,
	DateStub,
	type QueryValueObject
} from 'fauna';

type Document = Omit<FaunaDocument, 'toObject'>;
type Document_Create = Partial<Omit<Document, 'ts' | 'coll'>>;
type Document_Update = Omit<Document_Create, 'id'>;
type Document_Replace = Document_Update;
type DocumentT<T extends QueryValueObject> = Document & T;
type Document_CreateT<T extends QueryValueObject> = Document_Create & T;
type Document_UpdateT<T extends QueryValueObject> = Document_Update & T;
type Document_ReplaceT<T extends QueryValueObject> = Document_Replace & T;

type User = {
	firstName: string;
	lastName: string;
	birthdate: DateStub;
	age: number;
	account: Account;
};
/**
 * \*_Create/Replace types don't have Computed fields and Documents replaced with Document and References
 */
type User_Create = Omit<User, 'age' | 'account'> & {
	account: Account | DocumentReference;
};
type User_Replace = User_Create;
type User_Update = Partial<User_Create>;

/** Used to update documents in Fauna */
type User_FaunaCreate = Omit<User, 'Account' | 'age'> & {
	account: DocumentReference;
};
type User_FaunaReplace = User_FaunaCreate;
type User_FaunaUpdate = Partial<User_FaunaCreate>;

type Account = {
	user: () => Account;
	provider: string;
	providerUserId: string;
};
type Account_Create = Omit<Account, 'user'> & {
	user: User | DocumentReference;
};
type Account_Replace = Account_Create;
type Account_Update = Partial<Account_Create>;
type Account_FaunaCreate = Omit<Account, 'User'> & {
	User: DocumentReference;
};
type Account_FaunaReplace = Account_FaunaCreate;
type Account_FaunaUpdate = Partial<Account_FaunaCreate>;

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

// const mergedUser: FunctionsT<DocumentT<User>>;
// mergedUser.account;

// const mergedPageUser: Page<FunctionsT<DocumentT<User>>>;
// mergedPageUser.data.forEach((doc) => doc.account);

type Field = {
	signature: string;
};

type Fields = {
	[key: string]: Field;
};

type Predicate<T> = (item: T, index: number, array: T[]) => boolean;

export {
	type Document,
	type DocumentT,
	type Document_CreateT,
	type Document_UpdateT,
	type Document_ReplaceT,
	type User,
	type User_Create,
	type User_Replace,
	type User_Update,
	type User_FaunaCreate,
	type User_FaunaReplace,
	type User_FaunaUpdate,
	type Account,
	type Account_Create,
	type Account_Replace,
	type Account_Update,
	type Account_FaunaCreate,
	type Account_FaunaReplace,
	type Account_FaunaUpdate,
	type FunctionsT,
	Page,
	type Fields,
	type Predicate
};
