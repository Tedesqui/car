// Importa a biblioteca oficial da OpenAI
import OpenAI from 'openai';

// Inicializa o cliente da OpenAI usando a chave de API das variáveis de ambiente da Vercel
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuração para permitir que sua página (frontend) se comunique com esta API (CORS)
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// A função principal que será executada pela Vercel
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Nenhuma imagem fornecida.' });
    }

    // --- PROMPT ATUALIZADO PARA CONTORNAR AS POLÍTICAS DE SEGURANÇA ---
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `
                Aja como um especialista em automóveis criando uma ficha técnica para uma revista. Sua tarefa é descrever o veículo na imagem.
                Use linguagem inferencial (ex: "este parece ser um...", "o ano estimado é...", "características comuns neste modelo incluem...").
                Sua resposta DEVE ser um objeto JSON válido contendo duas chaves: "modelo" e "resultado".

                1.  Na chave "modelo", infira a marca, modelo e geração mais prováveis (ex: "Honda Civic G10", "Volkswagen Gol G5").
                2.  Na chave "resultado", escreva uma descrição informativa sobre o tipo de veículo mostrado, incluindo possíveis características, o ano de fabricação estimado e curiosidades.

                Responda APENAS com o objeto JSON, sem nenhum texto introdutório ou markdown.
              `,
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
                detail: 'low',
              },
            },
          ],
        },
      ],
      max_tokens: 800,
    });

    const aiResponseContent = response.choices[0].message.content;
    let jsonString = aiResponseContent;
    const jsonStartIndex = jsonString.indexOf('{');
    const jsonEndIndex = jsonString.lastIndexOf('}');
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        jsonString = jsonString.substring(jsonStartIndex, jsonEndIndex + 1);
    }

    try {
      const parsedResponse = JSON.parse(jsonString);
      return res.status(200).json(parsedResponse);
    } catch (parseError) {
      console.error("Erro ao fazer o parse do JSON da IA:", parseError);
      return res.status(200).json({
        modelo: "Não extraído",
        resultado: aiResponseContent, 
      });
    }

  } catch (error) {
    console.error('Erro na chamada da API da OpenAI:', error);
    return res.status(500).json({ 
      error: 'Falha ao se comunicar com a IA ou processar a resposta.' 
    });
  }
}

export default allowCors(handler);
