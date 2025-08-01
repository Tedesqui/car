// Importa a biblioteca oficial da OpenAI
import OpenAI from 'openai';

// Inicializa o cliente da OpenAI usando a chave de API das variáveis de ambiente da Vercel
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuração para permitir que sua página (frontend) se comunique com esta API (CORS)
const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Ou especifique o domínio do seu site
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `
                Você é um especialista em automóveis. Analise a imagem deste carro e me forneça as seguintes informações em um formato JSON válido:
                1. No campo "modelo", coloque o nome da marca, modelo e geração do carro (ex: "Honda Civic G10", "Volkswagen Gol G5", "Fiat Uno Mille").
                2. No campo "resultado", escreva uma análise completa e detalhada sobre o carro, incluindo:
                   - Marca, Modelo e Ano estimado de fabricação.
                   - Principais características do veículo.
                   - Curiosidades ou pontos fortes/fracos.
                   - Faixa de preço aproximada no mercado de usados brasileiro (em Reais).
                
                Responda APENAS com o objeto JSON, sem nenhum texto antes ou depois.
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

    // --- NOVA LÓGICA DE LIMPEZA E EXTRAÇÃO DO JSON ---
    let jsonString = aiResponseContent;
    const jsonStartIndex = jsonString.indexOf('{');
    const jsonEndIndex = jsonString.lastIndexOf('}');

    // Extrai a string que parece ser o JSON, mesmo que haja texto antes ou depois
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        jsonString = jsonString.substring(jsonStartIndex, jsonEndIndex + 1);
    }
    // --- FIM DA NOVA LÓGICA ---

    try {
      // Tenta fazer o parse da string já limpa
      const parsedResponse = JSON.parse(jsonString);
      return res.status(200).json(parsedResponse);
    } catch (parseError) {
      // Se mesmo após a limpeza o JSON for inválido, usa o fallback
      console.error("Erro ao fazer o parse do JSON da IA mesmo após limpeza:", parseError);
      console.error("String que falhou:", jsonString); // Loga a string problemática para depuração
      return res.status(200).json({
        modelo: "Não foi possível extrair o modelo", // Mensagem de erro mais clara
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

// Exporta a função com o wrapper do CORS
export default allowCors(handler);
