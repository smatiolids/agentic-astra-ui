# Agentic-Astra Catalog

A Next.js frontend application for viewing and editing tools stored in an Astra DB catalog collection.

## Features

- **Dark/Light Mode**: Toggle between dark and light themes
- **Tool List**: Browse all tools from the catalog collection
- **Tool Editor**: Edit tool details including parameters, configuration, and metadata
- **Server-Side API**: All database interactions happen on the server for security
- **Real-time Updates**: Connect directly to Astra DB using `@datastax/astra-db-ts`

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Astra DB credentials (token, endpoint, database name)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

Create a `.env.local` file in the `frontend/` directory:

```env
ASTRA_DB_APPLICATION_TOKEN=your_astra_db_token
ASTRA_DB_API_ENDPOINT=https://your-database-id-your-region.apps.astra.datastax.com
ASTRA_DB_DB_NAME=your_database_name
ASTRA_DB_CATALOG_COLLECTION=tool_catalog
```

**Note**: Next.js automatically loads environment variables from `.env.local` for local development. These variables are only available on the server side, keeping your credentials secure.

## Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5150`.

## Building

Build for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Usage

### Local Development

1. Set up environment variables (see Setup above)
2. Run `npm run dev`
3. Open the app in your browser at `http://localhost:5150`

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `ASTRA_DB_APPLICATION_TOKEN` | Yes | Astra DB application token | - |
| `ASTRA_DB_API_ENDPOINT` | Yes | Astra DB API endpoint URL | - |
| `ASTRA_DB_DB_NAME` | Yes | Name of the Astra DB database | - |
| `ASTRA_DB_CATALOG_COLLECTION` | No | Name of the catalog collection | `tool_catalog` |

## Project Structure

```
frontend/
├── app/
│   ├── api/
│   │   └── tools/
│   │       └── route.ts        # API route for tools (GET, POST)
│   ├── globals.css              # Global styles with Tailwind
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main page component
├── components/
│   ├── ThemeToggle.tsx          # Dark/light mode toggle
│   ├── ToolList.tsx             # Tool list sidebar
│   └── ToolEditor.tsx           # Tool editing form
├── lib/
│   └── astraClient.ts           # Astra DB client (server-side only)
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## Technologies

- **Next.js 14**: React framework with App Router
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling with dark mode support
- **@datastax/astra-db-ts**: Official Astra DB TypeScript client (server-side only)

## Architecture

This application uses Next.js API routes to handle all database interactions on the server:

- **Client-side**: React components make fetch requests to `/api/tools`
- **Server-side**: API routes in `app/api/tools/route.ts` handle database operations
- **Security**: Database credentials are never exposed to the client

## API Endpoints

### GET `/api/tools`
Fetches all tools from the catalog collection.

**Response:**
```json
{
  "success": true,
  "tools": [...]
}
```

### POST `/api/tools`
Creates or updates a tool in the catalog collection.

**Request Body:**
```json
{
  "_id": "...",
  "name": "...",
  "description": "...",
  ...
}
```

**Response:**
```json
{
  "success": true
}
```

## License

Same as the parent project.
