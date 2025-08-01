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
  // Garante que a requisição é do tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    // 1. Recebe a imagem enviada pelo frontend
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Nenhuma imagem fornecida.' });
    }

    // 2. Chama a API da OpenAI para analisar a imagem
    const response = await openai.chat.completions.create({
      // Usamos o gpt-4o, que é o modelo mais rápido e eficiente para visão
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              // Instrução detalhada para a IA
              text: `
                Você é um especialista em automóveis. Analise a imagem deste carro e me forneça as seguintes informações em um formato JSON válido:
                1. No campo "modelo", coloque o nome da marca, modelo e geração do carro (ex: "Honda Civic G10", "Volkswagen Gol G5", "Fiat Uno Mille").
                2. No campo "resultado", escreva uma análise completa e detalhada sobre o carro, incluindo:
                   - Marca, Modelo e Ano estimado de fabricação.
                   - Principais características do veículo.
                   - Curiosidades ou pontos fortes/fracos.
                   - Faixa de preço aproximada no mercado de usados brasileiro (em Reais).
                
                Responda APENAS com o objeto JSON, sem nenhum texto antes ou depois.
                Exemplo de como a resposta deve ser:
                {
                  "modelo": "Toyota Corolla XEi 2.0 2023",
                  "resultado": "Marca: Toyota\\nModelo: Corolla XEi 2.0\\nAno Estimado: 2022-2023\\n\\nCaracterísticas: Este é um dos sedans mais vendidos do mundo, conhecido por sua confiabilidade e conforto..."
                }
              `,
            },
            {
              type: 'image_url',
              image_url: {
                // A imagem em base64 recebida do frontend
                url: image,
                detail: 'low', // Usar 'low' torna a análise mais rápida e barata
              },
            },
          ],
        },
      ],
      // Define um número máximo de "tokens" para a resposta para evitar custos inesperados
      max_tokens: 800,
    });

    // 3. Processa e envia a resposta de volta para a página
    const aiResponseContent = response.choices[0].message.content;

    // Tenta converter a resposta da IA (que é uma string) em um objeto JSON real
    try {
      const parsedResponse = JSON.parse(aiResponseContent);
      return res.status(200).json(parsedResponse);
    } catch (parseError) {
      // Se a IA não retornar um JSON válido, retorna a resposta como texto simples
      console.error("Erro ao fazer o parse do JSON da IA:", parseError);
      return res.status(200).json({
        modelo: "Não identificado",
        resultado: aiResponseContent, // Envia o texto bruto que a IA retornou
      });
    }

  } catch (error) {
    // 4. Tratamento de erros
    console.error('Erro na chamada da API da OpenAI:', error);
    // NOTA: Se o erro de timeout da Vercel (TASK_TIMED_OUT) continuar,
    // a solução mais robusta é migrar para streaming ou usar um plano pago da Vercel com timeouts maiores.
    return res.status(500).json({ 
      error: 'Falha ao se comunicar com a IA ou processar a resposta.' 
    });
  }
}

// Exporta a função com o wrapper do CORS
export default allowCors(handler);
