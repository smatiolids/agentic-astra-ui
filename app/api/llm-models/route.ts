import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

type ProviderResponse = {
  models: string[];
  error?: string;
};

function parseEnvModels(value?: string) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function applyDefault(models: string[], limit: number) {
  if (models.length > 0) {
    return models.slice(0, limit);
  }
  return ['gpt-4o-mini'].slice(0, limit);
}

async function listOpenAIModels(limit: number): Promise<ProviderResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  const envVar = process.env.OPENAI_MODELS;
  if (!apiKey || !envVar) {
    return { models: [] };
  }

  const envModels = parseEnvModels(envVar).slice(0, limit);
  if (envModels.length > 0) {
    return { models: envModels };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.models.list();
    const models = response.data
      .filter((model) => typeof model.created === 'number')
      .filter((model) => !/(audio|speech|tts|image|vision|dall-e|whisper|realtime|transcribe)/i.test(model.id))
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
      .slice(0, limit)
      .map((model) => model.id);
    return { models: models.slice(0, limit) };
  } catch (error) {
    return {
      models: [],
      error: error instanceof Error ? error.message : 'Failed to list OpenAI models',
    };
  }
}

async function listAnthropicModels(limit: number): Promise<ProviderResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const envVar = process.env.ANTHROPIC_MODELS;
  if (!apiKey || !envVar) {
    return { models: [] };
  }

  const envModels = parseEnvModels(envVar).slice(0, limit);
  if (envModels.length > 0) {
    return { models: envModels };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return { models: [], error: `Anthropic API error: ${text}` };
    }

    const data = await response.json();
    const models = Array.isArray(data?.data)
      ? data.data
          .map((model: any) => model.id)
          .filter(Boolean)
          .filter((id: string) => !/(audio|speech|tts|image|vision|dall-e|whisper)/i.test(id))
          .sort()
      : [];
    return { models: models.slice(0, limit) };
  } catch (error) {
    return {
      models: [],
      error: error instanceof Error ? error.message : 'Failed to list Anthropic models',
    };
  }
}

async function listWatsonxModels(limit: number): Promise<ProviderResponse> {
  const apiKey = process.env.WATSONX_API_KEY;
  const baseUrl = process.env.WATSONX_URL;
  const envVar = process.env.IBM_WATSON_MODELS;
  if (!apiKey || !baseUrl || !envVar) {
    return { models: [] };
  }

  const envModels = parseEnvModels(envVar).slice(0, limit);
  if (envModels.length > 0) {
    return { models: envModels };
  }

  try {
    const tokenResponse = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`,
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      return { models: [], error: `Watsonx IAM error: ${text}` };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData?.access_token;
    if (!accessToken) {
      return { models: [], error: 'Watsonx IAM token missing access_token' };
    }

    const modelsResponse = await fetch(
      `${baseUrl.replace(/\/$/, '')}/ml/v1/models?version=2024-03-20`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!modelsResponse.ok) {
      const text = await modelsResponse.text();
      return { models: [], error: `Watsonx models error: ${text}` };
    }

    const data = await modelsResponse.json();
    const resources = Array.isArray(data?.resources) ? data.resources : [];
    const models = resources
      .map((model: any) => model.model_id || model.name || model.id)
      .filter(Boolean)
      .filter((id: string) => !/(audio|speech|tts|image|vision|dall-e|whisper)/i.test(id))
      .sort();
    return { models: models.slice(0, limit) };
  } catch (error) {
    return {
      models: [],
      error: error instanceof Error ? error.message : 'Failed to list Watsonx models',
    };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.max(1, Math.min(50, Number(limitParam))) : 6;
  const safeLimit = Number.isFinite(limit) ? limit : 6;

  const [openai, anthropic, watsonx] = await Promise.all([
    listOpenAIModels(safeLimit),
    listAnthropicModels(safeLimit),
    listWatsonxModels(safeLimit),
  ]);

  const defaultModel =
    (openai.models[0] && `openai:${openai.models[0]}`) ||
    (anthropic.models[0] && `anthropic:${anthropic.models[0]}`) ||
    (watsonx.models[0] && `watsonx:${watsonx.models[0]}`) ||
    '';

  return NextResponse.json({
    success: true,
    defaultModel,
    providers: {
      openai,
      anthropic,
      watsonx,
    },
  });
}
