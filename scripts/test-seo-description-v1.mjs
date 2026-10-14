import assert from 'node:assert/strict';
import { limitSeoDescription } from './lib/seo-description-v1.mjs';

assert.equal(limitSeoDescription('Kratak i jasan opis.'), 'Kratak i jasan opis.');

const completeSentence = `${'Prva rečenica sadrži dovoljno konteksta za čitatelja. '.repeat(3)}Druga rečenica nastavlja opis s korisnim detaljem. Dodatni tekst koji se može skratiti bez dodavanja ključnih riječi.`;
const sentenceResult = limitSeoDescription(completeSentence, 150);
assert.ok(sentenceResult.length <= 150);
assert.match(sentenceResult, /\.$/u, 'prefer a complete sentence when one fits');

const longDescription = 'Opis s apostrofom poput „tvrtkin model“ i relevantnim kontekstom bez završetka rečenice '.repeat(8);
const bounded = limitSeoDescription(longDescription);
assert.ok(bounded.length <= 200);
assert.ok(bounded.length >= 80);
assert.match(bounded, /…$/u, 'mark a mid-description truncation');
assert.ok(bounded.includes('„tvrtkin model“'));

assert.equal(limitSeoDescription('  opis   s   razmacima  '), 'opis s razmacima');
assert.throws(() => limitSeoDescription('opis', 1), /maxLength/u);

console.log(JSON.stringify({ ok: true, maxLength: 200, preservesCompleteSentence: true, keywordFiller: false }, null, 2));
