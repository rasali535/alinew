import { exec } from 'child_process';
import http from 'http';

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export class ModelManager {
  /**
   * List installed models
   */
  static async listModels(): Promise<OllamaModel[]> {
    return new Promise((resolve, reject) => {
      const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.models || []);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', (e) => reject(e));
    });
  }

  /**
   * Pull a specific model
   */
  static pullModel(modelName: string, onProgress: (progress: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = exec(`ollama pull ${modelName}`);
      
      child.stdout?.on('data', (data) => {
        onProgress(data.toString().trim());
      });

      child.stderr?.on('data', (data) => {
        onProgress(`Log: ${data.toString().trim()}`);
      });

      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Failed to pull model with code ${code}`));
      });
    });
  }

  /**
   * Remove a model
   */
  static async removeModel(modelName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(`ollama rm ${modelName}`, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
