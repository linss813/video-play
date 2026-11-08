'use client';
import {useState,useEffect,useRef} from 'react';
import Hls from 'hls.js';
import {X,ArrowUpRight,SkipForward,Loader2,Play,Maximize} from 'lucide-react';
import type {Film,Episode} from '../lib/media';
export default function MediaPlayer({film,episode,onClose,onEpisodeSelect,resolving=false}:{film:Film;episode:Episode;onClose:()=>void;onEpisodeSelect?:(episode:Episode)=>void;resolving?:boolean}){
 const video=useRef<HTMLVideoElement>(null);const embedBox=useRef<HTMLDivElement>(null);
 const [current,setCurrent]=useState(episode);const [error,setError]=useState('');const [status,setStatus]=useState('正在连接视频…');const [rate,setRate]=useState(1);
 const embedded=current.kind==='embed';const episodeNavigation=!!current.pageUrl;
 const choices=episodeNavigation?(film.episodes||[]):(film.episodes||[]).filter(e=>e.kind==='direct'||/\.(m3u8|mp4|webm)(?:[?#]|$)/i.test(e.url));
 useEffect(()=>setCurrent(episode),[episode]);
 useEffect(()=>{if(current.kind==='embed'){setError('');setStatus('使用来源内嵌播放器');return;}const el=video.current;if(!el)return;let hls:Hls|undefined;let savedAt=0;let active=true;setError('');setStatus('正在连接视频…');
 const key=`progress:${film.sourceId}:${film.id}:${current.name}`;
 const save=()=>{if(Number.isFinite(el.currentTime)&&el.currentTime>0){try{localStorage.setItem(key,String(el.currentTime));}catch{}}};
 const time=()=>{if(Date.now()-savedAt>5000){save();savedAt=Date.now();}};
 const ready=()=>{if(!active)return;let progress=0;try{progress=Number(localStorage.getItem(key)||0);}catch{}if(progress>0&&Number.isFinite(el.duration)&&progress<el.duration-5)el.currentTime=progress;el.playbackRate=rate;setStatus('已加载，点击播放');};
 el.addEventListener('loadedmetadata',ready);el.addEventListener('timeupdate',time);
 const isHls=current.mimeType==='application/vnd.apple.mpegurl'||/\.m3u8(?:[?#]|$)/i.test(current.url);
 if(isHls&&!el.canPlayType('application/vnd.apple.mpegurl')){if(Hls.isSupported()){hls=new Hls({manifestLoadingTimeOut:10000,manifestLoadingMaxRetry:1,levelLoadingTimeOut:10000,levelLoadingMaxRetry:1});hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal&&active){setError('这条线路未能加载，可能已失效或受到跨域、来源访问限制。请切换线路，或打开原站。');setStatus('线路加载失败');hls?.stopLoad();}});hls.loadSource(current.url);hls.attachMedia(el);}else{setError('此浏览器不支持当前 HLS 格式，请尝试其他浏览器或打开原站。');setStatus('格式不支持');}}else el.src=current.url;
 const timer=setTimeout(()=>{if(active&&el.readyState<2){setStatus('连接时间较长');setError('线路响应较慢，可以尝试下一条线路。');}},15000);
 return()=>{active=false;clearTimeout(timer);save();el.removeEventListener('loadedmetadata',ready);el.removeEventListener('timeupdate',time);hls?.destroy();el.pause();el.removeAttribute('src');el.load();};
 // Source changes reload the stream; speed changes apply directly to the video.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[current.url,current.name,current.kind,film.id,film.sourceId]);
 const select=(choice:Episode)=>{if(episodeNavigation)onEpisodeSelect?.(choice);else setCurrent(choice);};
 const sequence=episodeNavigation?choices.filter(e=>!current.group||e.group===current.group):choices;const currentIndex=sequence.findIndex(e=>e.url===(episodeNavigation?current.pageUrl:current.url));const canNext=episodeNavigation?currentIndex>=0&&currentIndex+1<sequence.length:sequence.length>1;
 const next=()=>{if(canNext)select(sequence[(currentIndex+1)%sequence.length]);};
 return <div className="overlay" onClick={onClose}><section className="modal player" role="dialog" aria-modal="true" aria-label={film.title+'播放器'} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><h2>{film.title}</h2><p>{current.name} · {current.group||film.sourceName}</p></div><button className="icon" aria-label="关闭播放器" onClick={onClose}><X/></button></div>
 {embedded?<div className="embed-player" ref={embedBox}><iframe key={current.url} src={current.url} title={film.title+' '+current.name} sandbox="allow-scripts allow-same-origin allow-presentation" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onLoad={()=>setStatus('内嵌播放器（状态以画面为准）')} onError={()=>{setStatus('加载失败');setError('来源播放器暂时无法嵌入，请重试选集，或使用原站入口。');}}/></div>:<video ref={video} controls playsInline autoPlay onPlaying={()=>{setError('');setStatus('正在播放');}} onWaiting={()=>setStatus('正在缓冲…')} onError={()=>{setError('当前线路无法播放，请尝试其他线路或打开原站。');setStatus('播放失败');}}/>}
 <div className="playback-controls"><label>{episodeNavigation?'选集':'播放线路'}<select disabled={resolving} aria-label={episodeNavigation?'选集':'播放线路'} value={episodeNavigation?current.pageUrl:current.url} onChange={e=>{const found=choices.find(x=>x.url===e.target.value);if(found)select(found);}}>{choices.map((e,i)=><option key={e.url} value={e.url}>{episodeNavigation?[e.group,e.name].filter(Boolean).join(' · '):`${e.group||`线路 ${i+1}`} · ${e.name}`}</option>)}</select></label><button className="secondary" disabled={resolving||!canNext} onClick={next}><SkipForward size={15}/>{episodeNavigation?'下一集':'下一线路'}</button></div>
 <div className="player-foot">{embedded?<button className="secondary" onClick={()=>embedBox.current?.requestFullscreen?.().catch(()=>setStatus('全屏暂不可用'))}><Maximize size={14}/>全屏</button>:<label>播放速度<select aria-label="播放速度" value={rate} onChange={e=>{const value=Number(e.target.value);setRate(value);if(video.current)video.current.playbackRate=value;}}>{[0.5,0.75,1,1.25,1.5,2].map(x=><option key={x} value={x}>{x}×</option>)}</select></label>}<span className="playback-status" role="status">{resolving||status.includes('连接')||status.includes('缓冲')?<Loader2 size={12} className="spin"/>:<Play size={12}/>} {resolving?'正在连接选集…':status}</span><a href={film.url} target="_blank" rel="noreferrer">打开原站<ArrowUpRight size={15}/></a></div>
 {error&&<div className="playback-error" role="alert"><p>{error}</p>{choices.length>1&&<button className="secondary" onClick={next}>{episodeNavigation?'尝试下一集':'尝试下一线路'}<SkipForward size={14}/></button>}</div>}
 <p className="help">{embedded?'原站播放器在此页面内嵌显示；播放进度和倍速由来源播放器提供。若画面空白或无法播放，可重试选集或使用原站入口。':'视频直接从来源加载，不在本应用存储。可用性由来源及浏览器决定。'}</p></section></div>;
}
