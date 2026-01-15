import { DataAPIClient } from '@datastax/astra-db-ts';

export interface ToolParameter {
  param: string;
  description?: string;
  attribute?: string;
  type?: string;
  required?: boolean | number;
  operator?: string;
  expr?: string;
  enum?: string[];
  embedding_model?: string;
  info?: string;
  value?: any;
  paramMode?: 'tool_param' | 'static' | 'expression';
}

export interface Tool {
  _id?: string;
  tags?: string[];
  type: string;
  name: string;
  title?: string;
  description?: string;
  limit?: number;
  method?: string;
  collection_name?: string;
  table_name?: string;
  db_name?: string;
  projection?: Record<string, number | string>;
  parameters?: ToolParameter[];
  enabled?: boolean;
}

class AstraClient {
  private client: DataAPIClient | null = null;
  private db: any = null;
  private collection: any = null;
  private token: string | null = null;
  private endpoint: string | null = null;
  private dbName: string | null = null;
  private collectionName: string = 'tool_catalog';

  async connect(): Promise<void> {
    // Access server-side environment variables
    this.token = process.env.ASTRA_DB_APPLICATION_TOKEN || '';
    this.endpoint = process.env.ASTRA_DB_API_ENDPOINT || '';
    this.dbName = process.env.ASTRA_DB_DB_NAME || '';
    this.collectionName = process.env.ASTRA_DB_CATALOG_COLLECTION || 'tool_catalog';

    if (!this.token || !this.endpoint || !this.dbName) {
      throw new Error('Missing required environment variables: ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_API_ENDPOINT, and ASTRA_DB_DB_NAME are required');
    }

    try {
      // Initialize the DataAPIClient with the token
      this.client = new DataAPIClient(this.token);
      
      // Get the database using the endpoint and token
      // The endpoint format: https://<database-id>-<region>.apps.astra.datastax.com
      this.db = this.client.db(this.endpoint, { token: this.token });
      
      // Get the collection
      this.collection = this.db.collection(this.collectionName);
    } catch (error) {
      throw new Error(`Failed to connect to Astra DB: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTools(): Promise<Tool[]> {
    if (!this.collection) {
      await this.connect();
    }

    try {
      // Use find() with filter, which returns a cursor
      const cursor = this.collection.find({ type: 'tool' });
      
      // Convert cursor to array
      const tools: Tool[] = [];
      for await (const doc of cursor) {
        tools.push(doc as Tool);
      }
      
      return tools;
    } catch (error) {
      throw new Error(`Failed to fetch tools: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateTool(tool: Tool): Promise<void> {
    if (!this.collection) {
      await this.connect();
    }

    try {
      if (tool._id) {
        // Update existing document
        tool.enabled = tool.enabled === false ? false : true;
        const _id = tool._id;
        delete tool._id;
        await this.collection.updateOne(
          { _id: _id },
          { $set: tool }
        );
      } else {
        // Insert new document
        await this.collection.insertOne(tool);
      }
    } catch (error) {
      throw new Error(`Failed to update tool: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getSampleDocuments(tool: Tool, limit: number = 5): Promise<any[]> {
    if (!this.db) {
      await this.connect();
    }

    try {
      const objectType = tool.collection_name ? 'collection' : 'table';
      const objectName = tool.collection_name || tool.table_name;
      const dbName = tool.db_name || this.dbName;

      if (!objectName || !dbName) {
        throw new Error('Collection/table name and database name are required');
      }

      // Get the target database
      const targetDb = this.client!.db(this.endpoint!, { token: this.token });
      
      let targetObject: any;
      if (objectType === 'collection') {
        targetObject = targetDb.collection(objectName);
      } else {
        targetObject = targetDb.table(objectName);
      }

      // Fetch sample documents
      const cursor = targetObject.find({}).limit(limit);
      const documents: any[] = [];
      for await (const doc of cursor) {
        documents.push(doc);
      }

      return documents;
    } catch (error) {
      throw new Error(`Failed to fetch sample documents: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listKeyspaces(): Promise<string[]> {
    if (!this.client) {
      await this.connect();
    }

    try {
      // Get list of databases (keyspaces)
      const admin = this.client!.admin();
      const databases = await admin.listDatabases();
      return databases.map((db: any) => db.name || db.id).filter(Boolean);
    } catch (error) {
      throw new Error(`Failed to list keyspaces: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listCollections(dbName?: string): Promise<string[]> {
    if (!this.db) {
      await this.connect();
    }

    try {
      const targetDbName = dbName || this.dbName;
      if (!targetDbName) {
        throw new Error('Database name is required');
      }

      // Get the database
      const targetDb = this.client!.db(this.endpoint!, { token: this.token });
      
      // List collections
      const collections = await targetDb.listCollections();
      return collections.map((col: any) => col.name || col);
    } catch (error) {
      throw new Error(`Failed to list collections: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listTables(dbName?: string): Promise<string[]> {
    if (!this.db) {
      await this.connect();
    }

    try {
      const targetDbName = dbName || this.dbName;
      if (!targetDbName) {
        throw new Error('Database name is required');
      }

      // Get the database
      const targetDb = this.client!.db(this.endpoint!, { token: this.token });
      
      // List tables
      const tables = await targetDb.listTables();
      return tables.map((table: any) => table.name || table);
    } catch (error) {
      throw new Error(`Failed to list tables: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getTableMetadata(tableName: string, dbName?: string): Promise<any | null> {
    if (!this.db) {
      await this.connect();
    }

    try {
      const targetDbName = dbName || this.dbName;
      if (!targetDbName) {
        throw new Error('Database name is required');
      }
      if (!tableName) {
        throw new Error('Table name is required');
      }

      const targetDb = this.client!.db(this.endpoint!, { token: this.token });
      const tables = await targetDb.listTables();
      const match = tables.find(
        (table: any) =>
          table?.name === tableName || table?.id === tableName || table === tableName
      );
      return match || null;
    } catch (error) {
      throw new Error(
        `Failed to get table metadata: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// Utility function to extract all attributes from documents (including nested)
export function extractAttributes(documents: any[]): string[] {
  const attributes = new Set<string>();

  function extractFromObject(obj: any, prefix: string = '') {
    if (obj === null || obj === undefined) {
      return;
    }

    if (Array.isArray(obj)) {
      // For arrays, check the first element if it's an object
      if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
        extractFromObject(obj[0], prefix);
      }
      return;
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        // Transform keys starting with "$" to "_$"
        const transformedKey = key.startsWith('$') ? `_${key}` : key;
        const fullKey = prefix ? `${prefix}.${transformedKey}` : transformedKey;

        attributes.add(fullKey);

        // Recursively extract nested attributes
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          extractFromObject(value, fullKey);
        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          extractFromObject(value[0], fullKey);
        }
      }
    }
  }

  // Extract attributes from all documents
  for (const doc of documents) {
    extractFromObject(doc);
  }

  return Array.from(attributes).sort();
}

// Singleton instance
let astraClientInstance: AstraClient | null = null;

export function getAstraClient(): AstraClient {
  if (!astraClientInstance) {
    astraClientInstance = new AstraClient();
  }
  return astraClientInstance;
}
