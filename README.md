# Features

1. Typed Fauna Syntax

- Collection
  - Static Methods
    - all() ✅
    - byName() ✅
    - create() ❌
    - firstWhere() ❌
    - toString() ❌
    - where() ❌
  - Instance Methods
    - all() ✅
    - byId() ✅
    - create() ✅
    - createData() ❌
    - delete() ✅
    - exists() ❌
    - firstWhere() ❌
    - replace() ✅
    - update() ✅
    - where() ✅
    - \<indexName>() ❌
- Credential ❌
- Database ❌
- Date ❌
- Document
  - delete() ✅
  - exists() ❌
  - replace() ✅
  - replaceData() ❌
  - update() ✅
  - updateData() ❌
- Function ❌
  - Static Methods
    - all() ✅
    - byName() ✅
    - create() ❌
    - firstWhere() ❌
    - toString() ❌
    - where() ❌
- Key ❌
- Math ❌
- Object ❌
- Role ❌
  - Static Methods
    - all() ✅
    - byName() ✅
    - create() ❌
    - firstWhere() ❌
    - toString() ❌
    - where() ❌
- AccessProvider
  - Static Methods
    - all() ✅
    - byName() ✅
    - create() ❌
    - firstWhere() ❌
    - toString() ❌
    - where() ❌
- Set ❌
- String ❌
- Time ❌
- Token ❌
- TransactionTime ❌
- Global functions ❌

2. Lazy Store (Get the results from the store synchronous and the client fetches asynchronous the up to date data from the database and updates the store. (Same with create, update, and delete)) ✅
3. Undo & Redo (Full-Store -> Bad performance) ✅
4. Connected stores (e.g. User with Account) ✅
5. Auto-Generated Types ✅
6. Promises
7. Cache Revalidating
8. Database Integration
9. Streaming
10. Auto-Generate Run-time validator
11. Undo & Redo (Storing only the diff between changes)
12. Cross-Store Undo & Redo
