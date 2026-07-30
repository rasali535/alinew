import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
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
  private static db: Database.Database;

  static initialize(): void {
    try {
      const userDataPath = app.getPath('userData'); // AppData/Roaming/Ralion
      const dbPath = path.join(userDataPath, 'ralion-memory.db');
      
      this.db = new Database(dbPath);
      
      // Load sqlite-vec extension
      sqliteVec.load(this.db);

      // Create tables
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          metadata TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // sqlite-vec requires a virtual table for embeddings
      // vec0 is the virtual table module provided by sqlite-vec
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS document_embeddings USING vec0(
          embedding float[768]
        );
      `);

      console.log('[VectorDB] Initialized successfully at', dbPath);
    } catch (error) {
      console.error('[VectorDB] Initialization failed:', error);
    }
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

      // 3. Insert Embedding matching the docId as rowid
      // Convert standard JS array to Float32Array for sqlite-vec
      const float32Array = new Float32Array(embedding);
      
      const insertEmb = this.db.prepare(`
        INSERT INTO document_embeddings (rowid, embedding)
        VALUES (?, ?)
      `);
      insertEmb.run(docId, float32Array);

      return docId;
    } catch (error) {
      console.error('[VectorDB] Add Document failed:', error);
      throw error;
    }
  }

  static async search(query: string, limit: number = 3): Promise<any[]> {
    try {
      // 1. Embed query
      const queryEmbedding = await this.getEmbedding(query);
      const float32Array = new Float32Array(queryEmbedding);

      // 2. Search vec0 table via KNN
      const searchStmt = this.db.prepare(`
        SELECT 
          d.id,
          d.content,
          d.metadata,
          distance
        FROM document_embeddings e
        JOIN documents d ON d.id = e.rowid
        WHERE embedding MATCH ? AND k = ?
        ORDER BY distance
      `);

      const results = searchStmt.all(float32Array, limit);
      
      return results.map((r: any) => ({
        id: r.id,
        content: r.content,
        metadata: JSON.parse(r.metadata),
        distance: r.distance
      }));

    } catch (error) {
      console.error('[VectorDB] Search failed:', error);
      throw error;
    }
  }
}
