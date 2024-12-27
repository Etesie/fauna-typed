#!/usr/bin/env ts-node

/**
 * Usage:
 *   pnpm run fauna:generate
 *
 *   With optional parameters:
 *   pnpm run fauna:generate --secret=YOUR_FAUNA_ADMIN_KEY --dir=path/to/dir --file=customTypes.ts
 */

import { Command } from 'commander';
import { generateTypes } from './typesGenerator';
import dotenv from 'dotenv';
import path from 'path';
import { Client, fql } from 'fauna';
import type { Collection, NamedDocument, Page } from './system';

// Load environment variables from .env file if present
dotenv.config();

const program = new Command();

program
	.name('generate-fauna-types')
	.description('Generate TypeScript types from Fauna schema.')
	.option('-s, --secret <faunaSecret>', 'Fauna admin secret')
	.option('-d, --dir <directory>', 'Directory to generate types file', 'src/fauna-typed')
	.option('-f, --file <filename>', 'Name of the generated types file', 'types.ts')
	.parse(process.argv);

const options = program.opts();

// Extract options with defaults
const FAUNA_ADMIN_KEY = options.secret || process.env.FAUNA_ADMIN_KEY;
const generatedTypesDirPath = options.dir;
const generatedTypesFileName = options.file;

if (!FAUNA_ADMIN_KEY) {
	console.error(
		'Error: No Fauna admin key provided. Use --secret=... or set FAUNA_ADMIN_KEY env var.'
	);
	process.exit(1);
}

async function main() {
	try {
		// Initialize Fauna client
		const client = new Client({
			secret: FAUNA_ADMIN_KEY
		});

		// Retrieve the schema from Fauna
		const {
			data: { data: collections }
		} = await client.query<Page<NamedDocument<Collection>>>(fql`Collection.all()`);

		if (!collections || collections.length === 0) {
			console.warn('No collections found in Fauna. Exiting...');
			return;
		}

		console.log('Found collections:', collections.map((c) => c.name).join(', '));

		// Generate the types with optional parameters
		const result = generateTypes(collections, {
			generatedTypesDirPath,
			generatedTypesFileName
		});

		const outputPath = path.resolve(
			process.cwd(),
			`${generatedTypesDirPath}/${generatedTypesFileName}`
		);
		console.log(result?.message || 'Type generation complete!');
		console.log(`Type definitions generated at ${outputPath}`);
	} catch (err) {
		console.error(`Error generating Fauna types: ${(err as Error)?.message ?? err}`);
		process.exit(1);
	}
}

main();
