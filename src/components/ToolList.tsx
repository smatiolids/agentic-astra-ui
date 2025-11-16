import { Tool } from '../utils/astraClient';

interface ToolListProps {
  tools: Tool[];
  selectedTool: Tool | null;
  onSelectTool: (tool: Tool) => void;
}

export default function ToolList({ tools, selectedTool, onSelectTool }: ToolListProps) {
  return (
    <div className="w-80 border-l border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 h-screen overflow-y-auto">
      <div className="p-4 border-b border-gray-300 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Tools</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tools.length} tool{tools.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="p-2">
        {tools.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No tools found
          </div>
        ) : (
          <div className="space-y-1">
            {tools.map((tool) => (
              <button
                key={tool._id || tool.name}
                onClick={() => onSelectTool(tool)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedTool?._id === tool._id || selectedTool?.name === tool.name
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">{tool.name}</div>
                {tool.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {tool.description}
                  </div>
                )}
                {tool.tags && tool.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
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
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

