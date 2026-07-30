import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import https from 'https';

export class OllamaManager {
  private static isInstalled = false;
  private static isRunning = false;

  static async checkInstallation(): Promise<boolean> {
    return new Promise((resolve) => {
      exec('ollama --version', (error) => {
        if (error) {
          this.isInstalled = false;
          resolve(false);
        } else {
          this.isInstalled = true;
          resolve(true);
        }
      });
    });
  }

  static async install(onProgress: (msg: string) => void): Promise<void> {
    onProgress('Checking for Ollama installation...');
    const installed = await this.checkInstallation();
    if (installed) {
      onProgress('Ollama is already installed.');
      return;
    }

    onProgress('Downloading Ralion AI Engine (Ollama)...');
    
    // Determine OS and download URL
    const platform = os.platform();
    let downloadUrl = '';
    let installerName = '';

    if (platform === 'win32') {
      downloadUrl = 'https://ollama.com/download/OllamaSetup.exe';
      installerName = 'OllamaSetup.exe';
    } else if (platform === 'darwin') {
      downloadUrl = 'https://ollama.com/download/Ollama-darwin.zip';
      installerName = 'Ollama-darwin.zip';
    } else {
      throw new Error('Automated installation on Linux requires manual curl execution: curl -fsSL https://ollama.com/install.sh | sh');
    }

    const tmpDir = os.tmpdir();
    const installerPath = path.join(tmpDir, installerName);

    await this.downloadFile(downloadUrl, installerPath, onProgress);

    onProgress('Installing AI Engine...');
    
    return new Promise((resolve, reject) => {
      if (platform === 'win32') {
        exec(`"${installerPath}" /SILENT`, (error) => {
          if (error) {
            reject(new Error(`Installation failed: ${error.message}`));
          } else {
            this.isInstalled = true;
            onProgress('AI Engine installed successfully.');
            resolve();
          }
        });
      } else if (platform === 'darwin') {
        reject(new Error('macOS auto-install is partially supported.'));
      }
    });
  }

  static async startDaemon(): Promise<void> {
    if (!this.isInstalled) return;
    
    return new Promise((resolve) => {
      exec('ollama serve', (error) => {});
      setTimeout(() => {
        this.isRunning = true;
        resolve();
      }, 3000);
    });
  }

  private static downloadFile(url: string, dest: string, onProgress: (msg: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, (response) => {
        const total = parseInt(response.headers['content-length'] || '0', 10);
        let downloaded = 0;
        
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const percent = ((downloaded / total) * 100).toFixed(1);
            onProgress(`Downloading: ${percent}%`);
          }
        });

        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    });
  }
}
