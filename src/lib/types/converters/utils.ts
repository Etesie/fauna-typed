export const removeQuotesFromByIdReference = (str: string): string => {
	return str.replaceAll(/"([a-zA-Z]+\.byId\('\d+'\))"/g, '$1');
};

export const removeQuotesFromTime = (str: string): string => {
	return str.replaceAll(/"(Time+\('[a-zA-Z0-9-:.]+'\))"/g, '$1');
};

export const removeQuotesFromDate = (str: string): string => {
	return str.replaceAll(/"(Date+\('[a-zA-Z0-9-:.]+'\))"/g, '$1');
};

/**
 * Removes invalid quotes from a Fauna query string.
 *
 * If you pass a `Date`, `Time`, or `byId` reference as a string in a Fauna query, it will be treated as a string and stored as such, rather than being recognized as an actual `Date`, `Time`, or `byId` instance.
 *
 * @example
 * 1. 'Date("2022-01-01")' -> Date("2022-01-01")
 * 2. 'Time("2022-01-01T00:00:00.000Z")' -> Time("2022-01-01T00:00:00.000Z")
 * 3. 'Event.byId("123")' -> Event.byId("123")
 *
 * @param {string} str - The input string to remove quotes from.
 * @return {string} The string with invalid quotes removed.
 */
export const removeInvalidQuotesFromFaunaString = (str: string): string => {
	const withoutReferencesQuotes = removeQuotesFromByIdReference(str);
	const withoutTimeQuotes = removeQuotesFromTime(withoutReferencesQuotes);
	const withoutDateQuotes = removeQuotesFromDate(withoutTimeQuotes);

	return withoutDateQuotes;
};
