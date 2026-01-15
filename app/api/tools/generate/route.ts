import { NextRequest, NextResponse } from 'next/server';
import { generateToolSpecV2 } from '@/lib/toolSpecAgentV2';
import { toSlug, isValidSlug } from '@/lib/utils';
import { getAstraClient } from '@/lib/astraClient';

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

    // Ensure tool name is a slug
    if (toolSpec.name) {
      const slugName = toSlug(toolSpec.name);
      if (isValidSlug(slugName)) {
        toolSpec.name = slugName;
        
        // Check for duplicate names
        const client = getAstraClient();
        const tools = await client.getTools();
        const duplicateTool = tools.find((t) => t.name === slugName);
        
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
