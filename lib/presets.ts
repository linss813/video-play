import type {Source} from './media';
export const websitePresets:Source[]=[{id:'builtin:age',name:'AGE动漫 · age.tv',url:'https://www.agedm.io/',kind:'website',site:'age',enabled:true},{id:'builtin:mvffm',name:'Movieffm · 电影/剧集',url:'https://www.mvffm.net/home/',kind:'website',site:'mvffm',enabled:true}];
export function mergeWebsitePresets(current:Source[]){const ids=new Set(current.map(s=>s.id));return [...websitePresets.filter(s=>!ids.has(s.id)),...current];}
