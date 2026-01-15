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
  enabled?: boolean | true;
  projection?: Record<string, number>;
  parameters?: ToolParameter[];
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
    // Access Vite environment variables
    this.token = import.meta.env.VITE_ASTRA_DB_APPLICATION_TOKEN || '';
    this.endpoint = import.meta.env.VITE_ASTRA_DB_API_ENDPOINT || '';
    this.dbName = import.meta.env.VITE_ASTRA_DB_DB_NAME || '';
    this.collectionName = import.meta.env.VITE_ASTRA_DB_CATALOG_COLLECTION || 'tool_catalog';

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
        await this.collection.updateOne(
          { _id: tool._id },
          { $set: tool }
        );
      } else {
        // Insert new document
        await this.collection.insertOne({ document: tool });
      }
    } catch (error) {
      throw new Error(`Failed to update tool: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const astraClient = new AstraClient();
