import {ast,nodesOf,one,maybeName,nameOf,edits,requireNode,literal} from './source.ts';

const webHostPattern=/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
// Optional exact-match web deployment hosts (POKEBONK_WEB_HOSTS, comma-separated).
// Empty by default so official desktop and Android builds stay unchanged.
// POKEBONK_ALLOW_ANY_ORIGIN=1 removes the gate entirely for unrestricted web hosting.
function webHosts(env:string|undefined) {
  return (env??'').split(',').map(host=>host.trim().toLowerCase()).filter(Boolean).map(host=>{
    if(!webHostPattern.test(host))throw new Error(`Invalid web host whitelist entry: ${host}`);
    return host;
  });
}
export function patchNativeOriginGate(source:string,extraHosts?:readonly string[],allowAnyOrigin=process.env['POKEBONK_ALLOW_ANY_ORIGIN']==='1') {
  const web=allowAnyOrigin?[]:webHosts(extraHosts===undefined?process.env['POKEBONK_WEB_HOSTS']:[...extraHosts].join(','));
  const tree=ast(source);
  const hostname=nodesOf(tree,'MemberExpression',n=>n.object.type==='Identifier'&&n.object.name==='location'&&maybeName(n.property)==='hostname');
  if(!hostname.length)return source;
  const gate=one(nodesOf(tree,'CallExpression',n=>n.callee.type==='Identifier'&&n.arguments.length===1&&n.arguments[0]?.type==='MemberExpression'&&hostname.includes(n.arguments[0])),'native origin gate');
  const callee=nameOf(gate.callee);
  const declaration=one(nodesOf(tree,'VariableDeclarator',n=>maybeName(n.id)===callee),'native origin predicate');
  const predicate=requireNode(declaration.init,'ArrowFunctionExpression');
  const host=nameOf(one(predicate.params,'origin predicate parameter'));
  const calls=nodesOf(predicate.body,'CallExpression',n=>n.callee.type==='MemberExpression'&&n.callee.object.type==='Identifier'&&n.callee.object.name===host&&maybeName(n.callee.property)==='endsWith');
  for(const suffix of ['.localhost','.local'])if(!calls.some(n=>literal(n.arguments[0])===suffix))throw new Error('Unsupported native origin predicate');
  const official=nodesOf(predicate.body,'Literal',n=>n.regex?.pattern.includes('pokebonk')===true);
  if(official.length!==1)throw new Error('Unsupported official origin predicate');
  // These are the existing local asset origins, not additional website hosts.
  // Keep both origins stable so native upgrades retain their Web Storage.
  const native=`location.href.startsWith('pokebonk://game/')||location.href.startsWith('https://appassets.androidplatform.net/')`;
  const webChecks=web.map(host=>`location.hostname===${JSON.stringify(host)}`).join('||');
  const extensions=webChecks?`${native}||${webChecks}`:native;
  const replacement=allowAnyOrigin?'true':`(${source.slice(gate.start,gate.end)}||${extensions})`;
  return edits(source,[{start:gate.start,end:gate.end,text:replacement}]);
}
