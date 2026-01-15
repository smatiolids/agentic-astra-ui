'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ToolEditor from '@/components/ToolEditor';
import AgenticConversationPane, {
  ChatMessage,
  DataType,
  ModelOption,
} from '@/components/AgenticConversationPane';
import { Tool } from '@/lib/astraClient';

function ToolSpecPageContent() {
  const searchParams = useSearchParams();
  const toolId = searchParams.get('toolId');
  
  const [formData, setFormData] = useState({
    prompt: '',
    dataType: 'collection' as DataType,
    name: '',
    dbName: '',
  });
  const [availableObjects, setAvailableObjects] = useState<string[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolSpec, setToolSpec] = useState<any | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectionConfirmed, setSelectionConfirmed] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingTool, setLoadingTool] = useState(false);

  const editorTool = useMemo(() => {
    if (!toolSpec) {
      return null;
    }
    return toolSpec as Tool;
  }, [toolSpec]);

  const loadAvailableObjects = async (dataType: DataType, dbName?: string) => {
    try {
      setLoadingObjects(true);
      const type = dataType === 'collection' ? 'collections' : 'tables';
      const url = `/api/db/objects?type=${type}${dbName ? `&dbName=${encodeURIComponent(dbName)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok && data.success) {
        setAvailableObjects(data.objects || []);
      } else {
        setAvailableObjects([]);
      }
    } catch (loadError) {
      console.error('Error loading available objects:', loadError);
      setAvailableObjects([]);
    } finally {
      setLoadingObjects(false);
    }
  };

  useEffect(() => {
    loadAvailableObjects(formData.dataType, formData.dbName || undefined);
  }, [formData.dataType, formData.dbName]);

  useEffect(() => {
    // Load models on component mount
    loadModels();
  }, []);

  useEffect(() => {
    // Load tool if toolId is provided
    if (toolId) {
      loadToolById(toolId);
    }
  }, [toolId]);

  const loadToolById = async (id: string) => {
    try {
      setLoadingTool(true);
      setError(null);
      const response = await fetch('/api/tools');
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load tools');
      }
      
      const tools = data.tools || [];
      const tool = tools.find((t: Tool) => t._id === id || t.name === id);
      
      if (tool) {
        // Populate formData from the tool
        const dataType: DataType = tool.collection_name ? 'collection' : 'table';
        const name = tool.collection_name || tool.table_name || '';
        const dbName = tool.db_name || '';
        
        setFormData({
          prompt: '',
          dataType,
          name,
          dbName,
        });
        
        // Set the tool spec for the editor
        setToolSpec(tool);
        setSelectionConfirmed(true);
        
        // Add a message indicating the tool was loaded
        setMessages([
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: `Loaded tool "${tool.name}" for editing.`,
          },
        ]);
      } else {
        setError(`Tool with ID "${id}" not found.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tool');
      console.error('Error loading tool:', err);
    } finally {
      setLoadingTool(false);
    }
  };

  const handleConfirmSelection = async () => {
    if (!formData.name || !formData.dataType) {
      setError('Please provide a collection/table name and data type.');
      return;
    }
    setSelectionConfirmed(true);
    setError(null);
    
    setMessages((prev) => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `Selected ${formData.dataType} "${formData.name}"${formData.dbName ? ` in "${formData.dbName}"` : ''}. Generating tool specification...`,
      },
    ]);
    
    // Automatically generate tool after selection
    await handleGenerate();
  };

  const loadModels = async () => {
    try {
      setLoadingModels(true);
      const response = await fetch('/api/llm-models?limit=10');
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load models');
      }
      const providerModels: ModelOption[] = [];
      const providers = data.providers || {};
      let defaultModel = typeof data.defaultModel === 'string' ? data.defaultModel : '';
      Object.entries(providers).forEach(([providerName, providerData]) => {
        const modelsList = Array.isArray((providerData as any)?.models)
          ? (providerData as any).models
          : [];
        const latestModels = [...modelsList].sort((a: string, b: string) => b.localeCompare(a)).slice(0, 6);
        latestModels.forEach((modelId: string) => {
          providerModels.push({
            id: `${providerName}:${modelId}`,
            label: `${providerName} · ${modelId}`,
          });
        });
      });
      setModels(providerModels);
      if (defaultModel && !selectedModel) {
        setSelectedModel(defaultModel);
      }
    } catch (loadError) {
      console.error('Error loading models:', loadError);
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.name || !formData.dataType) {
      setError('Please provide a collection/table name and data type.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setToolSpec(null);
      
      // Add user prompt to messages if provided, and always add regenerating message
      setMessages((prev) => {
        const newMessages = [...prev];
        if (formData.prompt && formData.prompt.trim()) {
          newMessages.push({
            id: `user-${Date.now()}`,
            role: 'user',
            content: formData.prompt,
          });
        }
        newMessages.push({
          id: `assistant-${Date.now() + 1}`,
          role: 'assistant',
          content: 'Regenerating tool specification...',
        });
        return newMessages;
      });
      
      const modelToUse = selectedModel;
      
      const response = await fetch('/api/tools/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: formData.prompt || undefined,
          dataType: formData.dataType,
          name: formData.name,
          dbName: formData.dbName,
          model: modelToUse ? modelToUse.split(':')[1] : undefined,
          modelProvider: modelToUse ? modelToUse.split(':')[0] : undefined,
          existingToolSpec: toolSpec,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate tool specification');
      }

      setToolSpec(data.tool);
      // Clear the prompt input after successful submission
      setFormData({ ...formData, prompt: '' });
      
      // Build the response message
      let responseMessage = '';
      if (data.explanation) {
        // Show explanation message
        responseMessage = data.explanation;
      } else {
        // Request was valid - show success
        responseMessage = `Tool specification generated successfully${selectedModel ? ` using ${selectedModel}` : ''}!\n\nThe tool has been loaded into the editor. You can now review and customize it as needed.`;
      }
      
      // Update the last "Regenerating..." message with response
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant' && newMessages[lastIndex].content.includes('Regenerating')) {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: responseMessage,
          };
        } else {
          newMessages.push({
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: responseMessage,
          });
        }
        return newMessages;
      });
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Failed to generate tool specification');
      // Update the last "Regenerating..." message with error message
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant' && newMessages[lastIndex].content.includes('Regenerating')) {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: `Error: ${generateError instanceof Error ? generateError.message : 'Failed to generate tool specification'}`,
          };
        } else {
          newMessages.push({
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: `Error: ${generateError instanceof Error ? generateError.message : 'Failed to generate tool specification'}`,
          });
        }
        return newMessages;
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="h-full w-full bg-white dark:bg-gray-800">
      <div className="h-full w-full p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agentic Tool</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Start with a collection/table selection, then describe the tool you want.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)] min-h-[600px]">
          <AgenticConversationPane
            dataType={formData.dataType}
            name={formData.name}
            dbName={formData.dbName}
            prompt={formData.prompt}
            messages={messages}
            availableObjects={availableObjects}
            loadingObjects={loadingObjects}
            generating={generating}
            error={error}
            selectionConfirmed={selectionConfirmed}
            models={models}
            selectedModel={selectedModel}
            loadingModels={loadingModels}
            onConfirmSelection={handleConfirmSelection}
            onSendPrompt={handleGenerate}
            onChangeModel={(value) => setSelectedModel(value)}
            onChangeDataType={(dataType) => {
              setFormData({ ...formData, dataType, name: '' });
              setSelectionConfirmed(false);
            }}
            onChangeName={(name) => {
              setFormData({ ...formData, name });
              setSelectionConfirmed(false);
            }}
            onChangeDbName={(dbName) => {
              setFormData({ ...formData, dbName, name: '' });
              setSelectionConfirmed(false);
            }}
            onChangePrompt={(prompt) => setFormData({ ...formData, prompt })}
          />

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-1 h-full min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {loadingTool ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 dark:border-gray-200 mb-4"></div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      Loading Tool
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Loading tool for editing...
                    </p>
                  </div>
                </div>
              ) : !editorTool && !generating ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      Ready to Create Your Tool?
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Select a table or collection on the left, then describe what you want your tool to do. We'll generate a complete tool specification for you!
                    </p>
                  </div>
                </div>
              ) : generating ? (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 dark:border-gray-200 mb-4"></div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      Generating Tool
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      The agent is creating a tool specification based on your prompt. This may take a moment...
                    </p>
                  </div>
                </div>
              ) : (
                <ToolEditor tool={editorTool} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ToolSpecPage() {
  return (
    <Suspense fallback={
      <div className="h-full w-full bg-white dark:bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ToolSpecPageContent />
    </Suspense>
  );
}
