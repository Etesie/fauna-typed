import type { Ordering } from '$lib/stores/_shared/order';
import {
	type Document as FaunaDocument,
	DocumentReference,
	DateStub,
	type QueryValueObject
} from 'fauna';

type Document = Omit<FaunaDocument, 'toObject'>;
type Document_Create = Partial<Omit<Document, 'ts' | 'coll'>>;
type Document_UpdateReplace = Omit<Document_Create, 'id'>;
type DocumentT<T extends QueryValueObject> = Document & T;
type Document_CreateT<T extends QueryValueObject> = Document_Create & T;
type Document_UpdateReplaceT<T extends QueryValueObject> = Document_UpdateReplace & T;

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
type User_CreateReplace = Omit<User, 'age' | 'account'> & {
	account: Account | DocumentReference;
};
type User_Update = Partial<User_CreateReplace>;

/** Used to update documents in Fauna */
type User_FaunaCreateReplace = Omit<User, 'Account' | 'age'> & {
	Account: DocumentReference;
};
type User_FaunaUpdate = Partial<User_FaunaCreateReplace>;

type Account = {
	user: () => Account;
	provider: string;
	providerUserId: string;
};
type Account_CreateReplace = Omit<Account, 'user'> & {
	user: User | DocumentReference;
};
type Account_Update = Partial<Account_CreateReplace>;
type Account_FaunaCreateReplace = Omit<Account, 'User'> & {
	User: DocumentReference;
};
type Account_FaunaUpdate = Partial<Account_FaunaCreateReplace>;

type Functions<T> = {
	update: (document: T) => void;
	replace: (document: T) => void;
	delete: () => void;
};

type FunctionsT<T> = Functions<T> & T;

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

export {
	type DocumentT,
	type Document_CreateT,
	type Document_UpdateReplaceT,
	type User,
	type User_CreateReplace,
	type User_Update,
	type User_FaunaCreateReplace,
	type User_FaunaUpdate,
	type Account,
	type Account_CreateReplace,
	type Account_Update,
	type Account_FaunaCreateReplace,
	type Account_FaunaUpdate,
	type FunctionsT,
	Page,
	type Fields
};
