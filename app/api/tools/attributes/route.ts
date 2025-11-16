import { NextRequest, NextResponse } from 'next/server';
import { getAstraClient, extractAttributes, Tool } from '@/lib/astraClient';

export async function POST(request: NextRequest) {
  try {
    const tool: Tool = await request.json();
    const client = getAstraClient();
    const documents = await client.getSampleDocuments(tool, 5);
    const attributes = extractAttributes(documents);
    
    return NextResponse.json({ 
      success: true, 
      attributes,
      sampleCount: documents.length 
    });
  } catch (error) {
    console.error('Error fetching attributes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch attributes' 
      },
      { status: 500 }
    );
  }
}

