'use client';

import { useEffect } from 'react';

export type DataType = 'collection' | 'table';

export type ChatMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ModelOption = {
  id: string;
  label: string;
};

interface AgenticConversationPaneProps {
  dataType: DataType;
  name: string;
  dbName: string;
  prompt: string;
  messages: ChatMessage[];
  availableObjects: string[];
  loadingObjects: boolean;
  generating: boolean;
  error: string | null;
  selectionConfirmed: boolean;
  models: ModelOption[];
  selectedModel: string;
  loadingModels: boolean;
  onConfirmSelection: () => void;
  onSendPrompt: () => void;
  onChangeModel: (value: string) => void;
  onChangeDataType: (value: DataType) => void;
  onChangeName: (value: string) => void;
  onChangeDbName: (value: string) => void;
  onChangePrompt: (value: string) => void;
}

export default function AgenticConversationPane({
  dataType,
  name,
  dbName,
  prompt,
  messages,
  availableObjects,
  loadingObjects,
  generating,
  error,
  selectionConfirmed,
  models,
  selectedModel,
  loadingModels,
  onConfirmSelection,
  onSendPrompt,
  onChangeModel,
  onChangeDataType,
  onChangeName,
  onChangeDbName,
  onChangePrompt,
}: AgenticConversationPaneProps) {
  useEffect(() => {
    const container = document.getElementById('agentic-conversation-scroll');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex flex-col h-full min-h-0 resize-x overflow-auto min-w-[320px] max-w-[60%]"
      style={{ width: '420px' }}
    >
      {!selectionConfirmed ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Agent Context</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select the table or collection to start creating the tool
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Data Type
              </label>
              <select
                value={dataType}
                onChange={(e) => onChangeDataType(e.target.value as DataType)}
                className="w-full px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
              >
                <option value="collection">Collection</option>
                <option value="table">Table</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Database Name
              </label>
              <input
                type="text"
                value={dbName}
                onChange={(e) => onChangeDbName(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
                placeholder="Default DB"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {dataType === 'collection' ? 'Collection Name' : 'Table Name'}
            </label>
            {availableObjects.length > 0 ? (
              <select
                value={name}
                onChange={(e) => onChangeName(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
              >
                <option value="">Select a {dataType}</option>
                {availableObjects.map((obj) => (
                  <option key={obj} value={obj}>
                    {obj}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={name}
                onChange={(e) => onChangeName(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
                placeholder={loadingObjects ? `Loading ${dataType}s...` : `Enter ${dataType} name`}
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => onChangeModel(e.target.value)}
              disabled={loadingModels || models.length === 0}
              className="w-full px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingModels ? 'Loading models...' : models.length === 0 ? 'No models available' : 'Select a model'}
              </option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onConfirmSelection}
              disabled={!name}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Create Tool
            </button>
            {loadingObjects && (
              <span className="text-xs text-gray-500 dark:text-gray-400">Refreshing objects...</span>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Conversation</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The agent will explain its reasoning and prompt usage here.
              </p>
            </div>
          </div>

          <div
            id="agentic-conversation-scroll"
            className="flex-1 min-h-0 overflow-y-auto mt-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white ml-8'
                    : message.role === 'assistant'
                      ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 mr-8'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>

          {name ? (
            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Prompt (Optional - for regenerating/refining)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => onChangePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!generating && prompt.trim()) {
                      onSendPrompt();
                    }
                  }
                }}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
                placeholder="Optionally provide a prompt to refine or regenerate the tool... (Press Enter to submit, Shift+Enter for new line)"
              />
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Selected {dataType}: <span className="font-medium text-gray-700 dark:text-gray-200">{name}</span>
                {dbName ? (
                  <>
                    {' '}
                    · DB: <span className="font-medium text-gray-700 dark:text-gray-200">{dbName}</span>
                  </>
                ) : (
                  ' · DB: default'
                )}
                {selectedModel && (
                  <>
                    {' '}
                    · Model: <span className="font-medium text-gray-700 dark:text-gray-200">{selectedModel}</span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={onSendPrompt}
                  disabled={generating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {generating ? 'Regenerating...' : 'Regenerate Tool'}
                </button>
                {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
