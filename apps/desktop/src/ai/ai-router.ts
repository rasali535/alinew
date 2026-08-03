import http from 'http';
import https from 'https';

export class AiRouter {
  private static localBaseUrl = 'http://127.0.0.1:11434/api/generate';

  /**
   * Evaluates prompt complexity to decide routing
   */
  private static isComplex(prompt: string): boolean {
    const complexKeywords = ['strategy', 'analysis', 'multi-platform', 'campaign', 'reasoning'];
    return complexKeywords.some(keyword => prompt.toLowerCase().includes(keyword)) || prompt.length > 500;
  }

  /**
   * Route a query to either Local Ollama or Cloud API
   */
  static async query(
    prompt: string, 
    localModel: string, 
    cloudApiKey: string, 
    offlineMode: boolean = false
  ): Promise<string> {
    
    // If offline only or simple prompt, route local
    if (offlineMode || !this.isComplex(prompt)) {
      return this.queryLocal(prompt, localModel);
    } else {
      // Route Cloud
      try {
        return await this.queryCloud(prompt, cloudApiKey);
      } catch (error) {
        // Fallback to local if cloud fails
        console.warn('Cloud API failed, falling back to local AI:', error);
        return this.queryLocal(prompt, localModel);
      }
    }
  }

  private static queryLocal(prompt: string, model: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = http.request(this.localBaseUrl, options, (res) => {
        let resData = '';
        res.on('data', chunk => { resData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(resData);
            resolve(parsed.response || 'No response from local model.');
          } catch (e) {
            reject(new Error('Failed to parse local AI response.'));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(data);
      req.end();
    });
  }

  private static queryCloud(prompt: string, apiKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Mari AI, an advanced business assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 600,
        temperature: 0.7
      });

      const options = {
        hostname: 'api.aimlapi.com',
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': data.length
        }
      };

      const req = https.request(options, (res) => {
        let resData = '';
        res.on('data', chunk => { resData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(resData);
            if (parsed.choices && parsed.choices.length > 0) {
              resolve(parsed.choices[0].message.content);
            } else {
              reject(new Error('Cloud API returned empty choices.'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(data);
      req.end();
    });
  }
}
