import {test} from 'node:test';
import assert from 'node:assert/strict';
import {brandName,patchMenuBranding,patchRemoveVersionBadge,patchRemoveLogout,patchRemoveMenuButtons,patchRemoveTopButtons,patchRemoveSeasonPanel,patchRemoveRankingTile,patchRemoveClanTile,patchRemoveEventCard,patchRemoveTrainerMailButtons,patchHideTrainerName,patchEntryBranding,patchHtmlBranding} from '../scripts/rebrand.ts';

const menus=`
function j5(e=\`normal\`){let t=e===\`hero\`;return Z(\`div\`,{class:\`logo\`},Z(\`div\`,{class:\`logo-word\`},\`Poké\`,Z(\`span\`,{class:\`logo-bonk\`},...t?[...\`Bonk\`].map((e,t)=>e):[\`Bonk\`]),Z(\`small\`,{class:\`logo-com\`},\`.com\`),t?Z(\`b\`,{class:\`logo-glint\`},\`PokéBonk\`):null))}
function J5(e,t=!1){return Z(\`div\`,{class:\`mm-legal\`},Z(\`p\`,{},c(\`PokéBonk es un fan-game\`)))}
`;

test('menu logo becomes the display brand while the footer content is removed',()=>{
  const patched=patchMenuBranding(menus);
  assert.match(patched,/"Bao"/);
  assert.equal((patched.match(/"ke"/g)??[]).length,2);
  assert.match(patched,/"Baoke"/);
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

const topBar=`
ve=w5(e,\`mm\`,Z(\`div\`,{class:\`mm-top\`},d$(),Wc()?h7():Uc()?g7():null,g5(e),Bee(e),rZ()?cZ(e):null,_e,ac?_7(ac):null),Z(\`div\`,{class:\`mm-left\`},x7(e)));
`;

test('shop and apps buttons are removed from the top bar while others stay',()=>{
  const patched=patchRemoveTopButtons(topBar);
  assert.doesNotMatch(patched,/Bee\(e\)/);
  assert.doesNotMatch(patched,/cZ\(e\)/);
  assert.doesNotMatch(patched,/rZ\(\)/);
  assert.match(patched,/d\$\(\)/);
  assert.match(patched,/g5\(e\)/);
  assert.match(patched,/ac\?_7\(ac\):null/);
  assert.match(patched,/class:\`mm-top\`/);
});

const seasonRoot=`
ve=w5(e,\`mm\`,Z(\`div\`,{class:\`mm-top\`},g5(e)),Z(\`div\`,{class:\`mm-left\`},y),x7(e),Z(\`div\`,{class:\`mm-foot\`},J5(()=>ete(e))));
`;

test('right-side season panel is removed from the main menu root',()=>{
  const patched=patchRemoveSeasonPanel(seasonRoot);
  assert.doesNotMatch(patched,/x7\(e\)/);
  assert.match(patched,/class:\`mm-top\`/);
  assert.match(patched,/class:\`mm-left\`/);
  assert.match(patched,/class:\`mm-foot\`/);
  assert.doesNotMatch(patched,/\),,/);
});

const tileBar=`
let ce=Z(\`div\`,{class:\`mm-tiles\`},te(WU(\`ultra-ball\`),c(\`Pokédex\`),a),te(WU(\`star-piece\`),c(\`Logros\`),b),te(Q(\`gold\`,32),c(\`Ranking\`),oe,\`\${c(\`Clasificación\`)} · \${D9(ae)}\`,\`var(--yellow-d)\`,()=>U9(e)),ne,te(WU(\`tm-case\`),c(\`Builds\`),c));
`;

test('ranking tile is removed while the other tiles stay',()=>{
  const patched=patchRemoveRankingTile(tileBar);
  assert.doesNotMatch(patched,/c\(\`Ranking\`\)/);
  assert.doesNotMatch(patched,/U9\(e\)/);
  assert.match(patched,/c\(\`Pokédex\`\)/);
  assert.match(patched,/c\(\`Logros\`\)/);
  assert.match(patched,/c\(\`Builds\`\)/);
  assert.match(patched,/class:\`mm-tiles\`/);
});

test('unexpected ranking tile structure fails closed',()=>{
  assert.throws(()=>patchRemoveRankingTile(tileBar.replace('c(\`Ranking\`)','c(\`Ranking2\`)')),/ranking tile/);
});

const clanMenu=`
let ne=te(Q(\`clan\`,36),c(\`Clan\`),c(\`Sin clan\`),c(\`Juega en equipo\`),\`#2563d8\`,()=>l3(e));ne.classList.add(\`clan\`);
let ce=Z(\`div\`,{class:\`mm-tiles\`},te(WU(\`ultra-ball\`),c(\`Pokédex\`),a),ne,te(WU(\`tm-case\`),c(\`Builds\`),c));
`;

test('clan tile is detached from the tile bar while its variable stays',()=>{
  const patched=patchRemoveClanTile(clanMenu);
  assert.doesNotMatch(patched,/,ne\)/);
  assert.match(patched,/c\(\`Pokédex\`\),a\),te\(WU\(\`tm-case\`\)/);
  assert.match(patched,/class:\`mm-tiles\`/);
  assert.match(patched,/let ne=te\(Q\(\`clan\`/);
  assert.match(patched,/ne\.classList\.add\(\`clan\`\)/);
});

test('unexpected clan tile structure fails closed',()=>{
  assert.throws(()=>patchRemoveClanTile(clanMenu.replace('c(\`Clan\`)','c(\`Clan2\`)')),/clan tile variable/);
  assert.throws(()=>patchRemoveClanTile(clanMenu.replace(',ne,te(',',ne2,te(').replace('class:\\`mm-tiles\\`,te','class:\\`mm-tiles\\`,te')),/clan tile/);
});

const eventMenu=`
function n8(e,t){let n=t8(e)[0];if(!n)return null;let a=t(\`event\`,Q(n.art.icon,40),c(n.name),i,n.color,()=>s8(e,n.id));return a}
let re=n8(e,f),ie=r8(e,f);
ve=w5(e,\`mm\`,Z(\`div\`,{class:\`mm-nav\`},y,Z(\`div\`,{class:\`mm-today\`},re,ie,T),ce,le));
`;

test('event card is detached from mm-today while the factory stays',()=>{
  const patched=patchRemoveEventCard(eventMenu);
  assert.match(patched,/class:\`mm-today\`\},ie,T/);
  assert.doesNotMatch(patched,/class:\`mm-today\`\},re,ie/);
  assert.match(patched,/function n8\(/);
  assert.match(patched,/let re=n8\(e,f\)/);
});

test('unexpected event card structure fails closed',()=>{
  assert.throws(()=>patchRemoveEventCard(eventMenu.replace('t(\`event\`','t(\`event2\`')),/event card factory markers/);
  assert.throws(()=>patchRemoveEventCard(eventMenu.replace('re=n8(e,f)','re=q8(e,f)')),/event card variable/);
});

const trainerMail=`
let de=Z(\`button\`,{class:\`tr-mail tr-news\`,title:c(\`Noticias\`),onclick:()=>M1(e)},Q(\`news\`,26));
let fe=Z(\`button\`,{class:\`tr-mail\`,title:c(\`Buzón: invitaciones y avisos\`),onclick:()=>e6(e)},Q(\`mail\`,26)),pe=a4(e);
let _e=Z(\`div\`,{class:\`trainer\`},Z(\`button\`,{class:\`tr-av\`},av),Z(\`div\`,{class:\`tr-cur\`},cur),de,o.guest?null:pe,o.guest?Z(\`button\`,{class:\`btn small blue\`},c(\`Guardar en cuenta\`)):fe);
T1(e).then(()=>{de.isConnected&&(de.title=x),me(fe,t.mail),me(pe,t.friends)});
`;

test('news/friends/mail buttons are detached while the guest save branch and variables stay',()=>{
  const patched=patchRemoveTrainerMailButtons(trainerMail);
  assert.match(patched,/class:\`tr-av\`\},av\),Z\(\`div\`,{class:\`tr-cur\`},cur\),o\.guest\?/);
  assert.match(patched,/o\.guest\?Z\(\`button\`,{class:\`btn small blue\`},c\(\`Guardar en cuenta\`\)\):null/);
  assert.doesNotMatch(patched,/cur\),de/);
  assert.doesNotMatch(patched,/null:pe/);
  assert.match(patched,/let de=Z\(\`button\`/);
  assert.match(patched,/let fe=Z\(\`button\`/);
  assert.match(patched,/pe=a4\(e\)/);
  assert.match(patched,/de\.isConnected/);
  assert.match(patched,/me\(fe,t\.mail\),me\(pe,t\.friends\)/);
});

test('unexpected trainer mail structure fails closed',()=>{
  assert.throws(()=>patchRemoveTrainerMailButtons(trainerMail.replace('tr-mail tr-news\`,title:c(\`Noticias\`','tr-mail tr-news\`,title:c(\`Otro\`')),/Noticias button variable/);
  assert.throws(()=>patchRemoveTrainerMailButtons(trainerMail.replace('o.guest?null:pe','o.guest?x:pe')),/not adjacent arguments/);
  assert.throws(()=>patchRemoveTrainerMailButtons(trainerMail.replace('o.guest?Z(\`button\`,{class:\`btn small blue\`},c(\`Guardar en cuenta\`)):fe','o.guest?Z(\`button\`,{class:\`btn small blue\`},c(\`Guardar en cuenta\`)):xg')),/not adjacent arguments/);
});

const trainerName=`
let ue=Z(\`b\`,{},o.guest?c(\`Invitado\`):o.name),de=Z(\`button\`,{class:\`tr-mail tr-news\`},Q(\`news\`,26));
let _e=Z(\`div\`,{class:\`trainer\`},Z(\`div\`,{class:\`tr-tx\`},ue,n.title?Z(\`small\`,{class:\`tr-title\`},Ve(n.title,R9)):null),de);
he||=(ue.prepend(M\$(t.clan.tag)),!0);
`;

test('trainer account name text is cleared while the element and clan tag stay',()=>{
  const patched=patchHideTrainerName(trainerName);
  assert.match(patched,/let ue=Z\(\`b\`,\{\}\)/);
  assert.doesNotMatch(patched,/c\(\`Invitado\`\):o\.name/);
  assert.match(patched,/class:\`tr-tx\`\},ue/);
  assert.match(patched,/ue\.prepend\(M\$\(t\.clan\.tag\)\)/);
});

test('unexpected trainer name structure fails closed',()=>{
  assert.throws(()=>patchHideTrainerName(trainerName.replace('c(\`Invitado\`)','c(\`Huesped\`)')),/trainer name element/);
  assert.throws(()=>patchHideTrainerName(trainerName.replace('Z(\`b\`,{},','Z(\`b\`,{class:\`x\`},')),/trainer name element/);
});

test('unexpected season panel structure fails closed',()=>{
  assert.throws(()=>patchRemoveSeasonPanel(seasonRoot.replace('x7(e)','q7(e)')),/x7 season panel call/);
});

test('unexpected top bar structure fails closed',()=>{
  assert.throws(()=>patchRemoveTopButtons(topBar.replace('rZ()?cZ(e):null','rZ()?qZ(e):null')),/shop\/apps buttons/);
});

const versionBadge=`
function o6(){let e=Z(\`button\`,{class:\`logo-ver\`+(i6()===Zn?\`\`:\` fresh\`),title:c(\`Novedades\`)},Z(\`b\`,{},c(\`Beta\`)),\`v\${Zn}\`);return e}
function j5(e=\`normal\`){let t=e===\`hero\`;return Z(\`div\`,{class:\`logo\`+(e===\`normal\`?\`\`:\` \`+e)},Z(\`div\`,{class:\`logo-word\`},\`宝可\`,Z(\`span\`,{class:\`logo-bonk\`},\`出击\`)),o6())}
`;

test('Beta/version badge is removed from the logo while the wordmark stays',()=>{
  const patched=patchRemoveVersionBadge(versionBadge);
  assert.doesNotMatch(patched,/,o6\(\)\)/);
  assert.match(patched,/class:\`logo-word\`/);
  assert.match(patched,/class:\`logo\`/);
  assert.match(patched,/function o6\(\)/);
});

test('unexpected version badge structure fails closed',()=>{
  assert.throws(()=>patchRemoveVersionBadge(versionBadge.replace('logo-ver','logo-ver2')),/version badge factory/);
  assert.throws(()=>patchRemoveVersionBadge(versionBadge.replace(',o6())',',o7())')),/last argument/);
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
