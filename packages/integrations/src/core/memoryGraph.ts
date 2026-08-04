/**
 * MARI AI Semantic Knowledge Graph Memory Store
 * Replaces flat JSON with a multi-layered, graph-structured organizational memory model.
 * Stores Business Profiles, Brand Voice, Products, Audience Segments, and Competitors.
 */

export interface KnowledgeNode {
  id: string;
  type: 'BUSINESS_PROFILE' | 'BRAND_VOICE' | 'PRODUCT' | 'SERVICE' | 'AUDIENCE' | 'COMPETITOR' | 'KEYWORD' | 'CAMPAIGN_IDEA';
  label: string;
  data: Record<string, any>;
  confidence: number; // 0.0 to 1.0
  sourceProvider?: string;
  updatedAt: string;
}

export interface KnowledgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: 'HAS_PRODUCT' | 'OFFERS_SERVICE' | 'TARGETS_AUDIENCE' | 'OPERATES_IN' | 'COMPETES_WITH' | 'USES_BRAND_VOICE' | 'ASSOCIATED_KEYWORD';
  weight: number;
}

export interface MariBusinessKnowledgeGraph {
  workspaceId: string;
  businessName: string;
  tagline?: string;
  brandVoice: string;
  targetAudience: string;
  primaryColor?: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  lastLearnedAt: string;
}

const memoryStore: Record<string, MariBusinessKnowledgeGraph> = {};

export class MariMemoryGraph {
  static getWorkspaceGraph(workspaceId: string): MariBusinessKnowledgeGraph {
    if (!memoryStore[workspaceId]) {
      memoryStore[workspaceId] = {
        workspaceId,
        businessName: workspaceId === 'ras-ali-labs' ? 'Ras Ali Labs Enterprise' : 'Ralion Enterprise',
        brandVoice: 'Professional, Authoritative, Innovative, African Excellence',
        targetAudience: 'B2B Enterprise, Mining, Logistics, Healthcare, Funeral Services, Trade',
        nodes: [
          {
            id: 'node-biz-1',
            type: 'BUSINESS_PROFILE',
            label: 'Core Business Profile',
            data: { mission: 'Empowering businesses to prosper through AI operating systems.' },
            confidence: 0.98,
            updatedAt: new Date().toISOString()
          }
        ],
        edges: [],
        lastLearnedAt: new Date().toISOString()
      };
    }
    return memoryStore[workspaceId];
  }

  static addNode(workspaceId: string, node: Omit<KnowledgeNode, 'id' | 'updatedAt'>): KnowledgeNode {
    const graph = this.getWorkspaceGraph(workspaceId);
    const newNode: KnowledgeNode = {
      ...node,
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      updatedAt: new Date().toISOString()
    };
    graph.nodes.push(newNode);
    graph.lastLearnedAt = new Date().toISOString();
    return newNode;
  }

  static addEdge(workspaceId: string, sourceId: string, targetId: string, relationship: KnowledgeEdge['relationship'], weight = 1.0): KnowledgeEdge {
    const graph = this.getWorkspaceGraph(workspaceId);
    const newEdge: KnowledgeEdge = {
      id: `edge-${Date.now()}`,
      sourceId,
      targetId,
      relationship,
      weight
    };
    graph.edges.push(newEdge);
    return newEdge;
  }

  static updateBrandProfile(workspaceId: string, profile: { businessName?: string; brandVoice?: string; targetAudience?: string; primaryColor?: string }) {
    const graph = this.getWorkspaceGraph(workspaceId);
    if (profile.businessName) graph.businessName = profile.businessName;
    if (profile.brandVoice) graph.brandVoice = profile.brandVoice;
    if (profile.targetAudience) graph.targetAudience = profile.targetAudience;
    if (profile.primaryColor) graph.primaryColor = profile.primaryColor;
    graph.lastLearnedAt = new Date().toISOString();
    return graph;
  }

  static generateContextPrompt(workspaceId: string): string {
    const graph = this.getWorkspaceGraph(workspaceId);
    const products = graph.nodes.filter(n => n.type === 'PRODUCT' || n.type === 'SERVICE').map(n => n.label).join(', ');
    const keywords = graph.nodes.filter(n => n.type === 'KEYWORD').map(n => n.label).join(', ');

    return `MARI Learned Business Context:
- Organization: ${graph.businessName}
- Brand Voice: ${graph.brandVoice}
- Target Audience: ${graph.targetAudience}
${products ? `- Key Offerings/Products: ${products}` : ''}
${keywords ? `- Industry Keywords: ${keywords}` : ''}
- Learned Nodes: ${graph.nodes.length} items in MARI Memory Knowledge Graph.`;
  }
}
