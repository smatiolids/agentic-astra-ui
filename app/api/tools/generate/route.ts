import { NextRequest, NextResponse } from 'next/server';
import { generateToolSpecV2 } from '@/agent/toolSpecAgentV2';
import { toSlug, isValidSlug } from '@/lib/utils';
import { getAstraClient } from '@/lib/astraClient';

function getToolIdentity(tool: any): string | undefined {
  if (!tool || typeof tool !== 'object') return undefined;
  return tool._id || tool.tool_id;
}

function preserveExistingToolIdentity(targetToolSpec: any, existingToolSpec: any) {
  if (!targetToolSpec || typeof targetToolSpec !== 'object') return;
  if (!existingToolSpec || typeof existingToolSpec !== 'object') return;

  if (existingToolSpec._id && !targetToolSpec._id) {
    targetToolSpec._id = existingToolSpec._id;
  }

  if (existingToolSpec.tool_id && !targetToolSpec.tool_id) {
    targetToolSpec.tool_id = existingToolSpec.tool_id;
  }
}

function collectionHasVectorizeEnabled(collectionMetadata: any): boolean {
  const service = collectionMetadata?.definition?.vector?.service;
  return !!service;
}

function ensureVectorizeSearchQueryParameter(toolSpec: any) {
  if (!Array.isArray(toolSpec.parameters)) {
    toolSpec.parameters = [];
  }

  const existingIndex = toolSpec.parameters.findIndex((param: any) => {
    if (!param || typeof param !== 'object') return false;
    return param.attribute === '$vectorize' || param.param === 'search_query';
  });

  const vectorizeParam = {
    param: 'search_query',
    paramMode: 'tool_param',
    type: 'string',
    description: 'Natural language search query for semantic search on this vectorized collection',
    attribute: '$vectorize',
    required: false,
    info: 'Auto-added because collection metadata has vectorize enabled',
  };

  if (existingIndex >= 0) {
    toolSpec.parameters[existingIndex] = {
      ...toolSpec.parameters[existingIndex],
      ...vectorizeParam,
    };
    return;
  }

  toolSpec.parameters.unshift(vectorizeParam);
}

export async function POST(request: NextRequest) {
  try {
    const { dataType, name, dbName, prompt, existingToolSpec, model } = await request.json();

    if (!name || !dataType) {
      return NextResponse.json(
        { success: false, error: 'Collection/table name and data type are required' },
        { status: 400 }
      );
    }

    if (dataType !== 'collection' && dataType !== 'table') {
      return NextResponse.json(
        { success: false, error: 'Data type must be "collection" or "table"' },
        { status: 400 }
      );
    }

    const { toolSpec, explanation } = await generateToolSpecV2({
      dataType,
      name,
      dbName,
      prompt,
      existingToolSpec,
      model: typeof model === 'string' && model.length > 0 ? model : undefined,
    });

    toolSpec[dataType === 'collection' ? 'collection_name' : 'table_name'] = name;
    toolSpec.db_name = dbName || process.env.ASTRA_DB_DB_NAME || '';
    toolSpec.type = 'tool';
    toolSpec.enabled = toolSpec.enabled !== false;
    preserveExistingToolIdentity(toolSpec, existingToolSpec);

    // Ensure tool name is a slug
    if (toolSpec.name) {
      const slugName = toSlug(toolSpec.name);
      if (isValidSlug(slugName)) {
        toolSpec.name = slugName;
        
        // Check for duplicate names
        const client = getAstraClient();
        const tools = await client.getTools();
        const existingToolId = getToolIdentity(existingToolSpec);
        const existingToolName =
          existingToolSpec && typeof existingToolSpec === 'object' ? existingToolSpec.name : undefined;

        const duplicateTool = tools.find((t) => {
          if (t.name !== slugName) {
            return false;
          }

          // Regenerating/improving an existing tool should be allowed to keep the same name.
          if (existingToolId && getToolIdentity(t) === existingToolId) {
            return false;
          }

          if (existingToolName && t.name === existingToolName) {
            return false;
          }

          return true;
        });
        
        if (duplicateTool) {
          return NextResponse.json(
            { 
              success: false, 
              error: `A tool with the name "${slugName}" already exists. Please choose a different name.` 
            },
            { status: 409 }
          );
        }
      } else {
        // If generated name is not a valid slug, create one from collection/table name
        toolSpec.name = toSlug(name);
      }
    } else {
      // If no name was generated, create one from collection/table name
      toolSpec.name = toSlug(name);
    }

    if (toolSpec.parameters && Array.isArray(toolSpec.parameters)) {
      toolSpec.parameters = toolSpec.parameters.map((param: any) => ({
        ...param,
        paramMode: param.paramMode || 'tool_param',
      }));
    }

    if (dataType === 'collection') {
      try {
        const client = getAstraClient();
        const collectionMetadata = await client.getCollectionMetadata(name, dbName);
        if (collectionHasVectorizeEnabled(collectionMetadata)) {
          ensureVectorizeSearchQueryParameter(toolSpec);
        }
      } catch (metadataError) {
        console.warn('Unable to inspect collection metadata for vectorize settings:', metadataError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      tool: toolSpec,
      explanation: explanation || undefined, // Include explanation if present
    });
  } catch (error) {
    console.error('Error generating tool:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to generate tool specification';
    const status = message.startsWith('No documents found') ? 404 : 500;
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
