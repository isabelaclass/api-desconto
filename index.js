require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const { createClient } = require('redis');

const redisClient = createClient();
redisClient.connect();

redisClient.on('error', err => console.log('Redis error:', err));

function aplicarDesconto(produtos) {
    const hoje = new Date();
  
    return produtos.map(produto => {
      let precoDesconto = produto.valor;
  
      const dataEntrada = new Date(produto.data_produto);
      const diasEstoque = Math.floor((hoje - dataEntrada) / (1000 * 60 * 60 * 24));
  
      let percentualDesconto = 0;
  
      if (produto.quantidade > 100) {
        percentualDesconto += 20;
      }
  
      if (diasEstoque > 30) {
        percentualDesconto += 10;
      }
  
      if (percentualDesconto > 0) {
        precoDesconto = produto.valor * (1 - percentualDesconto / 100);
      }
  
      return {
        ...produto,
        precoDesconto: precoDesconto.toFixed(2),
        descontoAplicado: percentualDesconto + '%'
      };
    });
  }
  
app.get('/produtos-desconto', async (req, res) => {
  try {
    const cacheKey = 'itens_desconto';

    const cached = await redisClient.get(cacheKey);

    if(cached) {
        const cachedData = JSON.parse(cached);
        return res.json({
            from_cache: true,
            produtos: cachedData
          });
    }

    const response = await axios.get(process.env.API_URL_PRODUTOS);

    const comDesconto = aplicarDesconto(response.data.produtos);

    await redisClient.setEx(cacheKey, 10, JSON.stringify(comDesconto));
    res.json({
        from_cache: false,
        produtos: comDesconto
    });
  } catch (error) {
    console.error('Erro ao buscar produtos:', error.message);
    res.status(500).json({ erro: 'Erro ao buscar produtos' });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`API de descontos rodando em http://localhost:${process.env.PORT}`);
});
