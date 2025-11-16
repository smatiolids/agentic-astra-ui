import { useState, useEffect } from 'react';
import { Tool, ToolParameter } from '../utils/astraClient';

interface ToolEditorProps {
  tool: Tool | null;
}

export default function ToolEditor({ tool }: ToolEditorProps) {
  const [formData, setFormData] = useState<Tool | null>(null);

  useEffect(() => {
    if (tool) {
      setFormData({ ...tool });
    } else {
      setFormData(null);
    }
  }, [tool]);

  if (!formData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg">Select a tool from the list to view and edit</p>
        </div>
      </div>
    );
  }

  const updateField = (field: keyof Tool, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const updateParameter = (index: number, field: keyof ToolParameter, value: any) => {
    if (!formData.parameters) return;
    const newParameters = [...formData.parameters];
    newParameters[index] = { ...newParameters[index], [field]: value };
    setFormData({ ...formData, parameters: newParameters });
  };

  const addParameter = () => {
    const newParam: ToolParameter = {
      param: '',
      description: '',
      type: 'string',
      required: false,
    };
    setFormData({
      ...formData,
      parameters: [...(formData.parameters || []), newParam],
    });
  };

  const removeParameter = (index: number) => {
    if (!formData.parameters) return;
    const newParameters = formData.parameters.filter((_, i) => i !== index);
    setFormData({ ...formData, parameters: newParameters });
  };

  const updateTags = (tagsString: string) => {
    const tags = tagsString.split(',').map(t => t.trim()).filter(t => t);
    updateField('tags', tags);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Edit Tool</h1>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => updateTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  placeholder="products, ecommerce, clothing"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type
                  </label>
                  <input
                    type="text"
                    value={formData.type || ''}
                    onChange={(e) => updateField('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Limit
                  </label>
                  <input
                    type="number"
                    value={formData.limit || ''}
                    onChange={(e) => updateField('limit', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Method & Collection */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Database Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Method
                </label>
                <input
                  type="text"
                  value={formData.method || ''}
                  onChange={(e) => updateField('method', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  placeholder="find, find_documents"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Collection Name
                </label>
                <input
                  type="text"
                  value={formData.collection_name || ''}
                  onChange={(e) => updateField('collection_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Table Name
                </label>
                <input
                  type="text"
                  value={formData.table_name || ''}
                  onChange={(e) => updateField('table_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  DB Name
                </label>
                <input
                  type="text"
                  value={formData.db_name || ''}
                  onChange={(e) => updateField('db_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
          </div>

          {/* Projection */}
          {formData.projection && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Projection</h2>
              <textarea
                value={JSON.stringify(formData.projection, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    updateField('projection', parsed);
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono text-sm"
              />
            </div>
          )}

          {/* Parameters */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Parameters</h2>
              <button
                onClick={addParameter}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Add Parameter
              </button>
            </div>

            {formData.parameters && formData.parameters.length > 0 ? (
              <div className="space-y-4">
                {formData.parameters.map((param, index) => (
                  <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-gray-800 dark:text-gray-200">Parameter {index + 1}</h3>
                      <button
                        onClick={() => removeParameter(index)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Param Name *
                        </label>
                        <input
                          type="text"
                          value={param.param || ''}
                          onChange={(e) => updateParameter(index, 'param', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type
                        </label>
                        <select
                          value={param.type || 'string'}
                          onChange={(e) => updateParameter(index, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        >
                          <option value="string">string</option>
                          <option value="number">number</option>
                          <option value="boolean">boolean</option>
                          <option value="text">text</option>
                          <option value="timestamp">timestamp</option>
                          <option value="float">float</option>
                          <option value="vector">vector</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={param.description || ''}
                        onChange={(e) => updateParameter(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Attribute
                        </label>
                        <input
                          type="text"
                          value={param.attribute || ''}
                          onChange={(e) => updateParameter(index, 'attribute', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                          placeholder="$vectorize, $vector, or column name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Operator
                        </label>
                        <select
                          value={param.operator || '$eq'}
                          onChange={(e) => updateParameter(index, 'operator', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        >
                          <option value="$eq">$eq</option>
                          <option value="$gt">$gt</option>
                          <option value="$gte">$gte</option>
                          <option value="$lt">$lt</option>
                          <option value="$lte">$lte</option>
                          <option value="$in">$in</option>
                          <option value="$ne">$ne</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={!!param.required}
                            onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                            className="rounded border-gray-300 dark:border-gray-600"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Required</span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Embedding Model
                        </label>
                        <input
                          type="text"
                          value={param.embedding_model || ''}
                          onChange={(e) => updateParameter(index, 'embedding_model', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                          placeholder="text-embedding-3-small"
                        />
                      </div>
                    </div>

                    {param.enum && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Enum Values (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={Array.isArray(param.enum) ? param.enum.join(', ') : param.enum}
                          onChange={(e) => {
                            const enumValues = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                            updateParameter(index, 'enum', enumValues.length > 0 ? enumValues : undefined);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        />
                      </div>
                    )}

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Info
                      </label>
                      <input
                        type="text"
                        value={param.info || ''}
                        onChange={(e) => updateParameter(index, 'info', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        placeholder="Partition key, sorting key, indexed column, etc."
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No parameters defined. Click "Add Parameter" to add one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

