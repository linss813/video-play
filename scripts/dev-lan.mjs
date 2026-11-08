// Local Node gateway: run the same API routes with native Node networking,
// and forward UI/HMR to the private Vinext preview. Hosted builds keep Workers.
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import ts from 'typescript';
import {assistCors} from '../lib/local-assist.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2);
const option=(names,fallback)=>{const i=args.findIndex(a=>names.includes(a)||names.some(n=>a.startsWith(n+'=')));if(i<0)return fallback;return args[i].includes('=')?args[i].split('=').slice(1).join('='):args[i+1]||fallback;};
const port=Number(option(['--port','-p'],'5173'));const host=option(['--hostname','--host','-H'],'0.0.0.0');const innerPort=port+1;
const child=spawn(process.execPath,['scripts/run-framework.mjs','dev','--port',String(innerPort),'--hostname','127.0.0.1'],{cwd:root,stdio:'inherit',env:process.env});
const files=['lib/media.ts','lib/playback.ts','lib/search.ts','lib/catalog.ts','lib/broadcast.ts','lib/adapters.ts','lib/source-search.ts','app/api/source/route.ts','app/api/catalog/route.ts','app/api/web/route.ts'];
let previous='',modules;
async function compileHandlers(){const sources=await Promise.all(files.map(f=>readFile(path.join(root,f),'utf8')));const hash=createHash('sha256').update(sources.join('\n')).digest('hex').slice(0,14);if(hash===previous&&modules)return modules;const out=path.join(root,'.sites-runtime','node-api',hash);await Promise.all(files.map(async(file,i)=>{const target=path.join(out,file.replace(/\.ts$/,'.js'));await mkdir(path.dirname(target),{recursive:true});const code=ts.transpileModule(sources[i],{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,verbatimModuleSyntax:false}}).outputText.replace(/(from\s+["'])(\.{1,2}\/[^"']+)(["'])/g,(_,a,p,b)=>a+p+(path.extname(p)?'':'.js')+b);await writeFile(target,code);}));const loaded=await Promise.all(['source','catalog','web'].map(async name=>[name,await import(pathToFileURL(path.join(out,'app/api',name,'route.js')).href)]));modules=Object.fromEntries(loaded);previous=hash;return modules;}
let building;
async function handlers(){if(building)return building;building=compileHandlers();try{return await building;}finally{building=undefined;}}
function forward(req,res){const upstream=http.request({hostname:'127.0.0.1',port:innerPort,path:req.url,method:req.method,headers:{...req.headers,host:`127.0.0.1:${innerPort}`}},r=>{res.writeHead(r.statusCode||502,r.headers);r.pipe(res);});upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'Content-Type':'text/plain;charset=utf-8'});res.end('本地界面正在启动，请稍后刷新。');});req.pipe(upstream);}
const server=http.createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname.startsWith('/api/')){const policy=assistCors(req.headers.origin,req.headers.host);if(!policy.allowed){res.writeHead(403);res.end('Origin not allowed');return;}for(const [k,v] of Object.entries(policy.headers))res.setHeader(k,v);if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}if(pathname==='/api/local-assist'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({app:'cineatlas',available:true}));return;}}const match=pathname.match(/^\/api\/(source|catalog|web)$/);if(!match)return forward(req,res);try{const route=(await handlers())[match[1]];const fn=route[req.method];if(!fn){res.writeHead(405);res.end();return;}let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>60000){res.writeHead(413);res.end('Request too large');return;}chunks.push(c);}const body=Buffer.concat(chunks);const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(body.length?{body}: {})});const result=await fn(request);res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));}catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e instanceof Error?e.message:'本地请求失败'}));}});
server.on('upgrade',(req,socket,head)=>{const upstream=net.connect(innerPort,'127.0.0.1',()=>{upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`+Object.entries(req.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')+'\r\n\r\n');upstream.write(head);socket.pipe(upstream).pipe(socket);});upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());});
server.listen(port,host,()=>console.log(`\nCineAtlas LAN gateway: http://${host}:${port}\nUI: private Vinext port ${innerPort} · API: native Node fetch\n`));
let closing=false;function stop(){if(closing)return;closing=true;child.kill('SIGTERM');server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),1500).unref();}process.on('SIGINT',stop);process.on('SIGTERM',stop);child.on('exit',code=>{if(!closing){server.close();process.exit(code||0);}});server.on('error',e=>{console.error(e.message);stop();});
