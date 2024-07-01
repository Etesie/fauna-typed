import type { DateStub, DocumentReference } from 'fauna';

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

export {
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
	type Account_FaunaUpdate
};
