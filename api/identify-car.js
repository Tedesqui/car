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
  // A instrução para fornecer um URL foi removida.
  const prompt = `
    Analise a imagem deste carro.
    Identifique a marca, modelo e ano aproximado.
    Forneça características principais e um fato interessante.
    Se não for um carro, informe isso na descrição.
    Formate sua resposta final estritamente como um objeto JSON com duas chaves:
    1. "descricao": uma string contendo todo o texto sobre o carro em português do Brasil.
    2. "modelo": uma string curta contendo apenas a "Marca Modelo" do carro (ex: "Honda Civic", "Toyota Corolla", "Fiat Strada"). Se não for um carro, o valor deve ser null.
    Não inclua nada na sua resposta além deste objeto JSON.
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
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
    const parsedResult = JSON.parse(aiResultString);

    // --- RESPOSTA ATUALIZADA ---
    // A chave "url" foi removida da resposta enviada ao frontend.
    return response.status(200).json({
      resultado: parsedResult.descricao,
      modelo: parsedResult.modelo
    });

  } catch (error) {
    console.error('Erro na chamada da API da OpenAI ou no parse do JSON:', error);
    return response.status(500).json({ error: 'Falha ao se comunicar com a IA ou processar a resposta.' });
  }
}
