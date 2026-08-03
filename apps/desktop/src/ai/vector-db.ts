import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import http from 'http';

export interface DocumentMeta {
  source: string;
  type: string;
  [key: string]: any;
}

export class VectorDB {
  // @ts-ignore
  private static db: any = null;

  static initialize(): void {
    console.log('[VectorDB] SQLite vector memory disabled for desktop stability.');
    this.db = null;
  }

  /**
   * Get an embedding for a string using local Ollama nomic-embed-text
   */
  static async getEmbedding(text: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text
      });

      const options = {
        hostname: '127.0.0.1',
        port: 11434,
        path: '/api/embeddings',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = http.request(options, (res) => {
        let resData = '';
        res.on('data', chunk => { resData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(resData);
            if (parsed.embedding) {
              resolve(parsed.embedding);
            } else {
              reject(new Error('No embedding returned'));
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

  static async addDocument(content: string, metadata: DocumentMeta): Promise<number> {
    if (!this.db) {
      throw new Error('Database is not initialized.');
    }
    try {
      // 1. Get Embedding
      const embedding = await this.getEmbedding(content);

      // 2. Insert Document
      const insertDoc = this.db.prepare(`
        INSERT INTO documents (content, metadata) 
        VALUES (?, ?)
      `);
      const info = insertDoc.run(content, JSON.stringify(metadata));
      const docId = info.lastInsertRowid as number;

      return docId;
    } catch (error) {
      console.error('[VectorDB] Add Document failed:', error);
      throw error;
    }
  }

  static async search(query: string, limit: number = 3): Promise<any[]> {
    if (!this.db) {
      return [];
    }
    try {
      // 1. Embed query
      const queryEmbedding = await this.getEmbedding(query);

      const searchStmt = this.db.prepare(`
        SELECT id, content, metadata
        FROM documents
        ORDER BY id DESC
        LIMIT ?
      `);

      const results = searchStmt.all(limit);
      
      return results.map((r: any) => ({
        id: r.id,
        content: r.content,
        metadata: JSON.parse(r.metadata)
      }));

    } catch (error) {
      console.error('[VectorDB] Search failed:', error);
      throw error;
    }
  }
}

