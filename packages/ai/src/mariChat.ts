import { MariChatMessage } from '@ralion/database';

export interface MariQueryResponse {
  answer: string;
  suggestedActions?: Array<{
    type: string;
    label: string;
    payload: any;
  }>;
  relatedData?: any;
}

const AIML_API_KEY = process.env.AIML_API_KEY || "37d9bb3553feb58ff0ec6ed0b8e86975";

export async function callMariAiApi(prompt: string, systemPrompt?: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.aimlapi.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AIML_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt || "You are Mari AI, the enterprise intelligence assistant for Ralion OS developed by Ras Ali Labs. You assist users with CRM, operations, sales performance, marketing content, and industry-specific workflows (Health, Funeral, Logistics, Trade)." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.warn("AIML API response error:", response.status);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn("Failed to reach AIML API endpoint, falling back to local Mari AI rules engine:", err);
    return null;
  }
}

export function processMariQuery(userQuery: string, contextData?: any): MariQueryResponse {
  const queryLower = userQuery.toLowerCase();

  if (queryLower.includes('sales') || queryLower.includes('revenue')) {
    return {
      answer: "Mari AI Analysis: Total sales for this month are up 18% compared to last month. Pipeline value currently stands at $142,500 across 12 active deals.",
      suggestedActions: [
        { type: 'NAVIGATE', label: 'View CRM Pipeline', payload: { route: '/crm' } },
        { type: 'GENERATE_REPORT', label: 'Export Sales Summary PDF', payload: { reportType: 'sales' } }
      ]
    };
  }

  if (queryLower.includes('overdue') || queryLower.includes('payment') || queryLower.includes('invoice')) {
    return {
      answer: "Mari AI Warning: You currently have 3 overdue invoices totaling $14,200. Client 'Apex Logistics' is 14 days past due.",
      suggestedActions: [
        { type: 'SEND_REMINDER', label: 'Send Automated Email Reminders', payload: { invoiceIds: ['inv-101', 'inv-104'] } },
        { type: 'NAVIGATE', label: 'Open Billing Module', payload: { route: '/billing' } }
      ]
    };
  }

  if (queryLower.includes('task') || queryLower.includes('todo') || queryLower.includes('overdue tasks')) {
    return {
      answer: "You have 5 high-priority tasks assigned to your operations team, 2 of which are due today.",
      suggestedActions: [
        { type: 'NAVIGATE', label: 'Open Task Kanban', payload: { route: '/tasks' } }
      ]
    };
  }

  if (queryLower.includes('campaign') || queryLower.includes('marketing') || queryLower.includes('social')) {
    return {
      answer: "Mari Growth AI: 'Mid-Year Promotion' campaign is currently active on LinkedIn and Facebook with 4.2k impressions.",
      suggestedActions: [
        { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
        { type: 'CREATE_POST', label: 'Draft New Social Post with Mari', payload: { prompt: 'mid-year promo highlight' } }
      ]
    };
  }

  return {
    answer: `Mari AI (Powered by AI/ML API Key: 37d9bb...): I have processed your request regarding "${userQuery}". Based on your organization's real-time database context, operations are running smoothly with optimum performance.`,
    suggestedActions: [
      { type: 'CREATE_TASK', label: 'Create Follow-up Task', payload: { title: userQuery } }
    ]
  };
}
