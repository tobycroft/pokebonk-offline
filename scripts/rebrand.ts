import {ast,nodesOf,one,literal,edits,maybeName,requireNode} from './source.ts';
import type {AnyNode} from 'acorn';

export const brandName='宝可';

const logoParts: Record<string,string>={'Poké':'宝','Bonk':'可','.com':'','PokéBonk':brandName};
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

// The bottom "Ranking / Clasificación" tile that opens the season leaderboard.
export function patchRemoveRankingTile(source:string) {
  const tree=ast(source);
  const tiles=one(nodesOf(tree,'CallExpression',node=>{
    const args=node.arguments;
    if(args.length<2||literal(args[0])!=='div'||args[1]?.type!=='ObjectExpression')return false;
    return args[1].properties.some(p=>p.type==='Property'&&maybeName(p.key)==='class'&&literal(p.value)==='mm-tiles');
  }),'mm-tiles tile bar');
  const ranking=one(nodesOf(tiles,'CallExpression',node=>
    maybeName(node.callee)==='te'
    && nodesOf(node,'CallExpression',inner=>inner.arguments.some(a=>literal(a)==='Ranking')).length>0
  ),'ranking tile');
  const prev=tiles.arguments[tiles.arguments.indexOf(ranking)-1];
  if(!prev||tiles.arguments.indexOf(ranking)<2)
    throw new Error('Unsupported upstream: ranking tile position unexpected');
  return edits(source,[{start:prev.end,end:ranking.end,text:''}]);
}

// Read the first string argument of a call like Q('clan',36) or c('Clan').
const callString=(node:AnyNode|null|undefined,callee:string):string|undefined=>{
  if(node?.type!=='CallExpression'||maybeName(node.callee)!==callee)return undefined;
  const value=literal(node.arguments[0]!);
  return typeof value==='string'?value:undefined;
};

// The "Clan / 战队" tile of the main menu (class clan) is the `ne` argument of mm-tiles.
// Keep the variable definition itself: other menu code (clan status updates) still reads it,
// so only detach it from the tile bar to avoid null dereferences at runtime.
export function patchRemoveClanTile(source:string) {
  const tree=ast(source);
  const clanTile=one(nodesOf(tree,'VariableDeclarator',node=>{
    const init=node.init;
    if(init?.type!=='CallExpression'||maybeName(init.callee)!=='te'||init.arguments.length<2)return false;
    return callString(init.arguments[0],'Q')==='clan'&&callString(init.arguments[1],'c')==='Clan';
  }),'clan tile variable');
  const name=maybeName(clanTile.id);
  if(!name)throw new Error('Unsupported upstream: clan tile has no name');
  const tiles=one(nodesOf(tree,'CallExpression',node=>{
    const args=node.arguments;
    if(args.length<2||literal(args[0])!=='div'||args[1]?.type!=='ObjectExpression')return false;
    return args[1].properties.some(p=>p.type==='Property'&&maybeName(p.key)==='class'&&literal(p.value)==='mm-tiles');
  }),'mm-tiles tile bar');
  const args=tiles.arguments;
  const index=args.findIndex(a=>a.type==='Identifier'&&maybeName(a)===name);
  if(index<1||!args[index+1])throw new Error('Unsupported upstream: clan tile is not a non-last mm-tiles argument');
  // Drop from the previous argument's end through the clan argument's end (removes the comma too).
  return edits(source,[{start:args[index-1]!.end,end:args[index]!.end,text:''}]);
}

// The live-event card ("La Gran Expedición / 大探险") is the `re` argument of mm-today.
// n8() builds a card from the first live event; detach the variable from the container while
// leaving the factory defined so other event-related code keeps working.
export function patchRemoveEventCard(source:string) {
  const tree=ast(source);
  const factories=[
    ...nodesOf(tree,'FunctionDeclaration',node=>maybeName(node.id)==='n8'),
    ...nodesOf(tree,'VariableDeclarator',node=>maybeName(node.id)==='n8'&&(node.init?.type==='ArrowFunctionExpression'||node.init?.type==='FunctionExpression'))
  ];
  if(factories.length!==1)throw new Error(`Unsupported upstream: event card factory: expected one match, got ${factories.length}`);
  const factory=factories[0]!;
  const tokens=[...nodesOf(factory,'Literal'),...nodesOf(factory,'TemplateLiteral')].map(literal);
  if(!tokens.includes('event'))throw new Error('Unsupported upstream: event card factory markers missing');
  const variable=one(nodesOf(tree,'VariableDeclarator',node=>
    maybeName(node.id)==='re'&&node.init?.type==='CallExpression'&&maybeName(node.init.callee)==='n8'
  ),'event card variable');
  const name=maybeName(variable.id);
  if(!name)throw new Error('Unsupported upstream: event card variable has no name');
  const today=one(nodesOf(tree,'CallExpression',node=>{
    const args=node.arguments;
    if(args.length<2||literal(args[0])!=='div'||args[1]?.type!=='ObjectExpression')return false;
    return args[1].properties.some(p=>p.type==='Property'&&maybeName(p.key)==='class'&&literal(p.value)==='mm-today');
  }),'mm-today container');
  const args=today.arguments;
  const index=args.findIndex(a=>a.type==='Identifier'&&maybeName(a)===name);
  if(index<2||!args[index+1])throw new Error('Unsupported upstream: event card is not a non-last mm-today argument');
  return edits(source,[{start:args[index]!.start,end:args[index+1]!.start,text:''}]);
}

// The three account buttons at the top-right of the main-menu trainer bar:
// news (tr-mail tr-news), friends (a4 helper) and mailbox (tr-mail).
// Their variables are still read by badge-update code (T1().then, clanStatus),
// so keep the definitions and only detach them from the trainer container.
export function patchRemoveTrainerMailButtons(source:string) {
  const tree=ast(source);
  const stringsOf=(node:AnyNode)=>[...nodesOf(node,'Literal'),...nodesOf(node,'TemplateLiteral')].map(literal);
  const trMailVar=(cls:string,title:string)=>one(nodesOf(tree,'VariableDeclarator',node=>{
    const init=node.init;
    if(init?.type!=='CallExpression'||maybeName(init.callee)!=='Z')return false;
    const args=init.arguments;
    if(literal(args[0])!=='button'||args[1]?.type!=='ObjectExpression')return false;
    const hasClass=args[1].properties.some(p=>p.type==='Property'&&maybeName(p.key)==='class'&&literal(p.value)===cls);
    return hasClass&&stringsOf(init).includes(title);
  }),`${title} button variable`);
  const news=maybeName(trMailVar('tr-mail tr-news','Noticias').id);
  const mail=maybeName(trMailVar('tr-mail','Buzón: invitaciones y avisos').id);
  if(!news||!mail)throw new Error('Unsupported upstream: trainer mail button has no name');
  const friends=one(nodesOf(tree,'VariableDeclarator',node=>
    maybeName(node.id)!=='undefined'&&node.init?.type==='CallExpression'&&maybeName(node.init.callee)==='a4'
  ),'friends button variable');
  const friendName=maybeName(friends.id);
  if(!friendName)throw new Error('Unsupported upstream: friends button has no name');
  const trainer=one(nodesOf(tree,'CallExpression',node=>{
    const args=node.arguments;
    if(args.length<2||literal(args[0])!=='div'||args[1]?.type!=='ObjectExpression')return false;
    return args[1].properties.some(p=>p.type==='Property'&&maybeName(p.key)==='class'&&literal(p.value)==='trainer');
  }),'trainer bar');
  const args=trainer.arguments;
  const newsIdx=args.findIndex(a=>a.type==='Identifier'&&maybeName(a)===news);
  const friendArg=args[newsIdx+1];
  const mailArg=args[newsIdx+2];
  const isGuestFriend=friendArg?.type==='ConditionalExpression'&&literal(friendArg.consequent)===null&&maybeName(friendArg.alternate)===friendName;
  const isMailCondition=mailArg?.type==='ConditionalExpression'&&maybeName(mailArg.alternate)===mail;
  if(newsIdx<1||!isGuestFriend||!isMailCondition)
    throw new Error('Unsupported upstream: trainer news/friends/mail buttons are not adjacent arguments');
  const changes:{start:number;end:number;text:string}[]=[];
  // Drop news (plain Identifier) and friends (conditional) arguments entirely.
  changes.push({start:args[newsIdx-1]!.end,end:friendArg!.end,text:''});
  // Keep the guest "save account" branch of the mail condition; replace only the mail button with null.
  const alt=mailArg!.alternate;
  changes.push({start:alt.start,end:alt.end,text:'null'});
  return edits(source,changes);
}

// The account name in the trainer bar is `ue=Z('b',{},o.guest?c('Invitado'):o.name)`,
// which renders the local account name offline. Clear the name text but keep the <b> element:
// clanStatus still calls ue.prepend(clan tag), so the variable must stay defined.
export function patchHideTrainerName(source:string) {
  const tree=ast(source);
  const variable=one(nodesOf(tree,'VariableDeclarator',node=>{
    const init=node.init;
    if(init?.type!=='CallExpression'||maybeName(init.callee)!=='Z')return false;
    const args=init.arguments;
    if(literal(args[0])!=='b'||args[1]?.type!=='ObjectExpression'||args[1].properties.length!==0)return false;
    const text=args[2];
    if(text?.type!=='ConditionalExpression')return false;
    const tokens=[...nodesOf(text,'Literal'),...nodesOf(text,'TemplateLiteral')].map(literal);
    return tokens.includes('Invitado')&&nodesOf(text,'Identifier',n=>n.name==='name').length>0;
  }),'trainer name element');
  const init=variable.init;
  if(init?.type!=='CallExpression'||init.arguments.length!==3)
    throw new Error('Unsupported upstream: trainer name element has unexpected shape');
  // Drop the name expression (and its preceding comma), leaving Z('b',{}).
  return edits(source,[{start:init.arguments[1]!.end,end:init.arguments[2]!.end,text:''}]);
}

// The main menu's right-side season/leaderboard panel is the x7(e) child of the mm root.
export function patchRemoveSeasonPanel(source:string) {
  const tree=ast(source);
  const call=one(nodesOf(tree,'CallExpression',node=>maybeName(node.callee)==='x7'),'x7 season panel call');
  // x7(e) is a standalone argument: preceded by "),", followed by ",Z(".
  const before=source.slice(Math.max(0,call.start-3),call.start);
  const after=source.slice(call.end,call.end+3);
  if(!before.endsWith('),')||!after.startsWith(',Z('))
    throw new Error('Unsupported upstream: season panel call is not an argument');
  return edits(source,[{start:call.start-1,end:call.end,text:''}]);
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

// The "Beta v1.4.0" badge appended to the main-menu logo (class logo-ver).
export function patchRemoveVersionBadge(source:string) {
  const tree=ast(source);
  const stringsOf=(node:AnyNode)=>[...nodesOf(node,'Literal'),...nodesOf(node,'TemplateLiteral')].map(literal);
  const hasBadgeMarkers=(node:AnyNode)=>{
    const tokens=stringsOf(node);
    return tokens.includes('logo-ver')&&tokens.includes('Beta');
  };
  const factory=one([
    ...nodesOf(tree,'FunctionDeclaration',hasBadgeMarkers),
    ...nodesOf(tree,'VariableDeclarator',node=>
      (node.init?.type==='ArrowFunctionExpression'||node.init?.type==='FunctionExpression')&&hasBadgeMarkers(node))
  ],'version badge factory');
  const factoryName=maybeName(factory.id);
  if(!factoryName)throw new Error('Unsupported upstream: version badge factory has no name');
  const word=one(nodesOf(tree,'CallExpression',node=>{
    const args=node.arguments;
    if(args.length<2||literal(args[0])!=='div'||args[1]?.type!=='ObjectExpression')return false;
    return args[1].properties.some(p=>p.type==='Property'&&maybeName(p.key)==='class'&&literal(p.value)==='logo-word');
  }),'logo word element');
  const logo=one(nodesOf(tree,'CallExpression',node=>node.arguments.includes(word)),'logo container');
  const args=logo.arguments;
  const badge=args[args.length-1];
  if(args.indexOf(word)!==args.length-2||badge?.type!=='CallExpression'||maybeName(badge.callee)!==factoryName)
    throw new Error('Unsupported upstream: version badge is not the logo container last argument');
  return edits(source,[{start:word.end,end:badge.end,text:''}]);
}

export function patchEntryBranding(source:string) { return replaceBrand(source,'entry module'); }
export function patchHtmlBranding(source:string) { return replaceBrand(source,'HTML'); }
