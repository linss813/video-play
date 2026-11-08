import ts from 'typescript';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('.sites-runtime/age-embed-tests',{recursive:true});
for(const name of ['media','playback','adapters']){let s=await readFile('lib/'+name+'.ts','utf8');s=s.replace(/from '\.\/(media|playback)'/g,"from './$1.js'");await writeFile('.sites-runtime/age-embed-tests/'+name+'.js',ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);}
const {resolveSourcePlayback,checkUrl}=await import('../.sites-runtime/age-embed-tests/adapters.js');
const original=globalThis.fetch;const source={id:'age',name:'AGE',url:'https://www.agedm.io/',kind:'website',site:'age',enabled:true};const episode={name:'第06集',url:'https://www.agedm.io/play/20210061/1/6'};
let html='<iframe id="iframeForVideo" src="https://player.example.com:8443/vip/?url=public-page-token"></iframe>';
globalThis.fetch=async url=>String(url).includes('cloudflare-dns.com')?Response.json({Status:0,Answer:[{type:1,data:'93.184.216.34'}]}):new Response(html);
const embed=await resolveSourcePlayback(source,episode);assert.equal(embed.kind,'embed');assert.equal(embed.pageUrl,episode.url);assert(embed.url.startsWith('https://player.example.com:8443/'));await assert.rejects(()=>checkUrl('https://player.example.com:8443/'));
html='<video src="https://cdn.example.com/episode.m3u8"></video>';const direct=await resolveSourcePlayback(source,episode);assert.equal(direct.kind,'direct');assert.equal(direct.mimeType,'application/vnd.apple.mpegurl');
html='<iframe src="http://127.0.0.1/private"></iframe>';await assert.rejects(()=>resolveSourcePlayback(source,episode));html='<iframe src="javascript:alert(1)"></iframe>';await assert.rejects(()=>resolveSourcePlayback(source,episode));await assert.rejects(()=>resolveSourcePlayback(source,{...episode,url:'https://attacker.example/play/1/1/1'}));await assert.rejects(()=>resolveSourcePlayback({...source,site:'mvffm'},episode));await assert.rejects(()=>resolveSourcePlayback(source,undefined));
globalThis.fetch=original;console.log('PASS: AGE page-to-embed resolution, optional direct media, source-page binding, private/protocol/port restrictions');
if(process.argv.includes('--live')){const result=await resolveSourcePlayback(source,episode);assert.equal(result.kind,'embed');assert(result.pageUrl.includes('/play/20210061/1/6'));const r=await fetch(result.url,{signal:AbortSignal.timeout(10000)});assert.equal(r.status,200);console.log('LIVE PASS AGE episode 6 embedded player',JSON.stringify({kind:result.kind,frameStatus:r.status,xFrameOptions:r.headers.get('x-frame-options'),contentSecurityPolicy:r.headers.get('content-security-policy')}));await r.body?.cancel();}
