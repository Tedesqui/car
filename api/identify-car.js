// Importa a biblioteca da OpenAI
import OpenAI from 'openai';

// Inicializa o cliente da OpenAI com a chave de API que será configurada na Vercel
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// A Vercel executa esta função 'handler' para cada requisição recebida
export default async function handler(request, response) {
    // Garante que a requisição seja do tipo POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { image, prompt } = request.body;

    if (!image || !prompt) {
        return response.status(400).json({ error: 'A imagem e o prompt são obrigatórios.' });
    }

    try {
        // Faz a chamada para a API da OpenAI usando o modelo de visão
        const completion = await openai.chat.completions.create({
            model: "gpt-4-vision-preview", // Modelo de visão da OpenAI
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                "url": image, // A API aceita a imagem no formato base64 Data URL
                            },
                        },
                    ],
                },
            ],
            max_tokens: 500, // Limita o tamanho da resposta
        });

        // Extrai o conteúdo da resposta da IA
        const resultado = completion.choices[0].message.content;

        // Retorna o resultado com sucesso (status 200)
        return response.status(200).json({ resultado });

    } catch (error) {
        // Em caso de erro, loga no console da Vercel e retorna um erro 500
        console.error('Erro na chamada da API da OpenAI:', error);
        return response.status(500).json({ error: 'Falha ao se comunicar com a IA.' });
    }
}