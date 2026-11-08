import ts from 'typescript';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('.sites-runtime/search-tests',{recursive:true});
for(const name of ['media','search','broadcast','catalog']){let s=await readFile('lib/'+name+'.ts','utf8');s=s.replace(/from '\.\/(media|search|broadcast)'/g,"from './$1.js'");await writeFile('.sites-runtime/search-tests/'+name+'.js',ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);}
const {queryVariants,rankFilms,relevance,classifyWebResult}=await import('../.sites-runtime/search-tests/search.js');
const {searchCatalog}=await import('../.sites-runtime/search-tests/catalog.js');
assert.deepEqual(queryVariants('86不存在的战区'),['86不存在的战区','86 不存在的战区','86']);
assert.deepEqual(queryVariants('８６－不存在的战区－'),['８６－不存在的战区－','86 不存在的战区','86']);
const base={id:'302189',title:'86 -不存在的战区-',aliases:['86―エイティシックス―'],year:'2021',type:'动漫',sourceId:'builtin:bangumi',sourceName:'Bangumi',url:'https://bgm.tv/subject/302189',poster:'',resultKind:'catalog'};
assert.equal(relevance(base,'86不存在的战区'),120);assert.equal(relevance({...base,title:'86 -不存在的战区- 第2部分'},'86不存在的战区'),110);
assert.equal(rankFilms([base,{...base,title:'德国八六年',aliases:[]},{...base,title:'九巴86線',aliases:[]}],'86不存在的战区').length,1);
assert.equal(rankFilms([{...base,title:'其他正式译名',resultKind:undefined}],'English alias').length,1);
assert.equal(rankFilms([{...base,title:'86',aliases:[]}],'86不存在的战区').length,1);
assert.equal(classifyWebResult({title:'86',url:'https://www.bilibili.com/bangumi/play/ep398494',description:''}).category,'watch');assert.equal(classifyWebResult({title:'86',url:'https://bilibili.com.evil.example/watch/1',description:''}).category,'page');assert.equal(classifyWebResult({title:'86',url:'https://zh.wikipedia.org/wiki/86',description:''}).category,'page');
assert(relevance({...base,title:'86 -不存在的战区-'},'86')>relevance({...base,title:'重生86',aliases:[]},'86'));assert(relevance({...base,title:'Interstellar',aliases:[]},'interstellr')>0);
const original=globalThis.fetch;let mode='success',calls=[];
globalThis.fetch=async(url,init)=>{calls.push(String(url));if(mode==='limited')return new Response('',{status:429});if(String(url).includes('bgm.tv'))return Response.json({data:[{id:302189,name:'86―エイティシックス―',name_cn:'86 -不存在的战区-',date:'2021-04-10',type:2,summary:'真实接口样例',images:{large:'https://lain.bgm.tv/cover.jpg'}}]});if(String(url).includes('tvmaze'))return Response.json(String(url).endsWith('q=86')?[{show:{id:53961,name:'86',type:'Animation',premiered:'2021-04-11',url:'https://www.tvmaze.com/shows/53961/86',summary:'<p>Summary</p>',officialSite:'https://anime-86.com/'}}]:[]);return Response.json({results:[]});};
let results=await searchCatalog('bangumi','86不存在的战区');assert.equal(results[0].id,'302189');assert.equal(results[0].resultKind,'catalog');assert.equal(results[0].episodes.length,0);assert(results[0].watchLinks.every(x=>x.name.includes('搜索')));
const before=calls.length;await searchCatalog('bangumi','86不存在的战区');assert.equal(calls.length,before);
results=await searchCatalog('tvmaze','86不存在的战区');assert.equal(results[0].title,'86');assert(calls.some(x=>x.endsWith('q=86')));
mode='limited';await assert.rejects(()=>searchCatalog('bangumi','限流案例'),/限流/);await assert.rejects(()=>searchCatalog('invalid','test'),/未知/);
globalThis.fetch=original;console.log('PASS: mixed Chinese/numeric query normalization; punctuation; relevant results; custom aliases retained; provider fallback; metadata labels; cache; 429 handling');
if(process.argv.includes('--live')){const {searchCatalog:liveSearch}=await import('../.sites-runtime/search-tests/catalog.js?live='+Date.now());for(const provider of ['bangumi','tvmaze']){const films=await liveSearch(provider,'86不存在的战区');assert(films.some(f=>provider==='bangumi'?f.id==='302189':f.id==='53961'));console.log('LIVE PASS',provider,films.map(f=>({id:f.id,title:f.title,year:f.year,kind:f.resultKind})));}const enriched=await liveSearch('bangumi','86不存在的战区');assert(enriched[0].viewingLinks.some(x=>x.name.includes('哔哩哔哩')));console.log('LIVE PASS real broadcast catalog',enriched[0].viewingLinks.map(x=>({name:x.name,url:x.url,regions:x.regions})));const f=await liveSearch('wikipedia','Interstellar');assert(f.some(x=>/Interstellar/i.test(x.title)));console.log('LIVE PASS Wikipedia film search',f.slice(0,3).map(x=>x.title));}
