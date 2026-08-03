import os from 'os';
import si from 'systeminformation';

export interface ModelOption {
  name: string;
  desc: string;
  minRamGb: number;
  requiresGpu: boolean;
}

export interface HardwareProfile {
  category: 'Basic PC' | 'Business Laptop' | 'AI Workstation';
  ramGb: number;
  hasGpu: boolean;
  recommendedModel: string;
  availableModels: ModelOption[];
}

export class HardwareDetector {
  static async getProfile(): Promise<HardwareProfile> {
    const totalRamBytes = os.totalmem();
    const ramGb = Math.round(totalRamBytes / (1024 ** 3));
    
    let hasGpu = false;
    try {
      const graphics = await si.graphics();
      // Check if there is a dedicated GPU with VRAM
      hasGpu = graphics.controllers.some(c => c.vram && c.vram > 1024);
    } catch (e) {
      console.error('Failed to detect GPU:', e);
    }

    let category: 'Basic PC' | 'Business Laptop' | 'AI Workstation' = 'Basic PC';
    let recommendedModel = 'phi3';

    if (ramGb >= 32 && hasGpu) {
      category = 'AI Workstation';
      recommendedModel = 'llama3.1';
    } else if (ramGb >= 16) {
      category = 'Business Laptop';
      recommendedModel = 'llama3.1';
    } else {
      category = 'Basic PC';
      recommendedModel = 'phi3'; // Lightweight
    }

    const catalog: ModelOption[] = [
      { name: 'phi3', desc: 'Lightweight & Fast (Recommended for Basic PCs)', minRamGb: 4, requiresGpu: false },
      { name: 'llama3.1', desc: 'Powerful Assistant (Recommended for Business Laptops)', minRamGb: 16, requiresGpu: false },
      { name: 'qwen2.5-coder', desc: 'Specialized for Code & Logic', minRamGb: 8, requiresGpu: false },
      { name: 'mistral', desc: 'Fast & Efficient balanced model', minRamGb: 8, requiresGpu: false },
      { name: 'llama3.1:70b', desc: 'Maximum Intelligence (AI Workstation)', minRamGb: 32, requiresGpu: true }
    ];

    const availableModels = catalog.filter(
      m => ramGb >= m.minRamGb && (!m.requiresGpu || hasGpu)
    );

    return {
      category,
      ramGb,
      hasGpu,
      recommendedModel,
      availableModels
    };
  }
}

