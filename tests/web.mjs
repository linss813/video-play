import ts from 'typescript';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('.sites-runtime/search-tests',{recursive:true});
for(const [name,file] of [['search','lib/search.ts'],['web','app/api/web/route.ts']]){let s=await readFile(file,'utf8');s=s.replace("from '../../../lib/search'","from './search.js'");await writeFile('.sites-runtime/search-tests/'+name+'.js',ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);}
const {GET}=await import('../.sites-runtime/search-tests/web.js');
const original=globalThis.fetch;const prior=process.env.BRAVE_SEARCH_API_KEY;delete process.env.BRAVE_SEARCH_API_KEY;let calls=[];
globalThis.fetch=async(url)=>{const q=new URL(url).searchParams.get('q');calls.push(q);if(q.includes('86'))return new Response('<rss><channel><item><title>九巴86路</title><link>https://example.com/bus</link><description>巴士</description></item></channel></rss>');return new Response('<rss><channel><item><title>86－不存在的戰區－</title><link>https://www.bilibili.com/bangumi/play/ep398494</link><description>僅限港澳台地區</description></item><item><title>不存在的战区百科</title><link>https://example.com/wiki</link></item><item><title>不存在的战区</title><link>javascript:alert(1)</link></item></channel></rss>');};
const d=await(await GET(new Request('https://example.com/api/web?q='+encodeURIComponent('86不存在的战区')))).json();assert.equal(d.results.length,2);assert.equal(d.results[0].category,'watch');assert(calls.includes('不存在的战区'));assert(!d.configured);
globalThis.fetch=async()=>new Response('<html>challenge</html>');const error=await(await GET(new Request('https://example.com/api/web?q=test'))).json();assert(error.error);assert.deepEqual(error.results,[]);
globalThis.fetch=original;if(prior!==undefined)process.env.BRAVE_SEARCH_API_KEY=prior;console.log('PASS: free RSS focused Chinese fallback, traditional titles, watch priority, irrelevant results, invalid URL, upstream challenge');
