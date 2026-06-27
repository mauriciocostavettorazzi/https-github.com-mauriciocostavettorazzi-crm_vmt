import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body as { text: string };
  if (!text || text.trim().length < 20) {
    return res.status(400).json({ error: 'Texto do PDF muito curto ou vazio.' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Você é um assistente de uma agência de viagens brasileira. Extraia os dados abaixo do texto de uma reserva/voucher e retorne SOMENTE um JSON válido, sem markdown, sem explicação.

Campos a extrair (use null se não encontrar):
{
  "cliente": string,           // nome completo do passageiro principal
  "tipo": string,              // um de: "Passagem Aérea" | "Hotel" | "Pacote" | "Locação de Veículo" | "Seguro" | "Serviço Corporativo"
  "destino": string,           // cidade/país de destino
  "valorBruto": number | null, // valor total em reais (apenas número)
  "numeroPedido": string,      // número do pedido, reserva ou localizador principal
  "observacoes": string,       // resumo útil: datas, hotel, observações relevantes
  "voo": {
    "ciaAerea": string,
    "numeroVoo": string,
    "origem": string,          // código IATA 3 letras
    "destino": string,         // código IATA 3 letras
    "dataPartida": string,     // formato YYYY-MM-DDTHH:mm
    "dataChegada": string,     // formato YYYY-MM-DDTHH:mm
    "localizador": string,
    "passageiros": string,     // nomes dos passageiros separados por vírgula
    "formaEmissao": string     // "Milhas" | "Tarifa Pagante" | "Consolidadora"
  } | null,
  "hospedagem": {
    "nome": string,
    "checkIn": string,         // formato YYYY-MM-DD
    "checkOut": string,        // formato YYYY-MM-DD
    "cidade": string,
    "voucher": string,
    "tipoQuarto": string
  } | null
}

Texto da reserva:
---
${text.slice(0, 8000)}
---`,
        },
      ],
    });

    const raw = (message.content[0] as any).text?.trim() ?? '';
    // Remove possível markdown ```json``` caso o modelo insista
    const clean = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error('extract-pdf error:', err);
    return res.status(500).json({ error: err.message ?? 'Erro ao processar PDF.' });
  }
}
