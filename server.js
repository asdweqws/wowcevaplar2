const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/solve', async (req, res) => {
    const bolum = req.query.bolum;
    if (!bolum) {
        return res.status(400).json({ error: 'Lütfen bir bölüm numarası veya harf girin.' });
    }

    try {
        // Doğrudan hedef adrese sunucu taraflı istek atıyoruz
        const targetUrl = `https://wordsofwonders.net/tr/?letters=${encodeURIComponent(bolum)}`;
        
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache'
            },
            timeout: 8000
        });

        const $ = cheerio.load(response.data);

        // Kelimeleri Ayrıştır
        const words = [];
        const wordHtml = $('.words').html();
        if (wordHtml) {
            const lines = wordHtml.split(/<br\s*\/?>/i);
            lines.forEach(line => {
                const cleanWord = cheerio.load(line).text().trim();
                if (cleanWord) words.push(cleanWord);
            });
        }

        // Bulmaca Izgarasını Ayrıştır
        const crossword = [];
        $('.crossword .crossword-row').each((_, row) => {
            const rowCells = [];
            $(row).find('.letter').each((_, letter) => {
                const isHidden = $(letter).hasClass('hidden');
                const val = $(letter).text().trim();

                if (isHidden || val === 'x' || val === '') {
                    rowCells.push('');
                } else {
                    rowCells.push(val.toUpperCase());
                }
            });
            if (rowCells.length > 0) crossword.push(rowCells);
        });

        if (words.length === 0 && crossword.length === 0) {
            return res.status(404).json({ error: 'Aradığınız bölüme veya harflere ait sonuç bulunamadı.' });
        }

        res.json({ words, crossword });

    } catch (error) {
        // Eğer site IP'ye doğrudan blok atarsa kullanıcıya anlaşılır mesaj dön
        res.status(502).json({ error: 'Veri kaynağına erişilemedi. Lütfen biraz sonra tekrar deneyin.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda aktif.`);
});
