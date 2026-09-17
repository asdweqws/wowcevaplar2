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
    const letters = req.query.bolum ? req.query.bolum.trim() : '';
    if (!letters) {
        return res.status(400).json({ error: 'Lütfen harf veya kelime girin.' });
    }

    try {
        // Sitenin gerçek arama URL yapısı: ?letters=HARFLER
        const targetUrl = `https://gameanswers.net/tr/words-of-wonders/?letters=${encodeURIComponent(letters)}`;

        const response = await gotScraping({
            url: targetUrl,
            method: 'GET',
            headerGeneratorOptions: {
                browsers: [{ name: 'chrome', minVersion: 110 }],
                devices: ['desktop'],
                locales: ['tr-TR', 'tr'],
                operatingSystems: ['windows']
            }
        });

        const $ = cheerio.load(response.body);

        // 1. Kelimeleri Çek (.words span.letter)
        const words = [];
        $('.words').each((_, wordsContainer) => {
            const wordLines = $(wordsContainer).html().split(/<br\s*\/?>/i);
            wordLines.forEach(line => {
                const cleanWord = cheerio.load(line).text().replace(/\s+/g, '').trim();
                if (cleanWord) words.push(cleanWord.toUpperCase());
            });
        });

        // 2. Bulmaca Izgarasını Çek (.crossword .crossword-row)
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
            return res.status(404).json({ error: 'Bu harflere ait bir sonuç bulunamadı.' });
        }

        res.json({ words, crossword });

    } catch (error) {
        console.error('Arama hatası:', error.message);
        res.status(500).json({ error: 'Arama yapılırken bir sunucu hatası oluştu.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda aktif.`);
});
