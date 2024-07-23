export const removeQuotesFromByIdReference = (str: string): string => {
	return str.replaceAll(/"([a-zA-Z]+\.byId\('[0-9]+'\))"/g, '$1');
};

export const removeQuotesFromTime = (str: string): string => {
	return str.replaceAll(/"(Time+\('[a-zA-Z0-9-:.]+'\))"/g, '$1');
};

export const removeQuotesFromDate = (str: string): string => {
	return str.replaceAll(/"(Date+\('[a-zA-Z0-9-:.]+'\))"/g, '$1');
};

export const removeRelevantQuotesFromFaunaString = (str: string): string => {
	const withoutReferences = removeQuotesFromByIdReference(str);
	const withoutTime = removeQuotesFromTime(withoutReferences);
	const withoutDate = removeQuotesFromDate(withoutTime);

	return withoutDate;
};
