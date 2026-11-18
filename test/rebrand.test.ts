import {test} from 'node:test';
import assert from 'node:assert/strict';
import {brandName,patchMenuBranding,patchRemoveLogout,patchRemoveMenuButtons,patchEntryBranding,patchHtmlBranding} from '../scripts/rebrand.ts';

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

const trainer=`
let _e=Z(\`div\`,{class:\`trainer\`},de,o.guest?null:pe,Z(\`button\`,{class:\`btn small blue\`,onclick:()=>C7(e)},c(\`Guardar en cuenta\`)),Z(\`button\`,{class:\`btn small ghost\`,onclick:()=>{Y.click(),s3(c(\`¿Salir de tu cuenta?\`),c(\`Volverás...\`),c(\`Cerrar sesión\`),async()=>{await e.meta.saveNow(),await e.backend.logout(),r7(e)},void 0,\`blue\`)}},c(\`Cerrar sesión\`)));ve=w5(e,\`mm\`);
`;

test('logout button is removed while the rest of the trainer bar stays',()=>{
  const patched=patchRemoveLogout(trainer);
  assert.doesNotMatch(patched,/¿Salir de tu cuenta\?/);
  assert.doesNotMatch(patched,/btn small ghost/);
  assert.doesNotMatch(patched,/backend\.logout\(\)/);
  assert.match(patched,/class:\`trainer\`/);
  assert.match(patched,/class:\`btn small blue\`/);
  assert.match(patched,/vediv|ve=w5/);
});

test('unexpected logout button structure fails closed',()=>{
  assert.throws(()=>patchRemoveLogout(trainer.replace('¿Salir de tu cuenta?','otra')),/logout button/);
});

const socialBar=`
let le=Z(\`div\`,{class:\`mm-small\`},f(\`mini\`,a1),f(\`mini guide\`,a2),f(\`mini round bug\`,a3),f(\`mini discord\`,a4),f(\`mini x\`,a5));le.lastElementChild.setAttribute(\`title\`,\`@ImCharcher · X\`),le.children[1].setAttribute(\`title\`,c(\`Guía\`)),le.children[2].setAttribute(\`title\`,c(\`Reportar\`)),le.children[2].setAttribute(\`aria-label\`,c(\`Reportar\`));
`;

test('bug report, Discord and X buttons are removed while the guide button stays',()=>{
  const patched=patchRemoveMenuButtons(socialBar);
  assert.doesNotMatch(patched,/mini round bug/);
  assert.doesNotMatch(patched,/mini discord/);
  assert.doesNotMatch(patched,/mini x/);
  assert.doesNotMatch(patched,/@ImCharcher · X/);
  assert.doesNotMatch(patched,/lastElementChild/);
  assert.doesNotMatch(patched,/children\[2\]/);
  assert.doesNotMatch(patched,/Reportar/);
  assert.match(patched,/f\(\`mini\`,a1\)/);
  assert.match(patched,/f\(\`mini guide\`,a2\)/);
  assert.match(patched,/le\.children\[1\]\.setAttribute/);
});

test('unexpected menu button structure fails closed',()=>{
  assert.throws(()=>patchRemoveMenuButtons(socialBar.replace('`mini x`','`mini y`')),/mini x button/);
  assert.throws(()=>patchRemoveMenuButtons(socialBar.replace('children[2]','children[7]')),/menu title sequence/);
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
