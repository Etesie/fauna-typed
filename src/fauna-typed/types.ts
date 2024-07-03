import { type TimeStub, type DateStub, type DocumentReference } from 'fauna';

type User = {
	firstName: string;
	lastName: string;
	birthdate: DateStub;
	account?: Array<Account>;
	age: number;
};

type User_Create = {
	firstName: string;
	lastName: string;
	birthdate: DateStub;
	account?: Array<Account | DocumentReference>;
};
type User_Replace = User_Create;
type User_Update = Partial<User_Create>;

type User_FaunaCreate = {
	firstName: string;
	lastName: string;
	birthdate: DateStub;
	account?: Array<DocumentReference>;
};
type User_FaunaReplace = User_FaunaCreate;
type User_FaunaUpdate = Partial<User_FaunaCreate>;

type Account = {
	user: User;
	provider: string;
	providerUserId: string;
};

type Account_Create = {
	user: User | DocumentReference;
	provider: string;
	providerUserId: string;
};
type Account_Replace = Account_Create;
type Account_Update = Partial<Account_Create>;

type Account_FaunaCreate = {
	user: DocumentReference;
	provider: string;
	providerUserId: string;
};
type Account_FaunaReplace = Account_FaunaCreate;
type Account_FaunaUpdate = Partial<Account_FaunaCreate>;

interface TypeMapping {
	Account: {
		main: Account;
		create: Account_Create;
		replace: Account_Replace;
		update: Account_Update;
	};
	User: {
		main: User;
		create: User_Create;
		replace: User_Replace;
		update: User_Update;
	};
}

export type {
	User,
	User_Create,
	User_Update,
	User_Replace,
	User_FaunaCreate,
	User_FaunaUpdate,
	User_FaunaReplace,
	Account,
	Account_Create,
	Account_Update,
	Account_Replace,
	Account_FaunaCreate,
	Account_FaunaUpdate,
	Account_FaunaReplace,
	TypeMapping
};
