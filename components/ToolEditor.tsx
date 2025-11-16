'use client';

import { useState, useEffect } from 'react';
import { Tool, ToolParameter } from '@/lib/astraClient';

interface ToolEditorProps {
  tool: Tool | null;
  onSave?: (savedTool: Tool) => void;
}

export default function ToolEditor({ tool, onSave }: ToolEditorProps) {
  const [formData, setFormData] = useState<Tool | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dataType, setDataType] = useState<'collection' | 'table'>('collection');
  const [availableAttributes, setAvailableAttributes] = useState<string[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [isNewTool, setIsNewTool] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newToolData, setNewToolData] = useState({
    dataType: 'collection' as 'collection' | 'table',
    name: '',
    dbName: '',
  });
  const [availableObjects, setAvailableObjects] = useState<string[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);

  useEffect(() => {
    if (tool) {
      // Check if this is a new tool (empty name and no _id)
      const isEmptyTool = !tool.name && !tool._id && !tool.collection_name && !tool.table_name;
      setIsNewTool(isEmptyTool);

      if (isEmptyTool) {
        // New tool - don't normalize yet
        setFormData(tool);
        setDataType('collection');
        setAvailableAttributes([]);
        // Initialize newToolData from tool if it has db_name
        if (tool.db_name) {
          setNewToolData({
            dataType: 'collection',
            name: '',
            dbName: tool.db_name,
          });
        }
        // Load available objects
        loadAvailableObjects('collection', tool.db_name);
      } else {
        // Existing tool - normalize parameters
        const normalizedTool: Tool = {
          ...tool,
          parameters: tool.parameters?.map((param): ToolParameter => {
            // Determine paramMode based on existing fields
            if (!param.paramMode) {
              if (param.expr !== undefined && param.expr !== null && param.expr !== '') {
                return { ...param, paramMode: 'expression' as const };
              } else if (param.value !== undefined && param.value !== null && param.value !== '') {
                return { ...param, paramMode: 'static' as const };
              } else {
                return { ...param, paramMode: 'tool_param' as const };
              }
            }
            return param;
          }) || []
        };
        
        setFormData(normalizedTool);
        
        // Determine initial data type based on which field has a value
        if (tool.collection_name) {
          setDataType('collection');
        } else if (tool.table_name) {
          setDataType('table');
        } else {
          setDataType('collection'); // default
        }

        // Fetch attributes from sample documents
        loadAttributes(tool);
      }
    } else {
      setFormData(null);
      setDataType('collection');
      setAvailableAttributes([]);
      setIsNewTool(false);
    }
  }, [tool]);

  const loadAttributes = async (toolToLoad: Tool) => {
    // Only fetch if we have collection_name or table_name and db_name
    if (!toolToLoad.collection_name && !toolToLoad.table_name) {
      return;
    }

    try {
      setLoadingAttributes(true);
      const response = await fetch('/api/tools/attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toolToLoad),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setAvailableAttributes(data.attributes || []);
      }
    } catch (error) {
      console.error('Error loading attributes:', error);
      // Don't show error to user, just log it
    } finally {
      setLoadingAttributes(false);
    }
  };

  const loadAvailableObjects = async (dataType: 'collection' | 'table', dbName?: string) => {
    try {
      setLoadingObjects(true);
      const type = dataType === 'collection' ? 'collections' : 'tables';
      const url = `/api/db/objects?type=${type}${dbName ? `&dbName=${encodeURIComponent(dbName)}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAvailableObjects(data.objects || []);
      }
    } catch (error) {
      console.error('Error loading available objects:', error);
      // Don't show error to user, just log it
    } finally {
      setLoadingObjects(false);
    }
  };

  const handleSave = async () => {
    if (!formData) return;

    try {
      setSaving(true);
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save tool');
      }

      // Update formData with the saved tool (in case _id was added)
      const savedTool = { ...formData };
      if (data.tool?._id) {
        savedTool._id = data.tool._id;
      }
      setFormData(savedTool);

      // Call the onSave callback to refresh the tool list
      if (onSave) {
        await onSave(savedTool);
      }

      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      alert(`Error saving tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTool = async () => {
    if (!newToolData.name || !newToolData.dataType) {
      alert('Please provide data type and name');
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch('/api/tools/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataType: newToolData.dataType,
          name: newToolData.name,
          dbName: newToolData.dbName,
        }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate tool');
      }

      // Set the generated tool as formData
      const generatedTool = data.tool;
      setFormData(generatedTool);
      setIsNewTool(false);
      
      // Update dataType and load attributes
      setDataType(newToolData.dataType);
      await loadAttributes(generatedTool);
    } catch (error) {
      alert(`Error generating tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  if (!formData) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg">Select a tool from the list to view and edit</p>
        </div>
      </div>
    );
  }

  // Show new tool creation form
  if (isNewTool) {
    return (
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
        <div className="max-w-2xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Create New Tool</h1>
          
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data Type *
              </label>
              <select
                value={newToolData.dataType}
                onChange={(e) => {
                  const newDataType = e.target.value as 'collection' | 'table';
                  setNewToolData({ ...newToolData, dataType: newDataType, name: '' });
                  loadAvailableObjects(newDataType, newToolData.dbName);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              >
                <option value="collection">Collection</option>
                <option value="table">Table</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {newToolData.dataType === 'collection' ? 'Collection Name' : 'Table Name'} *
              </label>
              {availableObjects.length > 0 ? (
                <select
                  value={newToolData.name}
                  onChange={(e) => setNewToolData({ ...newToolData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  <option value="">-- Select {newToolData.dataType} --</option>
                  {availableObjects.map((obj) => (
                    <option key={obj} value={obj}>
                      {obj}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newToolData.name}
                  onChange={(e) => setNewToolData({ ...newToolData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  placeholder={loadingObjects ? `Loading ${newToolData.dataType}s...` : `Enter ${newToolData.dataType} name`}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Database Name
              </label>
              <input
                type="text"
                value={newToolData.dbName}
                onChange={(e) => {
                  const newDbName = e.target.value;
                  setNewToolData({ ...newToolData, dbName: newDbName, name: '' });
                  if (newDbName) {
                    loadAvailableObjects(newToolData.dataType, newDbName);
                  } else {
                    loadAvailableObjects(newToolData.dataType);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                placeholder="Leave empty to use default"
              />
            </div>

            <button
              onClick={handleGenerateTool}
              disabled={generating || !newToolData.name}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {generating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating tool with AI...
                </span>
              ) : (
                'Generate Tool with AI'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const updateField = (field: keyof Tool, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    
    // If collection_name, table_name, or db_name changed, reload attributes
    if ((field === 'collection_name' || field === 'table_name' || field === 'db_name') && updated) {
      if (updated.collection_name || updated.table_name) {
        loadAttributes(updated);
      } else {
        setAvailableAttributes([]);
      }
    }
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
      paramMode: 'tool_param',
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

  const addProjectionField = () => {
    const currentProjection = formData.projection || {};
    const newField = `field_${Object.keys(currentProjection).length + 1}`;
    setFormData({
      ...formData,
      projection: { ...currentProjection, [newField]: 1 }
    });
  };

  const removeProjectionField = (fieldName: string) => {
    if (!formData.projection) return;
    const newProjection = { ...formData.projection };
    delete newProjection[fieldName];
    setFormData({ ...formData, projection: Object.keys(newProjection).length > 0 ? newProjection : undefined });
  };

  const updateProjectionField = (oldFieldName: string, newFieldName: string, value: number | string) => {
    if (!formData.projection) return;
    const newProjection: Record<string, number | string> = { ...formData.projection };
    
    // If field name changed, remove old and add new
    if (oldFieldName !== newFieldName) {
      delete newProjection[oldFieldName];
    }
    
    newProjection[newFieldName] = value;
    setFormData({ ...formData, projection: newProjection });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Edit Tool</h1>
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                ✓ Saved successfully
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Tool'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled !== false}
                    onChange={(e) => updateField('enabled', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tool Enabled
                  </span>
                </label>
                {formData.enabled === false && (
                  <span className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                    Disabled
                  </span>
                )}
              </div>

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
            </div>
          </div>

          {/* Method & Collection */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Database Configuration</h2>
            <div className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data Type
                  </label>
                  <select
                    value={dataType}
                    onChange={(e) => {
                      const newType = e.target.value as 'collection' | 'table';
                      setDataType(newType);
                      // Clear the other field when switching
                      if (newType === 'collection') {
                        updateField('table_name', undefined);
                      } else {
                        updateField('collection_name', undefined);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                  >
                    <option value="collection">Collection</option>
                    <option value="table">Table</option>
                  </select>
                </div>

                {dataType === 'collection' ? (
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
                ) : (
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
                )}
              </div>

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
            </div>
          </div>

          {/* Projection */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Projection</h2>
              <div className="flex gap-2">
                {formData && (formData.collection_name || formData.table_name) && (
                  <button
                    onClick={() => formData && loadAttributes(formData)}
                    disabled={loadingAttributes}
                    className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh attributes from collection/table"
                  >
                    {loadingAttributes ? 'Loading...' : 'Refresh Attributes'}
                  </button>
                )}
                <button
                  onClick={addProjectionField}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Add Field
                </button>
              </div>
            </div>
            {availableAttributes.length > 0 && (
              <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">
                Found {availableAttributes.length} attribute{availableAttributes.length !== 1 ? 's' : ''} from sample documents
              </div>
            )}
            <div className="space-y-4">
              {formData.projection && Object.keys(formData.projection).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                          Attribute
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                          Value
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300 w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(formData.projection).map(([fieldName, value]) => (
                        <tr key={fieldName} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                            {availableAttributes.length > 0 ? (
                              <select
                                value={fieldName}
                                onChange={(e) => {
                                  const newName = e.target.value;
                                  updateProjectionField(fieldName, newName, value);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
                              >
                                <option value="">-- Select attribute --</option>
                                {availableAttributes.map((attr) => (
                                  <option key={attr} value={attr}>
                                    {attr}
                                  </option>
                                ))}
                                {!availableAttributes.includes(fieldName) && fieldName && (
                                  <option value={fieldName}>{fieldName} (custom)</option>
                                )}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={fieldName}
                                onChange={(e) => {
                                  const newName = e.target.value;
                                  updateProjectionField(fieldName, newName, value);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
                                placeholder={loadingAttributes ? 'Loading attributes...' : 'Enter attribute name'}
                              />
                            )}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                            {typeof value === 'number' || (typeof value === 'string' && (value === '1' || value === '0')) ? (
                              <select
                                value={typeof value === 'number' ? value.toString() : value}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  let newValue: number | string;
                                  if (val === '1') {
                                    newValue = 1;
                                  } else if (val === '0') {
                                    newValue = 0;
                                  } else {
                                    // Custom value - keep current value or set empty string
                                    newValue = typeof value === 'string' && value !== '1' && value !== '0' ? value : '';
                                  }
                                  updateProjectionField(fieldName, fieldName, newValue);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
                              >
                                <option value="1">1 (Enable)</option>
                                <option value="0">0 (Disable)</option>
                                <option value="custom">Custom Name/Value</option>
                              </select>
                            ) : (
                              <div className="space-y-2">
                                <select
                                  value="custom"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '1') {
                                      updateProjectionField(fieldName, fieldName, 1);
                                    } else if (val === '0') {
                                      updateProjectionField(fieldName, fieldName, 0);
                                    }
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
                                >
                                  <option value="custom">Custom Name/Value</option>
                                  <option value="1">1 (Enable)</option>
                                  <option value="0">0 (Disable)</option>
                                </select>
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => updateProjectionField(fieldName, fieldName, e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm"
                                  placeholder="Enter custom value"
                                />
                              </div>
                            )}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-center">
                            <button
                              onClick={() => removeProjectionField(fieldName)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                  <p>No projection fields defined. Click "Add Field" to add one.</p>
                </div>
              )}
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

                    {/* 1. Parameter Type and 6. Required on same row */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Parameter Type *
                        </label>
                        <select
                          value={param.paramMode || 'tool_param'}
                          onChange={(e) => updateParameter(index, 'paramMode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        >
                          <option value="tool_param">Tool Param</option>
                          <option value="static">Static Value</option>
                          <option value="expression">Expression</option>
                        </select>
                      </div>

                      {param.paramMode === 'tool_param' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Required
                          </label>
                          <div className="flex items-center h-10">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!param.required}
                                onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                                className="rounded border-gray-300 dark:border-gray-600"
                              />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Required</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. Attribute and 2. Param Name on same row */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Attribute *
                        </label>
                        {availableAttributes.length > 0 ? (
                          <select
                            value={param.attribute || ''}
                            onChange={(e) => updateParameter(index, 'attribute', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                          >
                            <option value="">-- Select attribute --</option>
                            {availableAttributes.map((attr) => (
                              <option key={attr} value={attr}>
                                {attr}
                              </option>
                            ))}
                            {param.attribute && !availableAttributes.includes(param.attribute) && (
                              <option value={param.attribute}>{param.attribute} (custom)</option>
                            )}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={param.attribute || ''}
                            onChange={(e) => updateParameter(index, 'attribute', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                            placeholder={loadingAttributes ? 'Loading attributes...' : '$vectorize, $vector, or column name'}
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Param Name
                        </label>
                        <input
                          type="text"
                          value={param.param || ''}
                          onChange={(e) => updateParameter(index, 'param', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        />
                      </div>
                    </div>

                    {/* 3. Type (data type) and 5. Operator on same row */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      {param.paramMode === 'tool_param' && (
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
                      )}

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

                    {/* Description (only for tool_param) */}
                    {param.paramMode === 'tool_param' && (
                      <div className="mb-3">
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
                    )}

                    {/* 7. Static Value (only for static mode) */}
                    {param.paramMode === 'static' && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Static Value
                        </label>
                        <textarea
                          value={param.value !== undefined && param.value !== null ? String(param.value) : ''}
                          onChange={(e) => {
                            // Try to parse as JSON, otherwise store as string
                            let parsedValue: any = e.target.value;
                            try {
                              parsedValue = JSON.parse(e.target.value);
                            } catch {
                              // Keep as string if not valid JSON
                            }
                            updateParameter(index, 'value', parsedValue);
                          }}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono text-sm"
                          placeholder="Enter any value (JSON will be parsed if valid)"
                        />
                      </div>
                    )}

                    {/* 8. Expression (only for expression mode) */}
                    {param.paramMode === 'expression' && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Python Expression
                        </label>
                        <textarea
                          value={param.expr || ''}
                          onChange={(e) => updateParameter(index, 'expr', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono text-sm"
                          placeholder="e.g., len(context.get('query', ''))"
                        />
                      </div>
                    )}


                    {/* 9. Info */}
                    <div className="mb-3">
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

                    {param.enum && (
                      <div className="mb-3">
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

