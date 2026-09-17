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
    const query = req.query.bolum ? req.query.bolum.trim() : '';
    if (!query) {
        return res.status(400).json({ error: 'Lütfen kutuya bir şey yazın.' });
    }

    try {
        // Sitedeki arama kutusunun (input name="letters") gönderdiği sorgu adresi
        const targetUrl = `https://gameanswers.net/tr/words-of-wonders/?letters=${encodeURIComponent(query)}`;

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

        // 1. Kelimeleri Çek (.words içindeki kelimeler)
        const words = [];
        $('.words span.letter').each((_, el) => {
            // Harf harf basılmışsa birleştir
        });

        $('.words').each((_, container) => {
            const html = $(container).html();
            if (html) {
                const lines = html.split(/<br\s*\/?>/i);
                lines.forEach(line => {
                    const cleanWord = cheerio.load(line).text().replace(/\s+/g, '').trim();
                    if (cleanWord) words.push(cleanWord.toUpperCase());
                });
            }
        });

        // 2. Izgarayı (Crossword) Çek
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

        // Eğer sonuç gelmediyse alternatif div yapılarına bak
        if (words.length === 0 && crossword.length === 0) {
            $('.entry-content li, .solution-words li').each((_, el) => {
                const txt = $(el).text().trim();
                if (txt) words.push(txt.toUpperCase());
            });
        }

        if (words.length === 0 && crossword.length === 0) {
            return res.status(404).json({ error: 'Arama kutusundan sonuç dönmedi.' });
        }

        res.json({ words, crossword });

    } catch (error) {
        console.error('Hata:', error.message);
        res.status(500).json({ error: 'Siteden veri çekilemedi.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda aktif.`);
});
