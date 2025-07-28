import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { image } = request.body;

  if (!image) {
    return response.status(400).json({ error: 'A imagem é obrigatória.' });
  }
  
  // --- PROMPT MODIFICADO ---
  // Agora pedimos explicitamente por um objeto JSON com duas chaves: "descricao" e "url".
  const prompt = `
    Analise a imagem deste carro.
    Identifique a marca, modelo e ano aproximado.
    Forneça características principais e um fato interessante.
    Se não for um carro, informe isso.
    Formate sua resposta final estritamente como um objeto JSON com duas chaves:
    1. "descricao": uma string contendo todo o texto sobre o carro em português do Brasil.
    2. "url": uma string contendo um URL válido para o site oficial da fabricante do carro ou uma página confiável sobre o modelo. Se não encontrar um URL, o valor deve ser null.
    Não inclua nada na sua resposta além deste objeto JSON.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      // A OpenAI agora suporta um modo de resposta JSON que garante o formato.
      response_format: { type: "json_object" }, 
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { "url": image } },
          ],
        },
      ],
      max_tokens: 800,
    });

    const aiResultString = completion.choices[0].message.content;

    // --- PARSE DA RESPOSTA JSON DA IA ---
    // Como pedimos um JSON, agora precisamos interpretá-lo.
    const parsedResult = JSON.parse(aiResultString);

    // Retornamos um objeto JSON para o frontend com a descrição e o URL
    return response.status(200).json({
      resultado: parsedResult.descricao,
      url: parsedResult.url
    });

  } catch (error) {
    console.error('Erro na chamada da API da OpenAI ou no parse do JSON:', error);
    return response.status(500).json({ error: 'Falha ao se comunicar com a IA ou processar a resposta.' });
  }
}
