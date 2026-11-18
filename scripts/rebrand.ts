import {ast,nodesOf,one,literal,edits,maybeName,requireNode} from './source.ts';
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

const logoutLabel='¿Salir de tu cuenta?';

export function patchRemoveLogout(source:string) {
  const tree=ast(source);
  const hasLabel=(node:AnyNode)=>[...nodesOf(node,'Literal'),...nodesOf(node,'TemplateLiteral')].some(l=>literal(l)===logoutLabel);
  const button=one(nodesOf(tree,'CallExpression',node=>
    node.arguments.length>=2&&literal(node.arguments[0])==='button'&&hasLabel(node)
  ),'logout button');
  const parent=one(nodesOf(tree,'CallExpression',node=>node.arguments.includes(button)),'logout button parent');
  const args=parent.arguments;
  const index=args.indexOf(button);
  const previous=args[index-1];
  const next=args[index+1];
  if(!previous&&!next)throw new Error('Unsupported upstream: logout button is the only argument');
  const start=next?button.start:previous!.end;
  const end=next?next.start:button.end;
  return edits(source,[{start,end,text:''}]);
}

const socialButtons=['mini discord','mini x'];

export function patchRemoveSocialButtons(source:string) {
  const tree=ast(source);
  const bar=one(nodesOf(tree,'CallExpression',node=>{
    const args=node.arguments;
    if(args.length<2||literal(args[0])!=='div'||args[1]?.type!=='ObjectExpression')return false;
    return args[1].properties.some(p=>p.type==='Property'&&maybeName(p.key)==='class'&&literal(p.value)==='mm-small');
  }),'mm-small button bar');
  const buttons=socialButtons.map(label=>one(nodesOf(bar,'CallExpression',node=>
    literal(node.arguments[0])===label
  ),`${label} button`));
  const removals: {start:number;end:number;text:string}[]=[];
  // The two buttons are the trailing arguments; drop from the previous argument's end.
  const args=bar.arguments;
  const firstIndex=args.indexOf(buttons[0]!);
  const lastButton=buttons[buttons.length-1]!;
  if(firstIndex<1||args.indexOf(lastButton)!==args.length-1||args.indexOf(lastButton)!==firstIndex+buttons.length-1)
    throw new Error('Unsupported upstream: social buttons are not trailing arguments');
  removals.push({start:args[firstIndex-1]!.end,end:lastButton.end,text:''});
  // Remove the X button's title assignment (first item of a comma sequence).
  const titleCall=one(nodesOf(tree,'CallExpression',node=>
    node.arguments.some(a=>literal(a)==='@ImCharcher · X')
  ),'X button title assignment');
  const sequence=one(nodesOf(tree,'SequenceExpression',node=>node.expressions.includes(titleCall)),'title sequence');
  const titleIndex=sequence.expressions.indexOf(titleCall);
  if(titleIndex!==0||!sequence.expressions[1])throw new Error('Unsupported upstream: X title is not the leading expression');
  removals.push({start:titleCall.start,end:sequence.expressions[1]!.start,text:''});
  return edits(source,removals);
}

export function patchEntryBranding(source:string) { return replaceBrand(source,'entry module'); }
export function patchHtmlBranding(source:string) { return replaceBrand(source,'HTML'); }
