# Publishing Guide

This guide explains how to publish the frontend as an npm package that can be run with `npx`.

## Prerequisites

1. An npm account (create one at https://www.npmjs.com/signup)
2. Login to npm: `npm login`
3. Make sure the package name is available on npm (or use a scoped package like `@your-username/agentic-astra-ui`)

## Publishing Steps

### 1. Update Package Information

Before publishing, update the following in `package.json`:
- `name`: Make sure it's unique on npm (or use a scoped name like `@your-username/agentic-astra-ui`)
- `version`: Follow semantic versioning (e.g., 0.0.1, 0.1.0, 1.0.0)
- `repository.url`: Update with your actual repository URL
- `author`: Update if needed

### 2. Test Locally

Test the package locally before publishing:

```bash
# From the frontend directory
npm pack

# This creates a .tgz file. Test it:
npm install -g ./agentic-astra-ui-0.0.1.tgz

# Then test running it:
agentic-astra-ui
```

Or test with `npx` directly from the directory:

```bash
npx ./bin/agentic-astra-ui.js
```

### 3. Publish to npm

```bash
# Publish (first time)
npm publish

# For scoped packages (if using @your-username/agentic-astra-ui):
npm publish --access public
```

### 4. Update Version for Subsequent Releases

```bash
# Patch version (0.0.1 -> 0.0.2)
npm version patch

# Minor version (0.0.1 -> 0.1.0)
npm version minor

# Major version (0.0.1 -> 1.0.0)
npm version major

# Then publish
npm publish
```

## Using the Published Package

Once published, users can run it with:

```bash
npx agentic-astra-ui
```

Or install it globally:

```bash
npm install -g agentic-astra-ui
agentic-astra-ui
```

## Environment Variables

Users will need to create a `.env.local` file in their working directory (or set environment variables) with:

```env
ASTRA_DB_APPLICATION_TOKEN=your_astra_db_token
ASTRA_DB_API_ENDPOINT=https://your-database-id-your-region.apps.astra.datastax.com
ASTRA_DB_DB_NAME=your_database_name
ASTRA_DB_CATALOG_COLLECTION=tool_catalog
```

**Note**: The CLI script runs from the package directory, but Next.js will look for `.env.local` in the current working directory. You may want to enhance the CLI to handle this better.

## Troubleshooting

### Package name already taken
- Use a scoped package: `@your-username/agentic-astra-ui`
- Or choose a different name

### Permission errors
- Make sure you're logged in: `npm whoami`
- Check if you have publish access to the package

### Files not included
- Check the `files` field in `package.json`
- Verify `.npmignore` isn't excluding needed files

## Advanced: Handling Environment Variables

For a better user experience, you might want to enhance the CLI script to:
1. Check for `.env.local` in the current working directory
2. Prompt for missing environment variables
3. Create a template `.env.local` file if it doesn't exist

