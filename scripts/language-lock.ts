import {ast,nodesOf,one,literal,edits,maybeName} from './source.ts';
import type {AnyNode} from 'acorn';

type Edit = {start:number;end:number;text:string};

function isMmTop(node:AnyNode) {
  if(node.type!=='CallExpression'||node.arguments.length<2)return false;
  if(literal(node.arguments[0])!=='div'||node.arguments[1]?.type!=='ObjectExpression')return false;
  return node.arguments[1].properties.some(property=>property.type==='Property'
    &&maybeName(property.key)==='class'&&literal(property.value)==='mm-top');
}

// The language button is the first argument of every mm-top bar (main menu,
// auth page and maintenance page). Drop it with its trailing comma.
export function patchRemoveLanguagePicker(source:string) {
  const tree=ast(source);
  const bars=nodesOf(tree,'CallExpression',isMmTop);
  if(bars.length!==3)throw new Error(`Unsupported upstream: mm-top bars: expected 3, got ${bars.length}`);
  const changes:Edit[]=[];
  for(const bar of bars) {
    const args=bar.arguments;
    const indexes=args.flatMap((argument,index)=>argument.type==='CallExpression'
      &&maybeName(argument.callee)==='d$'&&argument.arguments.length===0?[index]:[]);
    if(indexes.length!==1)throw new Error('Unsupported upstream: language picker argument');
    const index=indexes[0]!;
    const next=args[index+1];
    const previous=args[index-1];
    if(next)changes.push({start:args[index]!.start,end:next.start,text:''});
    else if(previous)changes.push({start:previous.end,end:args[index]!.end,text:''});
    else throw new Error('Unsupported upstream: language picker is the only mm-top argument');
  }
  return edits(source,changes);
}

// Remove the language row from in-game settings so switching stays unavailable.
export function patchRemoveLanguageSettings(source:string) {
  const tree=ast(source);
  const call=one(nodesOf(tree,'CallExpression',node=>{
    if(node.callee.type!=='MemberExpression'||maybeName(node.callee.property)!=='push')return false;
    const argument=node.arguments[0];
    if(argument?.type!=='ObjectExpression')return false;
    const properties=argument.properties.filter(property=>property.type==='Property');
    return properties.some(property=>maybeName(property.key)==='id'&&literal(property.value)==='lang')
      &&properties.some(property=>maybeName(property.key)==='rows');
  }),'language settings row');
  return edits(source,[{start:call.start,end:call.end,text:'void 0'}]);
}
