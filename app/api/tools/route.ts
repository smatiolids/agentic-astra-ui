import { NextRequest, NextResponse } from 'next/server';
import { getAstraClient } from '@/lib/astraClient';

export async function GET() {
  try {
    const client = getAstraClient();
    const tools = await client.getTools();
    return NextResponse.json({ success: true, tools });
  } catch (error) {
    console.error('Error fetching tools:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch tools' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tool = await request.json();
    const client = getAstraClient();
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

