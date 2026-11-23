import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildCharacterNameMap,characterNamesRemain,patchCharacterNames} from '../scripts/character-names.ts';

const species=[
  {id:1,key:'bulbasaur',name:'Bulbasaur',color:'green',types:['grass','poison']},
  {id:4,key:'charmander',name:'Charmander',color:'red',types:['fire']},
  {id:6,key:'charizard',name:'Charizard',color:'red',types:['fire','flying']},
  {id:151,key:'mew',name:'Mew',color:'pink',types:['psychic']}
];
const locales=[
  {'1':'妙蛙种子','4':'小火龙','6':'喷火龙','151':'梦幻'},
  {'1':'Bulbasaur','4':'Charmander','6':'Charizard','151':'Mew'},
  {'6':'뮤츠','151':'뮤'}
];
const names=buildCharacterNameMap(species,locales);

test('requested and conflicting names are replaced with new original names',()=>{
  assert.equal(names.get('妙蛙种子'),'绿蛙');
  assert.equal(names.get('小火龙'),'焰尾蜥');
  assert.equal(names.get('喷火龙'),'焰翼龙');
  assert.equal(names.get('Bulbasaur'),'绿蛙');
  assert.equal(names.get('Mew'),'星幻兽');
  assert.equal(new Set(names.values()).size>=species.length,true);
});

test('Latin names use word boundaries so counters and identifiers stay intact',()=>{
  const source='Tesoros de Bulbasaur y Charizard; counter:`charizardDown`, name:`Charizard`; ¡Frío Absoluto!; Mews Haut';
  const patched=patchCharacterNames(source,names);
  assert.match(patched,/Tesoros de 绿蛙 y 焰翼龙/);
  assert.match(patched,/counter:`charizardDown`/);
  assert.match(patched,/name:`焰翼龙`/);
  assert.match(patched,/¡Frío Absoluto!/);
  assert.match(patched,/星幻兽 Haut/);
  assert.equal(characterNamesRemain(patched,names),false);
});

test('CJK names are renamed while known Hangul lookalike words stay intact',()=>{
  const source='일일 뮤테이션마다 && 뮤는 계정마다 && 뮤츠가 &&小火龙的尾巴&& 喷火龙和绿蛙';
  const patched=patchCharacterNames(source,names);
  assert.match(patched,/일일 뮤테이션마다/);
  assert.match(patched,/星幻兽는 계정마다/);
  assert.match(patched,/焰翼龙가/);
  assert.match(patched,/焰尾蜥的尾巴/);
  assert.match(patched,/焰翼龙和绿蛙/);
});

test('an empty catalog fails closed',()=>{
  assert.throws(()=>buildCharacterNameMap([],locales),/character catalog/);
});
