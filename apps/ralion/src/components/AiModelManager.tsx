'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Download, Server, Cpu, Trash2, CheckCircle2 } from 'lucide-react';

export function AiModelManager() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState('');
  const [models, setModels] = useState<any[]>([]);
  const [hardware, setHardware] = useState<any>(null);
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState('');

  useEffect(() => {
    // Check status on mount
    if (typeof window !== 'undefined' && (window as any).__RALION_DESKTOP__) {
      const ipc = (window as any).electron?.ipcRenderer;
      if (ipc) {
        ipc.invoke('ai-check-status').then((res: any) => setIsInstalled(res.isInstalled));
        ipc.invoke('ai-get-hardware-profile').then(setHardware);
        
        ipc.on('ai-install-progress', (_: any, msg: string) => setInstallProgress(msg));
        ipc.on('ai-pull-progress', (_: any, data: any) => {
          if (data.model === downloadingModel) {
            setDownloadProgress(data.msg);
          }
        });
        
        loadModels();
      }
    }
  }, [downloadingModel]);

  const loadModels = async () => {
    const ipc = (window as any).electron?.ipcRenderer;
    if (ipc) {
      const m = await ipc.invoke('ai-list-models');
      setModels(m);
    }
  };

  const handleInstallEngine = async () => {
    setInstalling(true);
    const ipc = (window as any).electron?.ipcRenderer;
    if (ipc) {
      const res = await ipc.invoke('ai-install-engine');
      if (res.success) {
        setIsInstalled(true);
      } else {
        alert('Installation failed: ' + res.error);
      }
    }
    setInstalling(false);
  };

  const handleDownloadModel = async (modelName: string) => {
    setDownloadingModel(modelName);
    setDownloadProgress('Starting download...');
    const ipc = (window as any).electron?.ipcRenderer;
    if (ipc) {
      const res = await ipc.invoke('ai-pull-model', modelName);
      if (!res.success) {
        alert('Download failed: ' + res.error);
      }
      loadModels();
    }
    setDownloadingModel(null);
  };

  const handleRemoveModel = async (modelName: string) => {
    const ipc = (window as any).electron?.ipcRenderer;
    if (ipc) {
      await ipc.invoke('ai-remove-model', modelName);
      loadModels();
    }
  };

  if (!(window as any).__RALION_DESKTOP__) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-zinc-400">Local AI features are only available in the Ralion Desktop Application.</p>
        </CardContent>
      </Card>
    );
  }

  const availableModels = [
    { name: 'phi3', desc: 'Lightweight & Fast (Recommended for Basic PCs)' },
    { name: 'llama3.1', desc: 'Powerful Assistant (Recommended for Business Laptops)' },
    { name: 'qwen2.5-coder', desc: 'Specialized for Code & Logic' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" /> Local AI Engine
              </CardTitle>
              <CardDescription>Ralion Private Intelligence Runtime (Powered by Ollama)</CardDescription>
            </div>
            {isInstalled ? (
              <Badge variant="success">Engine Running</Badge>
            ) : (
              <Badge variant="danger">Not Installed</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isInstalled ? (
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col items-center justify-center py-8">
              <p className="text-sm text-zinc-400 mb-4 text-center max-w-md">
                The Ralion Local AI Engine allows Mari AI to operate entirely offline, keeping your business data 100% private.
              </p>
              <Button onClick={handleInstallEngine} disabled={installing}>
                {installing ? 'Installing...' : 'Install AI Engine'}
              </Button>
              {installing && <p className="text-xs text-zinc-500 mt-2">{installProgress}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {hardware && (
                <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex items-center gap-4 text-sm">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-white font-medium">{hardware.category} detected </span>
                    <span className="text-zinc-400">({hardware.ramGb}GB RAM, GPU: {hardware.hasGpu ? 'Yes' : 'No'}). </span>
                    <span className="text-zinc-400">Recommended Model: </span>
                    <span className="text-blue-400 font-bold">{hardware.recommendedModel}</span>
                  </div>
                </div>
              )}

              <div className="grid gap-3 mt-4">
                <h3 className="text-sm font-semibold text-white mb-2">Available Models</h3>
                {availableModels.map(m => {
                  const installed = models.find(mod => mod.name.includes(m.name));
                  const isDownloading = downloadingModel === m.name;
                  
                  return (
                    <div key={m.name} className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{m.name}</span>
                          {installed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          {hardware?.recommendedModel === m.name && <Badge variant="primary" className="text-[10px]">Recommended</Badge>}
                        </div>
                        <p className="text-xs text-zinc-500">{m.desc}</p>
                      </div>
                      
                      <div>
                        {installed ? (
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveModel(m.name)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : isDownloading ? (
                          <span className="text-xs text-blue-400">{downloadProgress}</span>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleDownloadModel(m.name)}>
                            <Download className="w-4 h-4 mr-1" /> Download
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
