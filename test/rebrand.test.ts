import {test} from 'node:test';
import assert from 'node:assert/strict';
import {brandName,patchMenuBranding,patchEntryBranding,patchHtmlBranding} from '../scripts/rebrand.ts';

const menus=`
function j5(e=\`normal\`){let t=e===\`hero\`;return Z(\`div\`,{class:\`logo\`},Z(\`div\`,{class:\`logo-word\`},\`Poké\`,Z(\`span\`,{class:\`logo-bonk\`},...t?[...\`Bonk\`].map((e,t)=>e):[\`Bonk\`]),Z(\`small\`,{class:\`logo-com\`},\`.com\`),t?Z(\`b\`,{class:\`logo-glint\`},\`PokéBonk\`):null))}
function J5(e,t=!1){return Z(\`div\`,{class:\`mm-legal\`},Z(\`p\`,{},c(\`PokéBonk es un fan-game\`)))}
`;

test('menu logo becomes the Chinese brand while the footer content is removed',()=>{
  const patched=patchMenuBranding(menus);
  assert.match(patched,/"宝可"/);
  assert.equal((patched.match(/"出击"/g)??[]).length,2);
  assert.match(patched,/"宝可出击"/);
  assert.doesNotMatch(patched,/`Poké`/);
  assert.doesNotMatch(patched,/`Bonk`/);
  assert.doesNotMatch(patched,/`\.com`/);
  assert.doesNotMatch(patched,/fan-game/);
  assert.match(patched,/function J5\(e,t=!1\)\{return Z\(`div`,{class:`mm-legal`}\);\}/);
});

test('unexpected logo structure fails closed',()=>{
  assert.throws(()=>patchMenuBranding(menus.replace('`Bonk`','`Bonk2`')),/logo Bonk count/);
  assert.throws(()=>patchMenuBranding(menus.replace('function J5','function K5')),/J5 function/);
});

test('page titles and HTML branding use the Chinese name',()=>{
  assert.equal(patchEntryBranding('title:`PokéBonk · Survivor 3D`'),'title:`'+brandName+' · Survivor 3D`');
  assert.equal(patchHtmlBranding('<title>PokéBonk · demo</title>'),'<title>'+brandName+' · demo</title>');
  assert.throws(()=>patchHtmlBranding('<title>demo</title>'),/no brand in HTML/);
});
