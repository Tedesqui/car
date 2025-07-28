require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Importado
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI();

// --- ATUALIZAÇÃO DE CORS ---
// Lista de domínios permitidos
const whitelist = [
    'https://SEU_USUARIO.github.io', // Substitua pelo seu URL do GitHub Pages
    'http://localhost:5500', // Permite testes locais
    'http://127.0.0.1:5500'  // Permite testes locais
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Acesso não permitido por CORS'));
        }
    }
};

app.use(cors(corsOptions)); // Usa as opções de CORS configuradas
// --- FIM DA ATUALIZAÇÃO ---

app.use(express.json({ limit: '10mb' }));

app.post('/api/identify-car', async (req, res) => {
    // ... (o restante do seu código da OpenAI permanece o mesmo) ...
    console.log('Recebida requisição em /api/identify-car para OpenAI...');
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: 'Nenhuma imagem fornecida.' });

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Você é um especialista em identificar modelos de carros. Retorne apenas o nome completo do modelo e da marca do carro principal em foco." },
                {
                    role: "user", content: [
                        { type: "text", text: "Qual o modelo e marca deste carro?" },
                        { type: "image_url", image_url: { "url": image } },
                    ]
                },
            ],
            max_tokens: 50,
        });

        const identifiedModel = response.choices[0].message.content;
        res.status(200).json({ model: identifiedModel.trim() });
    } catch (error) {
        console.error('ERRO (OpenAI):', error);
        res.status(500).json({ error: 'Erro interno no servidor ao contatar a OpenAI.' });
    }
});

app.listen(port, () => console.log(`🚀 Backend (OpenAI) rodando na porta ${port}`));