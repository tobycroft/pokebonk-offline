export type Species = {id:number;key:string;name:string;color:string;types:string[]};
export type Locale = Record<string,string>;

const colorWords: Record<string,string> = {
  black:'黑',blue:'蓝',brown:'棕',gray:'灰',green:'绿',pink:'粉',purple:'紫',red:'红',white:'白',yellow:'黄'
};

// Every suffix is distinct so colour+suffix groups cannot collide across types.
const typeWords: Record<string,string> = {
  bug:'甲虫',dark:'影',dragon:'龙',electric:'鼠',fairy:'妖',fighting:'拳兽',fire:'蜥',
  flying:'鸟',ghost:'灵',grass:'蛙',ground:'泥兽',ice:'冰兽',normal:'兽',poison:'毒虫',
  psychic:'念兽',rock:'石兽',steel:'钢兽',water:'龟'
};

const middlePool=[...'芽蔓藤叶花果枝根苗蕊岚风云雾霜雪冰露雷电涛浪潮波泉溪湖海川河焰炎火烬炽灼烽煌曜辉岩石砂砾峰岭崖丘岳矿翼羽翎翔飞空天穹霄际星辰月日光影暗幽玄冥钢铁金银铜晶钻瑶瑾瑜'];

// Hand-picked names for the most recognisable characters. None of these are
// official names; the fire starter's final form is named "焰翼龙" instead.
const overrides: Record<number,string> = {
  1:'绿蛙',2:'藤蛙',3:'花冠蛙',4:'焰尾蜥',5:'烈焰蜥',6:'焰翼龙',7:'蓝壳龟',8:'浪壳龟',9:'炮壳龟',
  25:'电颊鼠',26:'雷颊兽',52:'银爪猫',53:'豹纹猫',92:'幽气鬼',93:'幽影鬼',94:'暗影鬼',
  129:'跃浪鱼',130:'怒浪龙',133:'灵纹兽',134:'水纹兽',135:'雷纹兽',136:'焰纹兽',
  143:'巨眠兽',144:'冰羽鸟',145:'雷羽鸟',146:'焰羽鸟',149:'云鳞龙',150:'幻翼兽',151:'星幻兽',
  155:'焰尾鼠',156:'烈焰鼠',157:'焰王鼠',158:'蓝颚鳄',159:'浪颚鳄',160:'巨颚鳄',163:'夜枭',164:'夜冠枭',
  196:'幻叶兽',197:'月叶兽',199:'怒浪兽',248:'巨翼龙',249:'怒海龙',250:'焰鬃兽',251:'心鳞兽',
  445:'云翼龙',448:'影爪兽',493:'创世兽',494:'焰兔',495:'水獭',496:'草狐'
};

const escapeRegex=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const isLatin=(value:string)=>/^[A-Za-z][A-Za-z0-9 .'-]*$/.test(value);

export function buildCharacterNameMap(species:readonly Species[],locales:readonly Locale[]) {
  if(!species.length||!locales.length)throw new Error('Unsupported character catalog');
  const originals=new Set<string>();
  for(const locale of locales)for(const value of Object.values(locale))if(typeof value==='string'&&value)originals.add(value);
  for(const entry of species)originals.add(entry.name);
  const map=new Map<string,string>();
  const used=new Set<string>();
  const counters=new Map<string,number>();
  for(const entry of species){
    let name=overrides[entry.id];
    if(!name){
      const prefix=colorWords[entry.color]??'彩';
      const suffix=typeWords[entry.types?.[0]??'normal']??'兽';
      const group=`${prefix}|${suffix}`;
      const index=counters.get(group)??0;
      counters.set(group,index+1);
      name=`${prefix}${middlePool[index%middlePool.length]}${suffix}`;
    }
    if(used.has(name)||originals.has(name))name=`${name}·${entry.id}`;
    used.add(name);
    for(const locale of locales){
      const original=locale[String(entry.id)];
      if(typeof original==='string'&&original&&!map.has(original))map.set(original,name);
    }
    if(entry.name&&!map.has(entry.name))map.set(entry.name,name);
  }
  if(map.size<species.length)throw new Error('Incomplete character name map');
  return map;
}

// Latin names use word boundaries so words like "Absoluto" stay intact.
// A few Hangul words merely contain a one/two-letter name; preserve them.
export function patchCharacterNames(source:string,names:ReadonlyMap<string,string>) {
  const preserved:string[]=[];
  let result=source.replace(/뮤테이션|커뮤니티|뮤트|가디언|찾아보세요/g,value=>`@@BAOKE_KEEP_${preserved.push(value)-1}@@`);
  const entries=[...names].filter(([from,to])=>from&&to&&from!==to).sort((a,b)=>b[0].length-a[0].length);
  for(const [from,to]of entries)
    result=isLatin(from)?result.replace(new RegExp(`\\b${escapeRegex(from)}(?:'s|s)?\\b`,'g'),to):result.split(from).join(to);
  return result.replace(/@@BAOKE_KEEP_(\d+)@@/g,(_,index)=>preserved[Number(index)]??'');
}

export function characterNamesRemain(source:string,names:ReadonlyMap<string,string>) {
  return patchCharacterNames(source,names)!==source;
}
