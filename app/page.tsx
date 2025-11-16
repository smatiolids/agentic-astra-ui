'use client';

import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import ToolList from '@/components/ToolList';
import ToolEditor from '@/components/ToolEditor';
import { Tool } from '@/lib/astraClient';

export default function Home() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const response = await fetch('/api/tools');
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load tools');
      }
      
      const loadedTools = data.tools || [];
      // Sort tools alphabetically by name (case-insensitive)
      const sortedTools = loadedTools.sort((a: Tool, b: Tool) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setTools(sortedTools);
      
      // Update selected tool if it still exists
      if (selectedTool) {
        const updatedTool = sortedTools.find(
          (t: Tool) => (t._id && t._id === selectedTool._id) || t.name === selectedTool.name
        );
        if (updatedTool) {
          setSelectedTool(updatedTool);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools');
      console.error('Error loading tools:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleToolSave = async (savedTool: Tool) => {
    // Refresh the tools list without showing loading screen
    await loadTools(false);
    // Update selected tool with the saved data
    setSelectedTool(savedTool);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading tools...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Error Loading Tools</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => loadTools()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleNewTool = () => {
    setSelectedTool({
      type: 'tool',
      name: '',
      collection_name: '',
      table_name: '',
      db_name: '',
      enabled: true,
    } as Tool);
  };

  return (
    <div className="h-screen flex bg-white dark:bg-gray-800">
      <ThemeToggle />
      <ToolList tools={tools} selectedTool={selectedTool} onSelectTool={setSelectedTool} onNewTool={handleNewTool} />
      <ToolEditor tool={selectedTool} onSave={handleToolSave} />
    </div>
  );
}

