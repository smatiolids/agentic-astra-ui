import { NextRequest, NextResponse } from 'next/server';
import { getAstraClient, extractAttributes } from '@/lib/astraClient';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { dataType, name, dbName } = await request.json();

    if (!name || !dataType) {
      return NextResponse.json(
        { success: false, error: 'Collection/table name and data type are required' },
        { status: 400 }
      );
    }

    // Get sample documents
    const client = getAstraClient();
    await client.connect();
    const tool: any = {
      [dataType === 'collection' ? 'collection_name' : 'table_name']: name,
      db_name: dbName || process.env.ASTRA_DB_DB_NAME || '',
    };

    const documents = await client.getSampleDocuments(tool, 10);
    const attributes = extractAttributes(documents);

    if (documents.length === 0) {
      return NextResponse.json(
        { success: false, error: `No documents found in ${dataType} "${name}"` },
        { status: 404 }
      );
    }

    // Prepare sample data for OpenAI
    const sampleData = documents.slice(0, 5).map((doc: any) => {
      const { _id, ...rest } = doc;
      return rest;
    });

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create prompt for OpenAI
    const prompt = `You are an expert at creating database query tool specifications. Based on the following ${dataType} structure and sample data, generate a comprehensive tool specification in JSON format.

${dataType} Name: ${name}
Available Attributes: ${attributes.join(', ')}

Sample Documents (first 5):
${JSON.stringify(sampleData, null, 2)}

Generate a tool specification JSON with the following structure:
{
  "name": "descriptive_tool_name",
  "description": "Clear description of what this tool does",
  "type": "tool",
  "method": "find",
  "${dataType === 'collection' ? 'collection_name' : 'table_name'}": "${name}",
  "db_name": "${dbName || 'default'}",
  "parameters": [
    {
      "param": "parameter_name",
      "paramMode": "tool_param",
      "type": "string|number|boolean|text|timestamp|float|vector",
      "description": "Parameter description",
      "attribute": "attribute_name_from_list",
      "operator": "$eq|$gt|$gte|$lt|$lte|$in|$ne",
      "required": true|false
    }
  ],
  "projection": {
    "attribute_name": 1
  },
  "limit": 10,
  "enabled": true,
  "tags": ["relevant", "tags"]
}

Return ONLY valid JSON, no markdown, no explanations.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating database query tool specifications. Always return valid JSON only, no markdown formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let toolSpec;
    try {
      toolSpec = JSON.parse(responseContent);
    } catch (parseError) {
      // Try to extract JSON from markdown if present
      const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseContent.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        toolSpec = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse OpenAI response as JSON');
      }
    }

    // Ensure required fields are set
    toolSpec[dataType === 'collection' ? 'collection_name' : 'table_name'] = name;
    toolSpec.db_name = dbName || process.env.ASTRA_DB_DB_NAME || '';
    toolSpec.type = 'tool';
    toolSpec.enabled = toolSpec.enabled !== false;

    // Normalize parameters
    if (toolSpec.parameters && Array.isArray(toolSpec.parameters)) {
      toolSpec.parameters = toolSpec.parameters.map((param: any) => ({
        ...param,
        paramMode: param.paramMode || 'tool_param',
      }));
    }

    return NextResponse.json({ success: true, tool: toolSpec });
  } catch (error) {
    console.error('Error generating tool:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate tool specification',
      },
      { status: 500 }
    );
  }
}

