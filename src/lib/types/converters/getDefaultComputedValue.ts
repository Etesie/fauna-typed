import { DateStub, TimeStub } from 'fauna';

const defaultFieldValue: Record<string, any> = {
	Number: 0,
	String: '',
	Boolean: false,
	Date: DateStub.fromDate(new Date()),
	Time: TimeStub.fromDate(new Date()),
	Ref: () => null,
	Object: {}
};

const getDefaultComputedValue = (signature: string) => {
	return defaultFieldValue[signature];
};

export { getDefaultComputedValue };
