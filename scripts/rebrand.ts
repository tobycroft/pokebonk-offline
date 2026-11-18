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

// Trailing buttons of the main menu's small button bar to remove.
const removedMenuButtons=['mini round bug','mini discord','mini x'];

export function patchRemoveMenuButtons(source:string) {
  const tree=ast(source);
  const bar=one(nodesOf(tree,'CallExpression',node=>{
    const args=node.arguments;
    if(args.length<2||literal(args[0])!=='div'||args[1]?.type!=='ObjectExpression')return false;
    return args[1].properties.some(p=>p.type==='Property'&&maybeName(p.key)==='class'&&literal(p.value)==='mm-small');
  }),'mm-small button bar');
  const buttons=removedMenuButtons.map(label=>one(nodesOf(bar,'CallExpression',node=>
    literal(node.arguments[0])===label
  ),`${label} button`));
  const removals: {start:number;end:number;text:string}[]=[];
  // Removed buttons are trailing arguments; drop from the previous argument's end.
  const args=bar.arguments;
  const firstIndex=args.indexOf(buttons[0]!);
  const lastButton=buttons[buttons.length-1]!;
  if(firstIndex<1||args.indexOf(lastButton)!==args.length-1||args.indexOf(lastButton)!==firstIndex+buttons.length-1)
    throw new Error('Unsupported upstream: menu buttons are not trailing arguments');
  removals.push({start:args[firstIndex-1]!.end,end:lastButton.end,text:''});
  // Title sequence is [X title, guide title, report title, report aria-label].
  // Keep only the guide title; drop items 0 and 2..3.
  const titleCall=one(nodesOf(tree,'CallExpression',node=>
    node.arguments.some(a=>literal(a)==='@ImCharcher · X')
  ),'X button title assignment');
  const sequence=one(nodesOf(tree,'SequenceExpression',node=>node.expressions.includes(titleCall)),'title sequence');
  const expressions=sequence.expressions;
  if(expressions.length!==4||expressions[0]!==titleCall
    ||!source.slice(expressions[1]!.start,expressions[1]!.end).includes('children[1]')
    ||!source.slice(expressions[2]!.start,expressions[2]!.end).includes('children[2]')
    ||!source.slice(expressions[3]!.start,expressions[3]!.end).includes('children[2]'))
    throw new Error('Unsupported upstream: unexpected menu title sequence');
  removals.push({start:expressions[0]!.start,end:expressions[1]!.start,text:''});
  removals.push({start:expressions[1]!.end,end:expressions[3]!.end,text:''});
  return edits(source,removals);
}

// Top-bar buttons to remove: shop (Bee) and official-apps (cZ, guarded by rZ).
export function patchRemoveTopButtons(source:string) {
  const tree=ast(source);
  const bars=nodesOf(tree,'CallExpression',node=>{
    const args=node.arguments;
    if(args.length<2||literal(args[0])!=='div'||args[1]?.type!=='ObjectExpression')return false;
    return args[1].properties.some(p=>p.type==='Property'&&maybeName(p.key)==='class'&&literal(p.value)==='mm-top');
  });
  const bar=one(bars.filter(node=>nodesOf(node,'CallExpression',n=>maybeName(n.callee)==='Bee').length>0)
    ,'mm-top bar with shop button');
  const args=bar.arguments;
  const shopIndex=args.findIndex(a=>a.type==='CallExpression'&&maybeName(a.callee)==='Bee');
  const appsArg=args[shopIndex+1];
  const apps=appsArg?.type==='ConditionalExpression'?appsArg.consequent:null;
  if(shopIndex<1||!apps||apps.type!=='CallExpression'||maybeName(apps.callee)!=='cZ')
    throw new Error('Unsupported upstream: shop/apps buttons are not adjacent in mm-top');
  // Remove from the previous argument's end through the apps argument's end (drops both buttons and their commas).
  return edits(source,[{start:args[shopIndex-1]!.end,end:appsArg!.end,text:''}]);
}

export function patchEntryBranding(source:string) { return replaceBrand(source,'entry module'); }
export function patchHtmlBranding(source:string) { return replaceBrand(source,'HTML'); }
