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
        // Cloudflare IP engelini aşmak için allorigins proxy servisi üzerinden çekiyoruz
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        
        const response = await axios.get(proxyUrl, {
            timeout: 10000
        });

        if (!response.data || !response.data.contents) {
            throw new Error('Veri alınamadı.');
        }

        const $ = cheerio.load(response.data.contents);

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

        if (words.length === 0 && crossword.length === 0) {
            return res.status(404).json({ error: 'Bu bölüme/harflere ait sonuç bulunamadı.' });
        }

        res.json({ words, crossword });

    } catch (error) {
        res.status(500).json({ error: 'Siteden veri çekilemedi veya erişim engellendi.' });
    }
});

// Arayüz
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda aktif.`);
});
