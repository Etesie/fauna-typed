export type SortFunction<T> = (a: T, b: T) => number;

// Helper types to extract property names from functions
type PropType<T, Prop extends keyof T> = T[Prop];
type PropFunction<T> = (item: T) => PropType<T, keyof T>;

export function asc<T>(propFunction: PropFunction<T>): SortFunction<T> {
	return (a: T, b: T) => {
		const aValue = propFunction(a);
		const bValue = propFunction(b);
		if (aValue < bValue) {
			return -1;
		} else if (aValue > bValue) {
			return 1;
		} else {
			return 0;
		}
	};
}

export function desc<T>(propFunction: PropFunction<T>): SortFunction<T> {
	return (a: T, b: T) => {
		const aValue = propFunction(a);
		const bValue = propFunction(b);
		if (aValue < bValue) {
			return 1;
		} else if (aValue > bValue) {
			return -1;
		} else {
			return 0;
		}
	};
}
