import { type TimeStub, type DateStub, type DocumentReference } from 'fauna';

type Event = {
	name: string;
	masterQuestion: MasterQuestion;
	consequences: Array<Consequence>;
	masterChapter: MasterChapter;
	type: "MULTIPLE" | "SINGLE" | null;
	multipleReference: MasterQuestion | null;
	unlockCriteria: string | null;
};

type Event_Create = {
	name: string;
	masterQuestion: MasterQuestion | DocumentReference;
	consequences: Array<Consequence | DocumentReference>;
	masterChapter: MasterChapter | DocumentReference;
	type: "MULTIPLE" | "SINGLE" | null;
	multipleReference: MasterQuestion | DocumentReference | null;
	unlockCriteria: string | null;
};
type Event_Replace = Event_Create;
type Event_Update = Partial<Event_Create>;

type Event_FaunaCreate = {
	name: string;
	masterQuestion: DocumentReference;
	consequences: Array<DocumentReference>;
	masterChapter: DocumentReference;
	type: "MULTIPLE" | "SINGLE" | null;
	multipleReference: DocumentReference | null;
	unlockCriteria: string | null;
};
type Event_FaunaReplace = Event_FaunaCreate;
type Event_FaunaUpdate = Partial<Event_FaunaCreate>;

type Consequence = {
	name: string;
	event: Event;
	masterAnswer: MasterAnswer;
	nextEvent: Array<Event>;
	masterChapter: MasterChapter;
};

type Consequence_Create = {
	name: string;
	event: Event | DocumentReference;
	masterAnswer: MasterAnswer | DocumentReference;
	nextEvent: Array<Event | DocumentReference>;
	masterChapter: MasterChapter | DocumentReference;
};
type Consequence_Replace = Consequence_Create;
type Consequence_Update = Partial<Consequence_Create>;

type Consequence_FaunaCreate = {
	name: string;
	event: DocumentReference;
	masterAnswer: DocumentReference;
	nextEvent: Array<DocumentReference>;
	masterChapter: DocumentReference;
};
type Consequence_FaunaReplace = Consequence_FaunaCreate;
type Consequence_FaunaUpdate = Partial<Consequence_FaunaCreate>;

type MasterChapter = {
	name: string;
	parent: MasterChapter | null;
	children: Array<MasterChapter>;
	before: MasterChapter | null;
	after: MasterChapter | null;
	position: string;
};

type MasterChapter_Create = {
	name: string;
	parent: MasterChapter | DocumentReference | null;
	children: Array<MasterChapter | DocumentReference>;
	before: MasterChapter | DocumentReference | null;
	after: MasterChapter | DocumentReference | null;
	position: string;
};
type MasterChapter_Replace = MasterChapter_Create;
type MasterChapter_Update = Partial<MasterChapter_Create>;

type MasterChapter_FaunaCreate = {
	name: string;
	parent: DocumentReference | null;
	children: Array<DocumentReference>;
	before: DocumentReference | null;
	after: DocumentReference | null;
	position: string;
};
type MasterChapter_FaunaReplace = MasterChapter_FaunaCreate;
type MasterChapter_FaunaUpdate = Partial<MasterChapter_FaunaCreate>;

type MasterQuestion = {
	name: string;
	explanation: string | null;
	answers: Array<MasterAnswer>;
	type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "FORMATTED_TEXT" | "WHOLE_NUMBER" | "DECIMAL_NUMBER" | "CURRENCY" | "ATTACHMENT" | "FORMULA";
};

type MasterQuestion_Create = {
	name: string;
	explanation: string | null;
	answers: Array<MasterAnswer | DocumentReference>;
	type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "FORMATTED_TEXT" | "WHOLE_NUMBER" | "DECIMAL_NUMBER" | "CURRENCY" | "ATTACHMENT" | "FORMULA";
};
type MasterQuestion_Replace = MasterQuestion_Create;
type MasterQuestion_Update = Partial<MasterQuestion_Create>;

type MasterQuestion_FaunaCreate = {
	name: string;
	explanation: string | null;
	answers: Array<DocumentReference>;
	type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TEXT" | "FORMATTED_TEXT" | "WHOLE_NUMBER" | "DECIMAL_NUMBER" | "CURRENCY" | "ATTACHMENT" | "FORMULA";
};
type MasterQuestion_FaunaReplace = MasterQuestion_FaunaCreate;
type MasterQuestion_FaunaUpdate = Partial<MasterQuestion_FaunaCreate>;

type MasterAnswer = {
	name: string;
	examples: Array<string>;
	explanation: string | null;
	formula: string | null;
	masterQuestion: MasterQuestion;
};

type MasterAnswer_Create = {
	name: string;
	examples: Array<string>;
	explanation: string | null;
	formula: string | null;
	masterQuestion: MasterQuestion | DocumentReference;
};
type MasterAnswer_Replace = MasterAnswer_Create;
type MasterAnswer_Update = Partial<MasterAnswer_Create>;

type MasterAnswer_FaunaCreate = {
	name: string;
	examples: Array<string>;
	explanation: string | null;
	formula: string | null;
	masterQuestion: DocumentReference;
};
type MasterAnswer_FaunaReplace = MasterAnswer_FaunaCreate;
type MasterAnswer_FaunaUpdate = Partial<MasterAnswer_FaunaCreate>;

type Test = {
	list: "No1" | "No2" | "No3";
};

type Test_Create = {
	list: "No1" | "No2" | "No3";
};
type Test_Replace = Test_Create;
type Test_Update = Partial<Test_Create>;

type Test_FaunaCreate = {
	list: "No1" | "No2" | "No3";
};
type Test_FaunaReplace = Test_FaunaCreate;
type Test_FaunaUpdate = Partial<Test_FaunaCreate>;

interface UserCollectionsTypeMapping {
	Event: {
		main: Event;
		create: Event_Create;
		replace: Event_Replace;
		update: Event_Update;
	};
	Consequence: {
		main: Consequence;
		create: Consequence_Create;
		replace: Consequence_Replace;
		update: Consequence_Update;
	};
	MasterChapter: {
		main: MasterChapter;
		create: MasterChapter_Create;
		replace: MasterChapter_Replace;
		update: MasterChapter_Update;
	};
	MasterQuestion: {
		main: MasterQuestion;
		create: MasterQuestion_Create;
		replace: MasterQuestion_Replace;
		update: MasterQuestion_Update;
	};
	MasterAnswer: {
		main: MasterAnswer;
		create: MasterAnswer_Create;
		replace: MasterAnswer_Replace;
		update: MasterAnswer_Update;
	};
	Test: {
		main: Test;
		create: Test_Create;
		replace: Test_Replace;
		update: Test_Update;
	};
}

export type {
	Event,
	Event_Create,
	Event_Update,
	Event_Replace,
	Event_FaunaCreate,
	Event_FaunaUpdate,
	Event_FaunaReplace,
	Consequence,
	Consequence_Create,
	Consequence_Update,
	Consequence_Replace,
	Consequence_FaunaCreate,
	Consequence_FaunaUpdate,
	Consequence_FaunaReplace,
	MasterChapter,
	MasterChapter_Create,
	MasterChapter_Update,
	MasterChapter_Replace,
	MasterChapter_FaunaCreate,
	MasterChapter_FaunaUpdate,
	MasterChapter_FaunaReplace,
	MasterQuestion,
	MasterQuestion_Create,
	MasterQuestion_Update,
	MasterQuestion_Replace,
	MasterQuestion_FaunaCreate,
	MasterQuestion_FaunaUpdate,
	MasterQuestion_FaunaReplace,
	MasterAnswer,
	MasterAnswer_Create,
	MasterAnswer_Update,
	MasterAnswer_Replace,
	MasterAnswer_FaunaCreate,
	MasterAnswer_FaunaUpdate,
	MasterAnswer_FaunaReplace,
	Test,
	Test_Create,
	Test_Update,
	Test_Replace,
	Test_FaunaCreate,
	Test_FaunaUpdate,
	Test_FaunaReplace,
	UserCollectionsTypeMapping
};
