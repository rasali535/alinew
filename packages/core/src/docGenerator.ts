export interface DocumentTemplateData {
  templateType: 'QUOTE' | 'INVOICE' | 'CLINICAL_INTAKE' | 'TRANSPORT_MANIFEST' | 'FUNERAL_CONTRACT';
  orgName: string;
  clientName: string;
  clientEmail: string;
  items: Array<{ description: string; qty: number; unitPrice: number }>;
  notes?: string;
}

export interface GeneratedDocumentResult {
  documentId: string;
  title: string;
  fileName: string;
  totalAmount: number;
  formattedText: string;
  createdAt: string;
}

export function generateEnterpriseDocument(data: DocumentTemplateData): GeneratedDocumentResult {
  const subtotal = data.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const tax = subtotal * 0.14; // 14% VAT
  const total = subtotal + tax;
  const now = new Date().toISOString();

  let formattedText = `=====================================================\n`;
  formattedText += `${data.orgName.toUpperCase()} — OFFICIAL DOCUMENT\n`;
  formattedText += `Empowered to Prosper | Powered by Ralion Platform\n`;
  formattedText += `=====================================================\n\n`;
  formattedText += `Document Type: ${data.templateType}\n`;
  formattedText += `Issued To: ${data.clientName} (${data.clientEmail})\n`;
  formattedText += `Date: ${now.split('T')[0]}\n\n`;
  formattedText += `-----------------------------------------------------\n`;
  formattedText += `ITEMS / SERVICES:\n`;
  formattedText += `-----------------------------------------------------\n`;

  data.items.forEach((item, idx) => {
    formattedText += `${idx + 1}. ${item.description} x${item.qty} @ $${item.unitPrice.toFixed(2)} = $${(item.qty * item.unitPrice).toFixed(2)}\n`;
  });

  formattedText += `-----------------------------------------------------\n`;
  formattedText += `Subtotal: $${subtotal.toFixed(2)}\n`;
  formattedText += `VAT (14%): $${tax.toFixed(2)}\n`;
  formattedText += `TOTAL AMOUNT: $${total.toFixed(2)}\n`;
  formattedText += `-----------------------------------------------------\n\n`;

  if (data.notes) {
    formattedText += `Notes & Terms:\n${data.notes}\n\n`;
  }

  formattedText += `Generated securely via Ralion Core Engine — Ras Ali Labs\n`;

  const fileName = `${data.templateType.toLowerCase()}_${data.clientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

  return {
    documentId: `doc-gen-${Date.now()}`,
    title: `${data.templateType} — ${data.clientName}`,
    fileName,
    totalAmount: total,
    formattedText,
    createdAt: now
  };
}
