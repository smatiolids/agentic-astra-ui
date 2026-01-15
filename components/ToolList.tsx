'use client';

import { useRouter } from 'next/navigation';
import { Tool } from '@/lib/astraClient';

interface ToolListProps {
  tools: Tool[];
}

export default function ToolList({ tools }: ToolListProps) {
  const router = useRouter();

  const handleEditTool = (tool: Tool) => {
    // Navigate to agentic-tool page with tool ID as query parameter
    const toolId = tool._id || tool.name;
    router.push(`/agentic-tool?toolId=${encodeURIComponent(toolId)}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div>
        {tools.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            No tools found. Create a new tool to get started.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {tools.map((tool, index) => (
              <div
                key={tool._id || tool.name}
                className={`flex items-center gap-4 p-4 ${
                  index !== tools.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
                } ${
                  tool.enabled === false ? 'opacity-60' : ''
                } hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
              >
                <button
                  onClick={() => handleEditTool(tool)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Edit
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {tool.title ? (
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{tool.title}</div>
                    ) : (
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{tool.name}</div>
                    )}
                    {tool.enabled === false && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                        Disabled
                      </span>
                    )}
                  </div>
                  {tool.title && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {tool.name}
                    </div>
                  )}
                  {tool.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1 line-clamp-1">
                      {tool.description}
                    </div>
                  )}
                  {tool.tags && tool.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tool.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

