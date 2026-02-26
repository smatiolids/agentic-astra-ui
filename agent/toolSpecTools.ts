import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getAstraClient } from '@/lib/astraClient';

/**
 * Builds all tools available to the agent for tool specification generation
 */
export async function buildTools() {
  const getTableColumns = tool(
    async ({ tableName, dbName }: { tableName: string; dbName: string | null }) => {
      console.log('[getTableColumns] Tool called', tableName, dbName);
      const client = getAstraClient();
      await client.connect();
      const metadata = await client.getTableMetadata(tableName, dbName ?? undefined);
      const columns = metadata?.definition?.columns || {};
      return JSON.stringify({
        columns,
      });
    },
    {
      name: 'getTableColumns',
      description: 'Get table columns with types from Astra table metadata.',
      schema: z.object({
        tableName: z.string(),
        dbName: z.string().nullable(),
      }),
    }
  );

  const getTableIndexes = tool(
    async ({ tableName, dbName }: { tableName: string; dbName: string | null }) => {
      const client = getAstraClient();
      await client.connect();
      console.log('[getTableIndexes] Tool called', tableName, dbName);
      const metadata = await client.getTableMetadata(tableName, dbName ?? undefined);
      const primaryKey = metadata?.definition?.primaryKey || {};
      const indexes =
        metadata?.definition?.indexes ||
        metadata?.definition?.secondaryIndexes ||
        [];
      return JSON.stringify({
        primaryKey,
        indexes,
      });
    },
    {
      name: 'getTableIndexes',
      description: 'Get table primary key and index metadata for a table.',
      schema: z.object({
        tableName: z.string(),
        dbName: z.string().nullable(),
      }),
    }
  );

  const getTableSampleData = tool(
    async ({ tableName, dbName }: { tableName: string; dbName: string | null }) => {
      const client = getAstraClient();
      await client.connect();
      console.log('[getTableSampleData] Tool called', tableName, dbName);
      const toolInput: any = {
        table_name: tableName,
        db_name: (dbName ?? process.env.ASTRA_DB_DB_NAME) || '',
      };
      const documents = await client.getSampleDocuments(toolInput, 10);
      return JSON.stringify(documents.slice(0, 5));
    },
    {
      name: 'getTableSampleData',
      description: 'Fetch sample rows from a table for schema inference.',
      schema: z.object({
        tableName: z.string(),
        dbName: z.string().nullable(),
      }),
    }
  );

  const getCollectionSampleData = tool(
    async ({ collectionName, dbName }: { collectionName: string; dbName: string | null }) => {
      const client = getAstraClient();
      await client.connect();
      console.log('[getCollectionSampleData] Tool called', collectionName, dbName);
      const toolInput: any = {
        collection_name: collectionName,
        db_name: (dbName ?? process.env.ASTRA_DB_DB_NAME) || '',
      };
      const documents = await client.getSampleDocuments(toolInput, 10);
      return JSON.stringify(documents.slice(0, 5));
    },
    {
      name: 'getCollectionSampleData',
      description: 'Fetch sample documents from a collection for schema inference.',
      schema: z.object({
        collectionName: z.string(),
        dbName: z.string().nullable(),
      }),
    }
  );

  const getTableInstructions = tool(
    async ({ tableName, dbName }: { tableName: string; dbName: string | null }) => {
      console.log('[getTableInstructions] Tool called', tableName, dbName);
      return `IMPORTANT: Consider ONLY the partition keys, sorting keys and indexed  columns as parameteres.
IMPORTANT: Partition keys are mandatory parameters.
IMPORTANT: For indexed date time or timestamps parameters, generate start_<column_name> and end_<column_name> parameters. use $gt and $lte operators.
IMPORTANT: For indexed numeric parameters, generate min_<column_name> and max_<column_name> parameters. use $gte and $lte operators.
IMPORTANT: If the column is a vector column, generate the embedding_model as text-embedding-3-small.`;
    },
    {
      name: 'getTableInstructions',
      description: 'Fetch table instructions for tool generation.',
      schema: z.object({
        tableName: z.string(),
        dbName: z.string().nullable(),
      }),
    }
  );

  const validateColumnForParameter = tool(
    async ({ columnName, tableName, dbName }: { columnName: string; tableName: string; dbName: string | null }) => {
      console.log('[validateColumnForParameter] Tool called', columnName, tableName, dbName);
      const client = getAstraClient();
      await client.connect();
      const metadata = await client.getTableMetadata(tableName, dbName ?? undefined);
      
      const columns = metadata?.definition?.columns || {};
      const primaryKey = metadata?.definition?.primaryKey || {};
      const indexes = metadata?.definition?.indexes || metadata?.definition?.secondaryIndexes || [];
      
      // Check if column exists
      if (!columns[columnName]) {
        return JSON.stringify({
          valid: false,
          reason: `Column "${columnName}" does not exist in table "${tableName}"`,
        });
      }
      
      // Check if it's a partition key (always valid)
      const partitionKeys = Array.isArray(primaryKey.partitionKey) 
        ? primaryKey.partitionKey 
        : primaryKey.partitionKey 
          ? [primaryKey.partitionKey] 
          : [];
      if (partitionKeys.includes(columnName)) {
        return JSON.stringify({
          valid: true,
          reason: `Column "${columnName}" is a partition key`,
        });
      }
      
      // Check if it's a clustering/sorting key (valid)
      const clusteringKeys = Array.isArray(primaryKey.clusteringKey) 
        ? primaryKey.clusteringKey 
        : primaryKey.clusteringKey 
          ? [primaryKey.clusteringKey] 
          : [];
      if (clusteringKeys.includes(columnName)) {
        return JSON.stringify({
          valid: true,
          reason: `Column "${columnName}" is a clustering/sorting key`,
        });
      }
      
      // Check if it's indexed
      const isIndexed = indexes.some((idx: any) => {
        const idxColumns = Array.isArray(idx.column) ? idx.column : idx.column ? [idx.column] : [];
        return idxColumns.includes(columnName);
      });
      
      if (isIndexed) {
        return JSON.stringify({
          valid: true,
          reason: `Column "${columnName}" is indexed`,
        });
      }
      
      // Not valid for filtering
      return JSON.stringify({
        valid: false,
        reason: `Column "${columnName}" is not a partition key, clustering key, or indexed column. Only these columns can be used as filter parameters.`,
      });
    },
    {
      name: 'validateColumnForParameter',
      description: 'Validate if a column can be used as a filter parameter. Returns whether the column is valid and explains why.',
      schema: z.object({
        columnName: z.string(),
        tableName: z.string(),
        dbName: z.string().nullable(),
      }),
    }
  );

  return [getTableColumns, getTableIndexes, getTableSampleData, getCollectionSampleData, getTableInstructions, validateColumnForParameter];
}
