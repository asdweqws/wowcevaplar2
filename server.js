const express = require('express');
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
        // Dynamic import for ES Module package
        const { gotScraping } = await import('got-scraping');

        const targetUrl = `https://wordsofwonders.net/tr/?letters=${encodeURIComponent(bolum)}`;

        // Gerçek bir Chrome tarayıcısının TLS parmak izini taklit eder
        const response = await gotScraping({
            url: targetUrl,
            headerGeneratorOptions: {
                browsers: [{ name: 'chrome', minVersion: 110 }],
                devices: ['desktop'],
                locales: ['tr-TR', 'tr'],
                operatingSystems: ['windows']
            },
            timeout: { request: 10000 }
        });

        const $ = cheerio.load(response.body);

        // Kelimeleri Çek
        const words = [];
        const wordHtml = $('.words').html();
        if (wordHtml) {
            const lines = wordHtml.split(/<br\s*\/?>/i);
            lines.forEach(line => {
                const cleanWord = cheerio.load(line).text().trim();
                if (cleanWord) words.push(cleanWord);
            });
        }

        // Bulmaca Izgarasını Çek
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
            return res.status(404).json({ error: 'Bu bölüme ait sonuç bulunamadı.' });
        }

        res.json({ words, crossword });

    } catch (error) {
        console.error('Scraping hatası:', error.message);
        res.status(500).json({ error: 'Veri çekilemedi, Cloudflare engeline takıldı.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda aktif.`);
});
