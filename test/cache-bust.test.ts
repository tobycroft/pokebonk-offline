import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cacheBustVersion,injectCacheBust,injectHtmlCacheBust} from '../scripts/cache-bust.ts';

test('cache-bust version changes with any payload byte and is order independent',()=>{
  const a=new Map([['a.js',Buffer.from('one')],['b.css',Buffer.from('two')]]);
  const reordered=new Map([['b.css',Buffer.from('two')],['a.js',Buffer.from('one')]]);
  const changed=new Map([['a.js',Buffer.from('ONE')],['b.css',Buffer.from('two')]]);
  assert.match(cacheBustVersion(a),/^[0-9a-f]{12}$/);
  assert.equal(cacheBustVersion(reordered),cacheBustVersion(a));
  assert.notEqual(cacheBustVersion(changed),cacheBustVersion(a));
});

test('JS asset references receive the version query',()=>{
  const source='import{a as e}from"./i18n-BGHWfjZr.js";const d=()=>import(`./de-DXviTvMX.js`);__vite__mapDeps(["./700-CDROv48s.css"])';
  const patched=injectCacheBust(source,'abc123def456');
  assert.match(patched,/from"\.\/i18n-BGHWfjZr\.js\?v=abc123def456"/);
  assert.match(patched,/import\(`\.\/de-DXviTvMX\.js\?v=abc123def456`\)/);
  assert.match(patched,/"\.\/700-CDROv48s\.css\?v=abc123def456"/);
  assert.equal(injectCacheBust(patched,'abc123def456'),patched);
});

test('HTML asset URLs receive the version query',()=>{
  const source='<script type="module" crossorigin src="./assets/main-DjMdMc1n.js"></script><link rel="modulepreload" href="./assets/i18n-BGHWfjZr.css">';
  const patched=injectHtmlCacheBust(source,'abc123def456');
  assert.match(patched,/src="\.\/assets\/main-DjMdMc1n\.js\?v=abc123def456"/);
  assert.match(patched,/href="\.\/assets\/i18n-BGHWfjZr\.css\?v=abc123def456"/);
  assert.equal(injectHtmlCacheBust(patched,'abc123def456'),patched);
});

test('cache-bust fails closed on invalid versions',()=>{
  assert.throws(()=>injectCacheBust('import"./a.js"','bad'),/Invalid cache-bust version/);
  assert.throws(()=>injectHtmlCacheBust('<script src="./assets/a.js">','BAD'),/Invalid cache-bust version/);
});
