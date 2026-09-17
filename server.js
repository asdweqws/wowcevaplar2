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
    const rawInput = req.query.bolum ? req.query.bolum.trim() : '';
    if (!rawInput) {
        return res.status(400).json({ error: 'Lütfen bir bölüm numarası veya harf grubu girin.' });
    }

    try {
        // Türkçe karakter ve temizlik işlemleri
        let cleanInput = rawInput
            .replace(/İ/g, 'i')
            .replace(/I/g, 'ı')
            .toLowerCase()
            .replace(/[^a-z0-9ışğüçö\s-]/g, '');

        let targetUrl = '';

        // Eğer girdi sadece rakam ise (örn: 321)
        if (/^\d+$/.test(cleanInput)) {
            targetUrl = `https://gameanswers.net/tr/words-of-wonders/seviye-${cleanInput}/`;
        } 
        // Eğer girdi harf kümesi ise
        else {
            targetUrl = `https://gameanswers.net/tr/words-of-wonders/${encodeURIComponent(cleanInput)}/`;
        }

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
        const words = [];

        // 1. Alternatif: .words span.letter yapısından kelime toplama
        $('.words').each((_, container) => {
            const html = $(container).html();
            if (html) {
                const lines = html.split(/<br\s*\/?>/i);
                lines.forEach(line => {
                    const word = cheerio.load(line).text().replace(/\s+/g, '').trim();
                    if (word) words.push(word.toUpperCase());
                });
            }
        });

        // 2. Alternatif: Liste/Div içi arama (eğer .words boş geldiyse)
        if (words.length === 0) {
            $('.entry-content ul li, .solution-words li, .groupRow li').each((_, el) => {
                const text = $(el).text().trim();
                if (text && text.length > 1) {
                    words.push(text.toUpperCase());
                }
            });
        }

        // 3. Bulmaca Izgarasını (Crossword) Çek
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
            return res.status(404).json({ error: 'Bu girdiye ait cevap bulunamadı. Lütfen harfleri kontrol edin.' });
        }

        res.json({ words, crossword });

    } catch (error) {
        console.error('Veri Çekme Hatası:', error.message);
        res.status(500).json({ error: 'Sayfa bulunamadı veya veri çekilirken hata oluştu.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda aktif.`);
});
