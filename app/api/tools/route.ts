import { NextRequest, NextResponse } from 'next/server';
import { getAstraClient, isCatalogCollectionNotFoundError } from '@/lib/astraClient';
import { toSlug, isValidSlug } from '@/lib/utils';

function getToolIdentity(tool: any): string | undefined {
  if (!tool || typeof tool !== 'object') return undefined;
  return tool._id || tool.tool_id;
}

export async function GET() {
  try {
    const client = getAstraClient();
    const tools = await client.getTools();
    return NextResponse.json({ success: true, tools });
  } catch (error) {
    console.error('Error fetching tools:', error);
    const collectionName = process.env.ASTRA_DB_CATALOG_COLLECTION || 'tool_catalog';
    const isMissingCollection = isCatalogCollectionNotFoundError(error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch tools',
        errorCode: isMissingCollection ? 'CATALOG_COLLECTION_NOT_FOUND' : 'TOOLS_FETCH_FAILED',
        collectionName: isMissingCollection ? collectionName : undefined,
      },
      { status: isMissingCollection ? 404 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tool = await request.json();
    
    // Validate tool name
    if (!tool.name || tool.name.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tool name is required' 
        },
        { status: 400 }
      );
    }

    // Convert name to slug
    const slugName = toSlug(tool.name);
    
    // Validate slug format
    if (!isValidSlug(slugName)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tool name must be a valid slug (lowercase letters, numbers, and hyphens only)' 
        },
        { status: 400 }
      );
    }

    // Check for duplicate names
    const client = getAstraClient();
    const tools = await client.getTools();
    const currentToolId = getToolIdentity(tool);
    const duplicateTool = tools.find((t) => {
      if (t.name !== slugName) {
        return false;
      }

      if (currentToolId && getToolIdentity(t) === currentToolId) {
        return false;
      }

      return true;
    });

    if (duplicateTool) {
      return NextResponse.json(
        { 
          success: false, 
          error: `A tool with the name "${slugName}" already exists` 
        },
        { status: 409 }
      );
    }

    // Update tool name to slug before saving
    tool.name = slugName;
    
    await client.updateTool(tool);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tool:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update tool' 
      },
      { status: 500 }
    );
  }
}
