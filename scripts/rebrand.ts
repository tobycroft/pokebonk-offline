import {ast,nodesOf,literal,edits,maybeName,requireNode} from './source.ts';
import type {AnyNode} from 'acorn';

export const brandName='宝可出击';

const logoParts: Record<string,string>={'Poké':'宝可','Bonk':'出击','.com':'','PokéBonk':brandName};
const emptyFooter=`Z(\`div\`,{class:\`mm-legal\`})`;

function namedFunction(tree:ReturnType<typeof ast>,name:string) {
  const declarations=nodesOf(tree,'FunctionDeclaration',node=>maybeName(node.id)===name);
  const variables=nodesOf(tree,'VariableDeclarator',node=>maybeName(node.id)===name&&(node.init?.type==='ArrowFunctionExpression'||node.init?.type==='FunctionExpression'));
  const matches:AnyNode[]=[...declarations,...variables];
  if(matches.length!==1)throw new Error(`Unsupported upstream: ${name} function: expected one match, got ${matches.length}`);
  return matches[0]!;
}

function footerBody(node:AnyNode): {body:AnyNode;text:string} {
  if(node.type==='FunctionDeclaration') {
    const body=requireNode(node.body,'BlockStatement');
    return {body,text:`{return ${emptyFooter};}`};
  }
  if(node.type==='VariableDeclarator'&&node.init?.type==='ArrowFunctionExpression') {
    return {body:node.init.body,text:emptyFooter};
  }
  throw new Error('Unsupported upstream: footer function shape');
}

export function patchMenuBranding(source:string) {
  const tree=ast(source);
  const logo=namedFunction(tree,'j5');
  const footer=namedFunction(tree,'J5');
  const tokens=[...nodesOf(logo,'Literal'),...nodesOf(logo,'TemplateLiteral')]
    .filter(node=>typeof literal(node)==='string'&&Object.hasOwn(logoParts,literal(node) as string));
  const counts: Record<string,number>={};
  for(const token of tokens) {
    const value=literal(token) as string;
    counts[value]=(counts[value]??0)+1;
  }
  for(const [value,expected] of Object.entries({'Poké':1,'Bonk':2,'.com':1,'PokéBonk':1}))
    if(counts[value]!==expected)throw new Error(`Unsupported upstream: logo ${value} count ${counts[value]??0}`);
  const changes=tokens.map(token=>{
    const value=literal(token) as string;
    return {start:token.start,end:token.end,text:JSON.stringify(logoParts[value]??value)};
  });
  const {body,text}=footerBody(footer);
  changes.push({start:body.start,end:body.end,text});
  return edits(source,changes);
}

function replaceBrand(source:string,label:string) {
  const count=(source.match(/PokéBonk/g)??[]).length;
  if(!count)throw new Error(`Unsupported upstream: no brand in ${label}`);
  return source.replaceAll('PokéBonk',brandName);
}

export function patchEntryBranding(source:string) { return replaceBrand(source,'entry module'); }
export function patchHtmlBranding(source:string) { return replaceBrand(source,'HTML'); }
