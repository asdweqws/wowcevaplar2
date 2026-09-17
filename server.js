const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/solve', async (req, res) => {
    const bolum = req.query.bolum;
    if (!bolum) {
        return res.status(400).json({ error: 'Bölüm/Harf parametresi eksik.' });
    }

    try {
        const targetUrl = `https://wordsofwonders.net/tr/?letters=${encodeURIComponent(bolum)}`;
        
        // Gerçek tarayıcı taklidi
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);

        // 1. Kelimeleri Çek
        const words = [];
        const wordHtml = $('.words').html();
        if (wordHtml) {
            const lines = wordHtml.split(/<br\s*\/?>/i);
            lines.forEach(line => {
                const cleanWord = cheerio.load(line).text().trim();
                if (cleanWord) words.push(cleanWord);
            });
        }

        // 2. Bulmaca Izgarasını Çek
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

        res.json({ words, crossword });

    } catch (error) {
        res.status(500).json({ error: 'Siteden veri çekilemedi.' });
    }
});

// Arayüz
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda aktif.`);
});
