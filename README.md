# Fauna Typed

![Fauna Typed](https://img.shields.io/npm/v/fauna-typed.svg?style=flat-square)
![License](https://img.shields.io/npm/l/fauna-typed.svg?style=flat-square)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Usage](#usage)
  - [Installation](#installation)
  - [Types Generation](#types-generation)
  - [Types Usage](#types-usage)
- [Development and Contributing](#development-and-contributing)
- [License](#license)

## Overview

**Fauna Typed** is a powerful command-line tool designed to generate TypeScript type definitions based on your [Fauna](https://fauna.com/) database schema. By automating the creation of type-safe interfaces, it ensures seamless integration between your Fauna database and your TypeScript projects, enhancing developer productivity and reducing runtime errors.

## Features

- **Automated Type Generation:** Quickly generate TypeScript types reflecting your Fauna collections and their schemas.

- **Seamless Integration:** Easily integrate the generated types into your existing TypeScript projects.

## Usage

### Installation

You can install **Fauna Typed** as a development dependency with the package manager of your choice.

#### Using pnpm

```bash
pnpm add -D fauna-typed
```

#### Using npm

```bash
npm install --save-dev fauna-typed
```

#### Using yarn

```bash
yarn add -D fauna-typed
```

### Types Generation

After installation, you can use the CLI to generate TypeScript types based on your Fauna database schema.

#### Basic Usage

```bash
npx fauna-typed --secret=YOUR_FAUNA_ADMIN_KEY
```

#### Options

- `-s, --secret <faunaSecret>`\
  **Description:** Fauna admin secret.\
  **Required:** Yes, unless the `FAUNA_ADMIN_KEY` environment variable is set.

- `-d, --dir <directory>`\
  **Description:** Directory to generate types files.\
  **Default:** `src/fauna-typed`

- `-h, --help`\
  **Description:** Display help for the command.

#### Examples

##### Generate Types with Default Settings

```bash
npx fauna-typed --secret="YOUR_FAUNA_ADMIN_KEY"
```

This command generates the TypeScript types in the default directory `src/fauna-typed`.

##### Specify a Custom Output Directory

```bash
npx fauna-typed --secret="YOUR_FAUNA_ADMIN_KEY" --dir="path/to/custom-dir"
```

##### Using Short Flags

```bash
npx fauna-typed -s "YOUR_FAUNA_ADMIN_KEY" -d "path/to/custom-dir"
```

**Note:** When using short flags (`-s`), **do not** use an equal sign (`=`). Instead, separate the flag and its value with a space or no space.

#### Generated Files

Upon successful execution, the CLI generates two key files in your specified directory:

1. **`custom.ts`**\
   Contains the TypeScript type definitions based on your Fauna schema.

2. **`system.ts`**\
   Contains the Fauna system type definitions like Collection, Role, AccessProvider, Function, etc.

##### Directory Structure Example

```
your-project/
├── src/
│   ├── fauna-typed/
│   │   ├── custom.ts
│   │   └── system.ts
│   └── ...
└── ...
```

### Types Usage

The generated types provide seamless integration between your Fauna database and your TypeScript codebase.

#### Fetch Multiple Documents from a User-Defined Collection

Example: `User.all()`

```typescript
import { Client, fql } from 'fauna';
import type { Page, Document } from 'fauna-typed/system';
import { User } from 'fauna-typed/custom';

const client = new Client({
	secret: '<YOUR_FAUNA_KEY>'
});

const response = await client.query<Page<Document<User>>>(fql`User.all()`); // Returned type: QuerySuccess<Page<Document<User>>>

const page = response.data; // type: Page<Document<User>>

const data = page.data; // type: Array<Document<User>>
```

#### Fetch One Document from a User-Defined Collection

Example: `User.all().first()`

```typescript
import { Client, fql } from 'fauna';
import type { Document } from 'fauna-typed/system';
import { User } from 'fauna-typed/custom';

const client = new Client({
	secret: '<YOUR_FAUNA_KEY>'
});

const response = await client.query<Document<User>>(fql`User.all().first()`); // Returned type: QuerySuccess<Document<User>>
const data = response.data; // type: Document<User>
```

#### Fetch One Document from a System-Defined Collection

Example: `Collection.all().first()`

```typescript
import { Client, fql } from 'fauna';
import type { NamedDocument, Collection } from 'fauna-typed/system';

const client = new Client({
	secret: '<YOUR_FAUNA_KEY>'
});

const response = await client.query<NamedDocument<Collection>>(fql`Collection.all().first()`); // Returned type: QuerySuccess<NamedDocument<Collection>>
const data = response.data; // type: NamedDocument<Collection>
```

## Development and Contributing

If you wish to contribute to **Fauna Typed** or customize it further, follow these steps:

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [pnpm](https://pnpm.io/)&#x20;

### Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/fauna-typed.git
   cd fauna-typed
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Build the Project**

   ```bash
   pnpm build
   ```

4. **Run in Development Mode**

   ```bash
   pnpm dev --secret="YOUR_FAUNA_ADMIN_KEY"
   ```

### Contributing Steps

1. **Fork the Repository**

2. **Create a New Branch**

   ```bash
   git checkout -b feature/YourFeatureName
   ```

3. **Make Your Changes**

4. **Commit Your Changes**

   ```bash
   git commit -m "Add Your Feature"
   ```

5. **Push to Your Fork**

   ```bash
   git push origin feature/YourFeatureName
   ```

6. **Open a Pull Request**

## License

This project is licensed under the [MIT License](LICENSE).

