import express from 'express';
import * as cheerio from 'cheerio';
import path from 'path';
import { fileURLToPath } from 'url';
import { gotScraping } from 'got-scraping';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/solve', async (req, res) => {
    const bolum = req.query.bolum;
    if (!bolum) {
        return res.status(400).json({ error: 'Bölüm veya harf girin.' });
    }

    try {
        const targetUrl = `https://wordsofwonders.net/tr/?letters=${encodeURIComponent(bolum)}`;

        // Cloudflare tarayıcı kontrolünü geçen istek
        const response = await gotScraping({
            url: targetUrl,
            headerGeneratorOptions: {
                browsers: [{ name: 'chrome', minVersion: 110 }],
                devices: ['desktop'],
                locales: ['tr-TR', 'tr'],
                operatingSystems: ['windows']
            }
        });

        const $ = cheerio.load(response.body);

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

        // 2. Izgarayı Çek
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
            return res.status(404).json({ error: 'Sonuç bulunamadı.' });
        }

        res.json({ words, crossword });

    } catch (error) {
        res.status(500).json({ error: 'Veri çekilemedi.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda aktif.`);
});
