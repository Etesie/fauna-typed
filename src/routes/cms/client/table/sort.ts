// export interface Sorter {
// 	[key: string]: 'asc' | 'desc';
// }
export interface Sorter {
	key: string,
	direction: 'asc' | 'desc'
}
