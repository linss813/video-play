import ts from 'typescript';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('.sites-runtime/tests',{recursive:true});
for(const name of ['media','playback','adapters']){let source=await readFile(`lib/${name}.ts`,'utf8');source=source.replace("from './media'","from './media.js'").replace("from './playback'","from './playback.js'");await writeFile(`.sites-runtime/tests/${name}.js`,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);}
const {runSource,checkUrl,resolvePlayback}=await import('../.sites-runtime/tests/adapters.js');const {groupFilms,validateSource}=await import('../.sites-runtime/tests/media.js');
const actual=globalThis.fetch;let response={list:[{vod_id:1,vod_name:'测试影片',vod_year:'2024',type_name:'电影',vod_play_from:'线路一',vod_play_url:'第一集$https://media.example.com/a.mp4#第二集$https://media.example.com/b.m3u8',vod_content:'<b>介绍</b>'}]};
globalThis.fetch=async(input)=>{if(String(input).includes('cloudflare-dns.com'))return Response.json({Status:0,Answer:[{type:1,data:'93.184.216.34'}]});return typeof response==='string'?new Response(response):Response.json(response);};
const source={id:'one',name:'样例',kind:'maccms',url:'https://example.com/api',enabled:true};let films=await runSource(source,'search','test');assert.equal(films.length,1);assert.equal(films[0].episodes.length,2);assert.equal(films[0].description,'介绍');
assert.equal(groupFilms([...films,{...films[0],sourceId:'two'}]).length,1);assert.equal(groupFilms([films[0],{...films[0],year:'2023'}]).length,2);assert.equal(groupFilms([{...films[0],year:''},{...films[0],sourceId:'two',year:''}]).length,2);
response='<div class="movie"><a href="/film/1"><b>测试页面</b></a><video src="https://media.example.com/a.mp4"></video></div>';
let s={...source,kind:'rules',rules:{format:'html',searchUrl:'/search?q={query}',items:'.movie',title:'b',url:'a@href',playback:'video@src'}};films=await runSource(s,'search','测试');assert.equal(films[0].title,'测试页面');assert.equal(films[0].url,'https://example.com/film/1');assert.equal(films[0].episodes[0].url,'https://media.example.com/a.mp4');
response={data:{items:[{name:'JSON影片',link:'/film/2',eps:[{name:'第1集',link:'/video.mp4'}]}]}};s={...s,rules:{format:'json',searchUrl:'/?q={query}',items:'data.items',title:'name',url:'link',episodes:'eps',episodeTitle:'name',episodeUrl:'link'}};films=await runSource(s,'search');assert.equal(films[0].title,'JSON影片');assert.equal(films[0].episodes.length,1);
for(const url of ['http://127.1','http://2130706433','http://10.0.0.1','http://192.168.1.1','http://[::1]','file:///etc/passwd','https://user:pass@example.com'])await assert.rejects(()=>checkUrl(url));
globalThis.fetch=async()=>Response.json({Status:0,Answer:[{type:1,data:'127.0.0.1'}]});await assert.rejects(()=>checkUrl('https://example.com'));
globalThis.fetch=async(url)=>String(url).includes('cloudflare-dns.com')?Response.json({Status:0,Answer:[]}):new Response('',{status:302,headers:{location:'http://127.0.0.1'}});await assert.rejects(()=>runSource(source,'search'));
globalThis.fetch=async(url)=>String(url).includes('cloudflare-dns.com')?Response.json({Status:0,Answer:[]}):new Response('',{status:429});await assert.rejects(()=>runSource(source,'search'),/频繁/);
assert.equal(resolvePlayback('https://example.com/a.m3u8?token=x'),'direct');assert.equal(resolvePlayback('https://example.com/watch/1'),'external');assert.throws(()=>validateSource({...source,url:'javascript:alert(1)'}));
globalThis.fetch=actual;console.log('PASS: MacCMS, HTML/JSON rules, episodes, merge ambiguity, SSRF/redirects, rate limits, playback classification');
if(process.argv.includes('--live')){const d=await runSource({...source,kind:'bookmark',url:'https://archive.org'},'test');assert.deepEqual(d,[]);console.log('PASS: real public source archive.org reachable');}
