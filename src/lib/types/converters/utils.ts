export const removeQuotesFromByIdReference = (str: string): string => {
	return str.replaceAll(/"([a-zA-Z]+\.byId\('\d+'\))"/g, '$1');
};

export const removeQuotesFromTime = (str: string): string => {
	return str.replaceAll(/"(Time+\('[a-zA-Z0-9-:.]+'\))"/g, '$1');
};

export const removeQuotesFromDate = (str: string): string => {
	return str.replaceAll(/"(Date+\('[a-zA-Z0-9-:.]+'\))"/g, '$1');
};

export const removeRelevantQuotesFromFaunaString = (str: string): string => {
	const withoutReferencesQuotes = removeQuotesFromByIdReference(str);
	const withoutTimeQuotes = removeQuotesFromTime(withoutReferencesQuotes);
	const withoutDateQuotes = removeQuotesFromDate(withoutTimeQuotes);

	return withoutDateQuotes;
};
