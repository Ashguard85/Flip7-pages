/* Flip 7 Punkteblock v1: domain model shared by local/server frontends. */
export const VERSION = 'v1';
export const BACKUP_FORMAT = 'flip7-punkteblock-backup';
export const BONUS = [2,4,6,8,10];
// randomUUID() is HTTPS-only; Docker must remain usable on ordinary LAN HTTP.
export const uid = () => {
  if (typeof crypto.randomUUID==='function') return crypto.randomUUID();
  const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
  const h=[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
};
export const emptyData = () => ({profiles:[],games:[]});
export function newGame(ids) {return {id:uid(),playerIds:[...ids],rounds:[],status:'open',createdAt:new Date().toISOString(),finishedAt:null};}
export function newRound() {return {id:uid(),createdAt:new Date().toISOString(),scores:{}};}
export function pointsFor({numbers=[],plus=[],double=false,bust=false}) {
  if (bust) return 0;
  if (!Array.isArray(numbers) || numbers.length>7 || new Set(numbers).size!==numbers.length || !numbers.every(n=>Number.isInteger(n)&&n>=0&&n<=12)) throw new Error('Ungültige Zahlenkarten');
  if (!Array.isArray(plus) || new Set(plus).size!==plus.length || !plus.every(n=>BONUS.includes(n))) throw new Error('Ungültige Bonuskarten');
  return numbers.reduce((a,b)=>a+b,0)*(double?2:1)+plus.reduce((a,b)=>a+b,0)+(numbers.length===7?15:0);
}
export function cardScore(numbers,plus,double,bust){return {kind:'cards',numbers:[...numbers],plus:[...plus],double:!!double,bust:!!bust,points:pointsFor({numbers,plus,double,bust})};}
export function manualScore(points){let n=Number(points);if(!Number.isInteger(n)||n<0||n>500)throw new Error('0 bis 500 Punkte eingeben');return {kind:'manual',points:n};}
export function totals(game){const t=Object.fromEntries(game.playerIds.map(id=>[id,0]));for(const round of game.rounds)for(const id of game.playerIds)t[id]+=(round.scores[id]?.points??0);return t;}
export function roundComplete(game,round){return game.playerIds.every(id=>round.scores[id] && Number.isInteger(round.scores[id].points));}
export function winnerIds(game){const t=totals(game);let max=Math.max(...Object.values(t));return max>=200?game.playerIds.filter(id=>t[id]===max):[];}
export function gameStats(data){
 const stats=Object.fromEntries(data.profiles.map(p=>[p.id,{id:p.id,played:0,wins:0,points:0,rounds:0,busts:0,flips:0,best:0}]));
 for(const game of data.games.filter(g=>g.status==='finished')){
   const winners=winnerIds(game);
   for(const id of game.playerIds){const s=stats[id];if(!s)continue;s.played++;s.points+=(totals(game)[id]||0);if(winners.length===1&&winners[0]===id)s.wins++;
    for(const round of game.rounds){const score=round.scores[id];if(!score)continue;s.rounds++;s.best=Math.max(s.best,score.points);if(score.bust)s.busts++;if(score.kind==='cards'&&score.numbers.length===7&&!score.bust)s.flips++;}
   }
 }
 return stats;
}
export function safeMerge(a,b) {
 const out={profiles:[],games:[]};const conflicts=[];
 for(const k of ['profiles','games']) {
  const entries=new Map(a[k].map(x=>[x.id,structuredClone(x)]));
  for(const item of b[k]) {if(entries.has(item.id)&&JSON.stringify(entries.get(item.id))!==JSON.stringify(item))conflicts.push(`${k}:${item.id}`);else entries.set(item.id,structuredClone(item));}
  out[k]=[...entries.values()];
 }
 return {data:out,conflicts};
}
export function validateData(data){
 if(!data||!Array.isArray(data.profiles)||!Array.isArray(data.games)||data.profiles.length>200||data.games.length>2000)throw Error('Ungültige oder zu grosse Daten');
 const ids=new Set(); for(const p of data.profiles){if(!/^[-\w]{8,80}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60||ids.has(p.id))throw Error('Ungültiges Spielerprofil');ids.add(p.id);}
 const games=new Set();for(const g of data.games){if(!/^[-\w]{8,80}$/.test(g.id)||games.has(g.id)||!['open','finished'].includes(g.status)||!Array.isArray(g.playerIds)||g.playerIds.length<2||g.playerIds.length>8||new Set(g.playerIds).size!==g.playerIds.length||!g.playerIds.every(id=>ids.has(id))||!Array.isArray(g.rounds)||g.rounds.length>500)throw Error('Ungültige Partie');games.add(g.id);
  const roundIds=new Set();for(const r of g.rounds){if(!/^[-\w]{8,80}$/.test(r.id)||roundIds.has(r.id)||typeof r.scores!=='object'||!r.scores||Array.isArray(r.scores))throw Error('Ungültige Runde');roundIds.add(r.id);for(const [id,s] of Object.entries(r.scores)){if(!g.playerIds.includes(id)||!s||!Number.isInteger(s.points)||s.points<0||s.points>500||!['manual','cards'].includes(s.kind))throw Error('Ungültige Punkte');if(s.kind==='cards'&&s.points!==pointsFor(s))throw Error('Kartenpunkte stimmen nicht');}}
 }
 return true;
}
export function exportBackup(data){validateData(data);return {format:BACKUP_FORMAT,version:1,createdAt:new Date().toISOString(),data};}
export function parseBackup(x){if(x?.format!==BACKUP_FORMAT||x?.version!==1)throw Error('Unbekanntes Backupformat oder Version');validateData(x.data);return x.data;}
export const escapeHtml = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
