import OpenAI from 'openai';
import { getAstraClient, extractAttributes } from '@/lib/astraClient';
import {
  SYSTEM_MESSAGE_V1,
  buildToolSpecPromptV1,
} from '@/agent/prompts';

type DataType = 'collection' | 'table';

type ToolSpecState = {
  prompt: string;
  dataType: DataType;
  name: string;
  dbName?: string;
  sampleData: any[];
  attributes: string[];
  tableMetadata?: any;
  existingToolSpec?: any;
  model?: string;
  toolSpec?: any;
};

export type ToolSpecInput = {
  dataType: DataType;
  name: string;
  dbName?: string;
  prompt?: string;
  existingToolSpec?: any;
  model?: string;
};

function parseJsonResponse(responseContent: string) {
  try {
    return JSON.parse(responseContent);
  } catch (parseError) {
    const jsonMatch =
      responseContent.match(/```json\s*([\s\S]*?)\s*```/) ||
      responseContent.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('Failed to parse OpenAI response as JSON');
  }
}

async function buildToolSpecGraph() {
  const { StateGraph, END, START, Annotation } = await import('@langchain/langgraph');
  const GraphState = (Annotation as any).Root({
    prompt: (Annotation as any)(),
    dataType: (Annotation as any)(),
    name: (Annotation as any)(),
    dbName: (Annotation as any)(),
    sampleData: (Annotation as any)(),
    attributes: (Annotation as any)(),
    tableMetadata: (Annotation as any)(),
    toolSpec: (Annotation as any)(),
  });

  const graph = new StateGraph(GraphState)
    .addNode('loadData', async (state: ToolSpecState) => {
      const client = getAstraClient();
      await client.connect();
      const tool: any = {
        [state.dataType === 'collection' ? 'collection_name' : 'table_name']: state.name,
        db_name: state.dbName || process.env.ASTRA_DB_DB_NAME || '',
      };

      const documents = await client.getSampleDocuments(tool, 10);
      if (documents.length === 0) {
        throw new Error(`No documents found in ${state.dataType} "${state.name}"`);
      }

      let attributes = extractAttributes(documents);
      let tableMetadata: any | undefined;
      if (state.dataType === 'table') {
        tableMetadata = await client.getTableMetadata(state.name, state.dbName);
        const columns = tableMetadata?.definition?.columns || {};
        const columnNames = Object.keys(columns);
        if (columnNames.length > 0) {
          attributes = Array.from(new Set([...columnNames, ...attributes])).sort();
        }
      }
      const sampleData = documents.slice(0, 5).map((doc: any) => {
        const { _id, ...rest } = doc;
        return rest;
      });

      return { sampleData, attributes, tableMetadata };
    })
    .addNode('generateSpec', async (state: ToolSpecState) => {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const userPrompt = state.prompt?.trim();
      const existingSpec =
        state.existingToolSpec && Object.keys(state.existingToolSpec).length > 0
          ? JSON.stringify(state.existingToolSpec, null, 2)
          : '';
      const tableDefinition =
        state.dataType === 'table' && state.tableMetadata?.definition
          ? JSON.stringify(
              {
                columns: state.tableMetadata.definition.columns || {},
                primaryKey: state.tableMetadata.definition.primaryKey || {},
              },
              null,
              2
            )
          : '';
      
      const prompt = buildToolSpecPromptV1({
        dataType: state.dataType,
        name: state.name,
        dbName: state.dbName,
        userPrompt,
        existingSpec,
        tableDefinition,
        attributes: state.attributes,
        sampleData: state.sampleData,
      });

      const completion = await openai.chat.completions.create({
        model: state.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_MESSAGE_V1,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'tool_spec',
            schema: {
              type: 'object',
              additionalProperties: false,
              required: [
                'name',
                'description',
                'type',
                'method',
                state.dataType === 'collection' ? 'collection_name' : 'table_name',
                'db_name',
                'parameters',
                'projection',
                'limit',
                'enabled',
                'tags',
              ],
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                type: { type: 'string' },
                method: { type: 'string' },
                collection_name: { type: 'string' },
                table_name: { type: 'string' },
                db_name: { type: 'string' },
                parameters: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: [
                      'param',
                      'paramMode',
                      'type',
                      'description',
                      'attribute',
                      'operator',
                      'required',
                    ],
                    properties: {
                      param: { type: 'string' },
                      paramMode: {
                        type: 'string',
                        enum: ['tool_param', 'static', 'expression'],
                      },
                      type: {
                        type: 'string',
                        enum: ['string', 'number', 'boolean', 'timestamp', 'float', 'vector'],
                      },
                      description: { type: 'string' },
                      attribute: { type: 'string' },
                      operator: {
                        type: 'string',
                        enum: ['$eq', '$gt', '$gte', '$lt', '$lte', '$in', '$ne'],
                      },
                      required: { type: 'boolean' },
                      expr: { type: 'string' },
                      value: {},
                    },
                  },
                },
                projection: {
                  type: 'object',
                  additionalProperties: {
                    anyOf: [{ type: 'number' }, { type: 'string' }],
                  },
                },
                limit: { type: 'number' },
                enabled: { type: 'boolean' },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
        },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      const toolSpec = parseJsonResponse(responseContent);
      return { toolSpec };
    })
    .addEdge(START, 'loadData')
    .addEdge('loadData', 'generateSpec')
    .addEdge('generateSpec', END);

  return graph.compile();
}

export async function generateToolSpec(input: ToolSpecInput) {
  try {
    const toolSpecGraph = await buildToolSpecGraph();
    const result = await toolSpecGraph.invoke({
      prompt: typeof input.prompt === 'string' ? input.prompt : '',
      dataType: input.dataType,
      name: input.name,
      dbName: input.dbName,
      existingToolSpec: input.existingToolSpec,
      model: typeof input.model === 'string' && input.model.length > 0 ? input.model : undefined,
    });

    const toolSpec = result?.toolSpec;
    if (!toolSpec) {
      throw new Error('Tool specification was not generated');
    }

    return { toolSpec };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown agent error';
    throw error;
  }
}
