import type { QueryValueObject } from 'fauna';
import diff from 'microdiff';

type Sync<T extends QueryValueObject> = {
	data: T;
	action: 'CREATE' | 'UPDATE' | 'REPLACE' | 'DELETE';
};

/**
 * Calculate and update syncData based on the current state and the database state.
 * @param current - The current state array containing objects that extend from S_Document.
 * @param database - The database state array containing objects that extend from S_Document.
 */
export const calculateSyncData = <T extends QueryValueObject>(
	current: T[],
	database: T[],
	syncData: Sync<T>[]
): void => {
	// After one object was compared between current and database, it gets removed from toDelete. The left over get added to syncData and marked as "delete"
	const deletions = [...database];
	// Reset syncDatastore
	syncData.splice(0, syncData.length);

	// Calculate diffs and updates (except deletions)
	syncData.concat(
		current.map((item) => {
			const index = database.findIndex((u) => u.id === item.id);
			if (index > -1) {
				// Item exists in both current and database, calculate diff
				const differences = diff(database[index], item);

				// If an item was removed, mark it as REPLACE, otherwise as UPDATE
				const action = differences.some((difference) => difference.type === 'REMOVE')
					? 'REPLACE'
					: 'UPDATE';

				// Remove from deletions since it's not deleted
				deletions.splice(index, 1);
				return { data: item, action };
			} else {
				// Item is not in database, mark it as CREATE
				return { data: item, action: 'CREATE' };
			}
		})
	);
	// Add deletion entries
	syncData.concat(deletions.map((item) => ({ data: item, action: 'DELETE' })));
};

/**
 * Undo function to revert to the previous state.
 *
 * @param {T[]} current - array representing the current state
 * @param {[T[]]} past - array of past states
 * @param {[T[]]} future - array of future states
 * @return {{ current: T[]; past: [T[]]; future: [T[]] } | undefined} the updated state or undefined
 */
export const undo = <T extends QueryValueObject>(
	current: T[],
	past: [T[]?],
	future: [T[]?]
): { current: T[]; past: [T[]?]; future: [T[]?] } | undefined => {
	if (past.length > 0) {
		const previousState = past.pop() as T[];

		future.push([...current]); // Push a copy to avoid reference issues

		current = previousState;
		return { current, past, future };
	}

	return undefined; // Adding a return statement for cases where 'if' condition is not met
};

/**
 * Redoes the last action in a state history by popping the next state from the future stack
 * and pushing the current state to the past stack.
 *
 * @param {T[]} current - The current state.
 * @param {[T[]]} future - The stack of future states.
 * @param {[T[]]} past - The stack of past states.
 * @return {{ current: T[]; past: [T[]]; future: [T[]] } | undefined} - The updated state history if there is a future state, otherwise undefined.
 */
export const redo = <T extends QueryValueObject>(
	current: T[],
	past: [T[]?],
	future: [T[]?]
): { current: T[]; past: [T[]?]; future: [T[]?] } | undefined => {
	if (future.length > 0) {
		console.log('REACHED HERE');
		const nextState = future.pop() as T[];
		console.log('***nextState***\n', nextState);

		past.push([...current]); // Push a copy to avoid reference issues
		current = nextState;
		return { current, past, future };
	}

	return undefined;
};
