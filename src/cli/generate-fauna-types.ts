#!/usr/bin/env node
/**
 * Usage:
 *   fauna-types --secret=YOUR_FAUNA_ADMIN_KEY
 *
 *   With optional parameters:
 *   fauna-types --secret="YOUR_FAUNA_ADMIN_KEY" --dir="path/to/dir"
 *   fauna-types -s "YOUR_FAUNA_ADMIN_KEY" -d "path/to/dir" 
 */

import { Command } from 'commander';
import { generateTypes } from './types-generator';
import dotenv from 'dotenv';
import path from 'path';
import { Client, fql } from 'fauna';
import type { Collection, NamedDocument, Page } from './system-types.ts';

// Load environment variables from .env file if present
dotenv.config();

const program = new Command();

program
	.name('generate-fauna-types')
	.description('Generate TypeScript types from Fauna schema.')
	.option('-s, --secret <faunaSecret>', 'Fauna admin secret')
	.option('-d, --dir <directory>', 'Directory to generate types file', 'src/fauna-typed')
	.parse(process.argv);

const options = program.opts();

// Extract options with defaults
const FAUNA_ADMIN_KEY = options.secret || process.env.FAUNA_ADMIN_KEY;
const generatedTypesDirPath = options.dir;

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
			generatedTypesDirPath
		});

		const outputPath = path.resolve(
			process.cwd(),
			`${generatedTypesDirPath}}`
		);
		console.log(result?.message || 'Type generation complete!');
		console.log(`Type definitions generated at ${outputPath}`);
	} catch (err) {
		console.error(`Error generating Fauna types: ${(err as Error)?.message ?? err}`);
		process.exit(1);
	}
}

main();
