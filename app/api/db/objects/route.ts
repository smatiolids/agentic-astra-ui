import { NextRequest, NextResponse } from 'next/server';
import { getAstraClient } from '@/lib/astraClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'keyspaces', 'collections', 'tables'
    const dbName = searchParams.get('dbName') || undefined;

    const client = getAstraClient();
    await client.connect();

    let result: string[] = [];

    switch (type) {
      case 'keyspaces':
        result = await client.listKeyspaces();
        break;
      case 'collections':
        result = await client.listCollections(dbName);
        break;
      case 'tables':
        result = await client.listTables(dbName);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type. Must be "keyspaces", "collections", or "tables"' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, objects: result });
  } catch (error) {
    console.error('Error listing database objects:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list database objects',
      },
      { status: 500 }
    );
  }
}

