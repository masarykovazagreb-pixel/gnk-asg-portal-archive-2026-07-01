import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditImageHosts } from './image-host-audit-v1.mjs';

test('nepoznate hostove grupira po skupu i izvoru, bez otvaranja proxyja', () => {
  const result = auditImageHosts([{name:'a.json',data:{items:[
    {image:'https://known.example/a.jpg'},
    {image:'https://new.example/a.jpg',sourceName:'Medij A'},
    {image:'https://new.example/b.jpg',source:'drugi'},
    {image:'https://other.example/c.jpg',source:'treći'},
    {url:'https://ignored.example/story'},
  ]}},{name:'b.json',data:[{image:'https://new.example/c.jpg',sourceName:'Medij A'}]}], ['known.example']);
  assert.equal(result.images, 5);
  assert.deepEqual(result.missing[0], {host:'new.example',count:3,datasets:['a.json','b.json'],sources:['Medij A','drugi']});
  assert.equal(result.missing[1].host, 'other.example');
  assert.match(result.note, /nije dozvola/);
});
test('neispravne i nesigurne adrese prijavljuje, a ne prešućuje', () => {
  const result = auditImageHosts([{name:'x',data:[{image:'not url'},{image:'http://known.example/a.jpg'},{image:'https://x@known.example/a.jpg'},{image:'https://known.example:444/a.jpg'}]}], ['known.example']);
  assert.equal(result.invalid, 4);
  assert.equal(result.missing.length, 0);
  assert.throws(() => auditImageHosts([{name:'x',data:{}}], []));
});
