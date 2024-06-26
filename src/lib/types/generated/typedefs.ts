import { type TimeStub, type DateStub, type DocumentReference } from 'fauna'

export type User = {
	firstName: string;
	lastName: string;
	birthdate: DateStub;
	account?: Account;
	age: number;
}

export type Account = {
	user: User;
	provider?: string;
	providerUserId?: string;
}

export type User_Create = {
	firstName: string;
	lastName: string;
	birthdate: DateStub;
	account?: Account | DocumentReference;
}
export type User_Replace = User_Create
export type User_Update = Partial<User_Create>

export type User_FaunaCreate = {
	firstName: string;
	lastName: string;
	birthdate: DateStub;
	account?: DocumentReference;
}
export type User_FaunaReplace = User_FaunaCreate
export type User_FaunaUpdate = Partial<User_FaunaCreate>

export type Account_Create = {
	user: User | DocumentReference;
	provider?: string;
	providerUserId?: string;
}
export type Account_Replace = Account_Create
export type Account_Update = Partial<Account_Create>

export type Account_FaunaCreate = {
	user: DocumentReference;
	provider?: string;
	providerUserId?: string;
}
export type Account_FaunaReplace = Account_FaunaCreate
export type Account_FaunaUpdate = Partial<Account_FaunaCreate>