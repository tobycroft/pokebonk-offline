import {createHash} from 'node:crypto';

// Cache-busting version derived from the bytes of every payload resource.
// Any change to any asset (including our build-time patches) changes this value,
// which changes every asset URL and defeats browser/nginx/CDN caches on deploy.
export function cacheBustVersion(files: ReadonlyMap<string, Uint8Array>): string {
  const names=[...files.keys()].sort();
  const hash=createHash('sha256');
  for(const name of names){hash.update(name);hash.update('\0');hash.update(files.get(name)!);}
  return hash.digest('hex').slice(0,12);
}

// Inject ?v=<version> into relative asset references (./<name>.js / .css).
// Asset file names themselves are unchanged so module detection, the resource
// contract and asset-manifest paths keep working; only the URL gains a query.
export function injectCacheBust(source: string, version: string): string {
  if(!/^[0-9a-f]{12}$/.test(version))throw new Error('Invalid cache-bust version');
  const references=[...source.matchAll(/\.\/[\w-]+\.(?:js|css)\b/g)].map(match=>match[0]);
  const output=source.replace(/\.\/([\w-]+\.(?:js|css))\b(?!\?v=)/g,(_all,name)=>`./${name}?v=${version}`);
  const after=[...output.matchAll(/\.\/[\w-]+\.(?:js|css)\?v=[0-9a-f]{12}\b/g)].map(match=>match[0]);
  if(after.length!==references.length)throw new Error(`Unsupported upstream: cache-bust reference count ${references.length} -> ${after.length}`);
  return output;
}

// HTML asset URLs are written as ./assets/<name>.js (with the assets/ dir).
export function injectHtmlCacheBust(source: string, version: string): string {
  if(!/^[0-9a-f]{12}$/.test(version))throw new Error('Invalid cache-bust version');
  const before=(source.match(/\.\/assets\/[\w-]+\.(?:js|css)\b/g)??[]).length;
  const output=source.replace(/\.\/assets\/([\w-]+\.(?:js|css))\b(?!\?v=)/g,(_all,name)=>`./assets/${name}?v=${version}`);
  const after=(output.match(/\.\/assets\/[\w-]+\.(?:js|css)\?v=[0-9a-f]{12}\b/g)??[]).length;
  if(after!==before)throw new Error(`Unsupported upstream: HTML cache-bust reference count ${before} -> ${after}`);
  return output;
}
