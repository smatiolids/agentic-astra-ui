import { NextResponse } from 'next/server';
import { getAstraClient } from '@/lib/astraClient';

export async function POST() {
  const collectionName = process.env.ASTRA_DB_CATALOG_COLLECTION || 'tool_catalog';

  try {
    const client = getAstraClient();
    await client.createCatalogCollection();

    return NextResponse.json({
      success: true,
      collectionName,
    });
  } catch (error) {
    console.error('Error creating catalog collection:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create catalog collection',
        collectionName,
      },
      { status: 500 }
    );
  }
}
