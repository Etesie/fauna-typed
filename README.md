## Install
`pnpm i -D fauna-typed`

## Usage:
`fauna-typed --secret=YOUR_FAUNA_ADMIN_KEY`

### Option:
 *  -s, --secret <faunaSecret>  Fauna admin secret
 *  -d, --dir <directory>       Directory to generate types file (default: "src/fauna-typed")
 *  -h, --help                  display help for command

**With optional parameters:**
 *   `fauna-types --secret="YOUR_FAUNA_ADMIN_KEY" --dir="path/to/dir"`
 *   `fauna-types -s "YOUR_FAUNA_ADMIN_KEY" -d "path/to/dir"` 