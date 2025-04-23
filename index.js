require('dotent').config();
const express = require('express');
const axios = require('axios');
const app = express();
const { createClient } = require('redis');

const redisClient = createClient();
redisClient.connect();

redisClient.on('error', err => console.log('Redis error:', err));

function aplicarDesconto(produtos) {
  return produtos.map(produto => {
    let precoDesconto = produto.preco;

    if (produto.quantidade > 100) {
      precoDesconto = produto.preco * 0.8;
    }

    return {
      ...produto,
      precoDesconto: precoDesconto.toFixed(2)
    };
  });
}

app.get('/produtos-desconto', async (req, res) => {
  try {
    const cacheKey = 'itens_desconto';

    const cached = await redisClient.get(cacheKey);

    if(cached) {
        return res.json(JSON.parse(cached));
    }

    const response = await axios.get(process.env.API_URL_PRODUTOS);

    const comDesconto = aplicarDesconto(response.data);

    await redisClient.setEx(cacheKey, 300, JSON.stringify(comDesconto))
    res.json(comDesconto);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos' });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`API de descontos rodando em http://localhost:${process.env.PORT}`);
});
