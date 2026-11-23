import {test} from 'node:test';
import assert from 'node:assert/strict';
import {patchRemoveLanguagePicker,patchRemoveLanguageSettings} from '../scripts/language-lock.ts';

const menus=`
let a=Z(\`div\`,{class:\`mm-top\`},d$(),Wc()?h7():Uc()?g7():null,g5(e));
let b=Z(\`div\`,{class:\`mm-top\`},d$(),ac?_7(ac):null);
let c=Z(\`div\`,{class:\`mm-top\`},d$(),Z(\`b\`,\`x\`));
`;

test('language picker is removed from every top bar',()=>{
  const patched=patchRemoveLanguagePicker(menus);
  assert.equal((patched.match(/d\(\)/g)??[]).length,0);
  assert.match(patched,/Wc\(\)\?h7\(\)/);
  assert.match(patched,/ac\?_7\(ac\):null/);
  assert.match(patched,/Z\(\`b\`,\`x\`\)/);
});

test('unexpected top bar count fails closed',()=>{
  const partial=menus.replace(/let c=.*\n/,'');
  assert.throws(()=>patchRemoveLanguagePicker(partial),/mm-top bars/);
});

const settings=`
e.run||S.push({id:\`lang\`,name:c(\`Idioma\`),rows:()=>[f\$()]}),!e.run&&S.push({id:\`account\`,name:c(\`Cuenta\`),rows:()=>[]});
`;

test('language settings row is removed while other rows stay',()=>{
  const patched=patchRemoveLanguageSettings(settings);
  assert.doesNotMatch(patched,/id:`lang`/);
  assert.match(patched,/id:`account`/);
  assert.match(patched,/e\.run\|\|void 0/);
});

test('missing language settings row fails closed',()=>{
  assert.throws(()=>patchRemoveLanguageSettings(settings.replace('id:`lang`','id:`other`')),/language settings row/);
});
