
'use strict';
const http=require('http'),crypto=require('crypto');
const PORT=process.env.PORT||3000,rooms=new Map();
const CATS=['Państwo','Miasto','Zwierzę','Imię','Zawód','Roślina','Rzecz','Postać fikcyjna','Marka samochodu'];
const LETTERS='ABCDEFGHIJKLMNOPRSTUWZ';
const DICTS={
'Państwo':'Polska Portugalia Peru Paragwaj Panama Pakistan Palau Austria Australia Albania Algieria Argentyna Armenia Andora Angola Belgia Białoruś Brazylia Bułgaria Boliwia Chile Chiny Chorwacja Czechy Dania Egipt Estonia Etiopia Finlandia Francja Grecja Gruzja Hiszpania Holandia Indie Indonezja Iran Irak Irlandia Islandia Izrael Japonia Kanada Kazachstan Kenia Kolumbia Kuba Litwa Łotwa Luksemburg Malta Maroko Meksyk Mongolia Niemcy Nepal Nigeria Norwegia Oman Rosja Rumunia Serbia Słowacja Słowenia Szwajcaria Szwecja Turcja Ukraina Urugwaj USA Węgry Wietnam Włochy Zambia Zimbabwe',
'Miasto':'Warszawa Kraków Wrocław Poznań Gdańsk Gdynia Szczecin Bydgoszcz Toruń Lublin Rzeszów Zamość Katowice Kielce Łódź Opole Olsztyn Białystok Radom Tarnów Przemyśl Krosno Sanok Sopot Gliwice Zabrze Bytom Tychy Sosnowiec Częstochowa Zakopane Paryż Londyn Berlin Rzym Madryt Praga Oslo Dublin Ateny Wiedeń Wilno Amsterdam Barcelona Helsinki Tokio',
'Zwierzę':'kot pies krowa koń koza kura królik krokodyl kangur zebra żaba żyrafa żubr wilk wiewiórka wielbłąd lew lis lama łoś niedźwiedź nosorożec mysz małpa mrówka motyl słoń sarna sowa sokół struś ryba rekin rak foka panda papuga pingwin puma dzik delfin dzięcioł indyk jaguar jeż orzeł owca osa antylopa aligator bocian bóbr baran bażant tygrys',
'Imię':'Adam Adrian Agnieszka Agata Aleksandra Aleksander Alicja Anna Antoni Barbara Bartosz Beata Celina Dawid Dominik Dorota Ewa Emilia Filip Franciszek Gabriela Grzegorz Hanna Helena Hubert Igor Iga Irena Jan Jacek Jakub Joanna Julia Kacper Karol Katarzyna Kinga Krystian Krzysztof Laura Lena Leon Łukasz Maciej Magdalena Maja Marcel Marcin Marek Maria Marta Mateusz Michał Monika Natalia Nikola Oliwia Oskar Paweł Patryk Piotr Rafał Robert Roman Sebastian Szymon Tomasz Urszula Weronika Wiktoria Wojciech Zofia Zuzanna',
'Zawód':'aktor architekt bibliotekarz budowlaniec cukiernik dentysta dziennikarz elektryk fotograf fryzjer grafik hydraulik informatyk inżynier kelner kierowca kucharz księgowy lekarz listonosz malarz mechanik nauczyciel ogrodnik piekarz pielęgniarka pilot policjant prawnik programista psycholog rolnik ratownik spawacz sprzedawca strażak stolarz szewc trener weterynarz żołnierz',
'Roślina':'akacja aloes azalia bambus bazylia begonia brzoza buk cebula chaber dąb fiołek fikus goździk grab hiacynt hortensja irys jabłoń jaśmin jodła kaktus klon konwalia krokus lawenda lipa lilia mak magnolia mięta narcyz orchidea paproć pokrzywa róża rumianek sosna stokrotka świerk tulipan wierzba wrzos żonkil',
'Rzecz':'aparat autobus balon butelka biurko czajnik długopis drzwi ekran fotel garnek gitara grzebień igła kabel kalendarz kanapa kapelusz klucz komputer kosz krzesło książka kubek lampa lodówka lustro łóżko młotek monitor nożyczki okulary ołówek parasol plecak poduszka pralka radio rower samolot skarpeta stół szafa telefon telewizor torba zegar zeszyt',
'Postać fikcyjna':'Batman Superman Spider-Man Shrek Fiona Elsa Anna Olaf Harry Potter Hermiona Ron Voldemort Gandalf Frodo Gollum Yoda Pikachu Naruto Goku Sonic Mario Luigi Wednesday Barbie Ken Pinokio Kopciuszek Ariel Mulan Aladyn Simba Mufasa Stitch Minion Gru',
'Marka samochodu':'Audi BMW Mercedes Volkswagen Toyota Honda Hyundai Kia Ford Fiat Ferrari Lamborghini Porsche Peugeot Renault Citroen Opel Skoda Seat Volvo Saab Subaru Suzuki Mazda Mitsubishi Nissan Lexus Tesla Jeep Dodge Chrysler Chevrolet Cadillac Buick Lincoln Jaguar Land Rover Mini Bentley Rolls-Royce Aston Martin Maserati Alfa Romeo Lancia Dacia Daewoo Polonez Trabant Wartburg Smart Bugatti McLaren Pagani Koenigsegg'};
const norm=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/\s+/g,' ');
const dict=Object.fromEntries(Object.entries(DICTS).map(([k,v])=>[k,new Set(v.split(' ').map(norm))]));
const uid=()=>crypto.randomBytes(12).toString('hex');
const clean=(s,n=60)=>String(s||'').trim().slice(0,n);
const limit=(n,a,b,d)=>Number.isFinite(+n)?Math.min(b,Math.max(a,Math.round(+n))):d;
function notify(r){r.rev++;for(const res of r.listeners){try{res.write('data: '+r.rev+'\n\n')}catch{r.listeners.delete(res)}}}
function person(r,t){return r.players.find(p=>p.token===t)}
function valid(r,c,a){a=norm(a);return !a?'empty':a[0]!==norm(r.letter)?'wrong':dict[c]?.has(a)?'valid':'review'}
function rows(r,c){let count={};for(const p of r.players){let a=norm(p.answers[c]);if(a)count[a]=(count[a]||0)+1}return r.players.map(p=>{const a=p.answers[c]||'',v=valid(r,c,a),duplicate=(count[norm(a)]||0)>1,others=r.players.some(x=>x!==p&&x.answers[c]);const suggested=v==='valid'?(duplicate?5:others?10:15):0;return {id:p.id,name:p.name,answer:a,valid:v,duplicate,points:r.points[r.round]?.[c]?.[p.id]??suggested}})}
function totals(r){return r.players.map(p=>{let correct=0,possible=r.history.length*r.cats.length,times=[];for(const h of r.history){const x=h.players.find(x=>x.id===p.id);if(x){correct+=Object.values(x.points).filter(v=>v>0).length;if(x.stop)times.push(Math.round((x.stop-h.start)/1000))}}return {name:p.name,total:p.total,correct,possible,percent:possible?Math.round(correct/possible*100):0,speed:times.length?Math.round(times.reduce((a,b)=>a+b)/times.length):null}}).sort((a,b)=>b.total-a.total||(a.speed??Infinity)-(b.speed??Infinity))}
function state(r,t){const p=person(r,t);return {rev:r.rev,code:r.code,phase:r.phase,host:r.players[0]===p,me:p.id,players:r.players.map(x=>({id:x.id,name:x.name,total:x.total})),cats:r.cats,round:r.round,rounds:r.rounds,roundTime:r.roundTime,stopTime:r.stopTime,letter:r.letter,deadline:r.deadline,stopper:r.stopper,answers:p.answers,locked:!!p.stop,idx:r.idx,review:r.phase==='review'?rows(r,r.cats[r.idx]):[],history:r.history,final:r.phase==='final'?totals(r):null}}
function begin(r){r.round++;r.phase='play';r.letter=LETTERS[crypto.randomInt(LETTERS.length)];r.start=Date.now();r.deadline=r.start+r.roundTime*1000;r.stopper='';r.idx=0;r.points[r.round]={};for(const p of r.players){p.answers={};p.stop=0}notify(r)}
function finishRound(r){const ps=r.players.map(p=>{const pts={};for(const c of r.cats){pts[c]=rows(r,c).find(x=>x.id===p.id).points;p.total+=pts[c]}return {id:p.id,name:p.name,answers:{...p.answers},points:pts,stop:p.stop}});r.history.push({letter:r.letter,start:r.start,players:ps});r.phase='between';r.deadline=0;notify(r)}
setInterval(()=>{for(const r of rooms.values()){if(r.phase==='play'&&Date.now()>=r.deadline){r.phase='review';r.idx=0;notify(r)}}},400).unref();
function reply(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
async function input(req){let s='';for await(const c of req){s+=c;if(s.length>100000)throw Error('Za dużo danych')}return JSON.parse(s||'{}')}
async function api(req,res,url){try{const b=req.method==='POST'?await input(req):Object.fromEntries(url.searchParams),op=url.pathname.slice(5);let r,p;if(op==='create'){const name=clean(b.name,24);if(!name)throw Error('Wpisz nick');const cats=[...new Set((b.cats||[]).filter(x=>CATS.includes(x)))];if(!cats.length)throw Error('Wybierz kategorie');let code;do{code=crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase()}while(rooms.has(code));const token=uid();r={code,phase:'lobby',players:[{id:uid(),token,name,total:0,answers:{},stop:0}],cats,round:0,rounds:limit(b.rounds,1,20,5),roundTime:limit(b.roundTime,30,600,120),stopTime:limit(b.stopTime,5,90,15),letter:'',deadline:0,stopper:'',idx:0,points:{},history:[],listeners:new Set(),rev:0};rooms.set(code,r);return reply(res,200,{code,token})}
if(op==='join'){r=rooms.get(clean(b.code).toUpperCase());if(!r)throw Error('Nie ma takiego pokoju');if(r.phase!=='lobby')throw Error('Gra już się rozpoczęła');if(r.players.length>=12)throw Error('Pokój pełny');const name=clean(b.name,24);if(!name)throw Error('Wpisz nick');if(r.players.some(x=>norm(x.name)===norm(name)))throw Error('Nick zajęty');const token=uid();r.players.push({id:uid(),token,name,total:0,answers:{},stop:0});notify(r);return reply(res,200,{code:r.code,token})}
r=rooms.get(clean(b.code).toUpperCase());if(!r)throw Error('Pokój nie istnieje');p=person(r,b.token);if(!p)throw Error('Brak dostępu do pokoju');const host=r.players[0]===p;
if(op==='state')return reply(res,200,state(r,b.token));
if(op==='events'){res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache','Connection':'keep-alive'});res.write('data: '+r.rev+'\n\n');r.listeners.add(res);req.on('close',()=>r.listeners.delete(res));return}
if(op==='start'){if(!host||!['lobby','between'].includes(r.phase)||r.round>=r.rounds)throw Error('Nie można teraz rozpocząć');begin(r)}
else if(op==='answer'){if(r.phase!=='play'||p.stop||Date.now()>=r.deadline)throw Error('Odpowiedzi zablokowane');if(!r.cats.includes(b.cat))throw Error('Nieznana kategoria');p.answers[b.cat]=clean(b.value);notify(r)}
else if(op==='stop'){if(r.phase!=='play'||Date.now()>=r.deadline||p.stop)throw Error('STOP niedostępny');if(!r.cats.every(c=>clean(p.answers[c])))throw Error('Wypełnij wszystkie pola');p.stop=Date.now();if(!r.stopper){r.stopper=p.name;r.deadline=Math.min(r.deadline,Date.now()+r.stopTime*1000)}notify(r)}
else if(op==='score'){if(!host||r.phase!=='review')throw Error('Tylko gospodarz ocenia');if(!r.players.some(x=>x.id===b.id)||![0,5,10,15].includes(+b.value))throw Error('Błędne punkty');const cat=r.cats[r.idx];r.points[r.round][cat]??={};r.points[r.round][cat][b.id]=+b.value;notify(r)}
else if(op==='next'){if(!host||r.phase!=='review')throw Error('Tylko gospodarz zatwierdza');if(r.idx<r.cats.length-1){r.idx++;notify(r)}else finishRound(r)}
else if(op==='finish'){if(!host||!['between','lobby'].includes(r.phase))throw Error('Najpierw zakończ rundę');r.phase='final';notify(r)}
else throw Error('Nieznana operacja');reply(res,200,{ok:true})}catch(e){reply(res,400,{error:e.message||'Błąd serwera'})}}

const PAGE = String.raw`
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Debile kontra Kapusty</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(ellipse at top,#2b394e,#0c1321 70%);color:#f3f7ff;font:16px system-ui,sans-serif}
main{max-width:920px;margin:auto;padding:24px 14px 60px}
header{text-align:center;margin-bottom:26px}
.top{color:#9aebd1;font-weight:900;letter-spacing:3px;font-size:12px}
h1{font-size:clamp(35px,8vw,65px);line-height:1.06;margin:14px 0}
h1 span,.mint{color:#9aebd1}
h2{margin:0 0 15px;font-size:23px}
p{line-height:1.55}
.muted{color:#b3c1d4}
.card{background:linear-gradient(135deg,#223047,#182235);border:1px solid #3c4d65;border-radius:24px;padding:clamp(16px,4vw,28px);margin:15px 0;box-shadow:0 18px 45px #0004}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.label{font-size:12px;font-weight:900;color:#9aebd1;letter-spacing:2px;text-transform:uppercase}
label{display:block;margin:14px 0 7px;font-weight:700}
input,select{background:#101a2c;border:1px solid #53647e;border-radius:12px;color:#fff;padding:13px;width:100%;font:inherit}
button{border:1px solid #53647e;background:#2c3b53;color:white;padding:13px 17px;border-radius:14px;font:inherit;font-weight:800;cursor:pointer;min-height:46px}
button.primary{background:#9aebd1;color:#102735;border-color:#9aebd1}
button.stop{background:#ffb4c2;color:#3a1d28;border-color:#ffb4c2}
button:disabled{opacity:.5;cursor:default}
.wide{width:100%;margin-top:15px}
.check{display:inline-flex;align-items:center;gap:7px;border:1px solid #455570;background:#2a3950;padding:9px 11px;border-radius:30px;margin:4px;font-size:14px}
.check input{width:auto}
.chip{display:inline-block;padding:9px 12px;margin:4px;border:1px solid #465671;border-radius:22px;background:#2a3950}
.code{font-size:clamp(28px,7vw,44px);letter-spacing:4px;color:#9aebd1;font-weight:900}
.letter{font-size:65px;font-weight:900;color:#9aebd1}
.timer{font-size:clamp(40px,9vw,65px);font-weight:900;color:#ffd68f;font-variant-numeric:tabular-nums}
.alert{background:#522b3b;border:1px solid #ac5b75;color:#ffcedc;padding:13px;border-radius:12px;margin:14px 0}
.info{background:#17263b;border:1px solid #455671;padding:13px;border-radius:12px;color:#c0cee1;margin:15px 0}
.answer{margin:14px 0}
.scroll{overflow:auto}
table{border-collapse:collapse;width:100%;min-width:430px}
th,td{padding:12px 8px;text-align:left;border-bottom:1px solid #40506a}
th{font-size:12px;color:#b7c5d8}
td select{min-width:90px;padding:8px}
.good{color:#9aebd1}
.bad{color:#ffb4c2}
.maybe{color:#ffd68f}
.winner{font-size:28px;color:#ffd68f;font-weight:900}
footer{text-align:center;color:#8c9bb2;margin:35px}
.hidden{display:none}
#error{position:sticky;top:8px;z-index:10}
@media(max-width:570px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<main>
<header>
<div class="top">ZBIERZ EKIPĘ I GRAJ</div>
<h1>Debile <span>kontra</span><br>Kapusty 🥬</h1>
<p class="muted">Państwa–Miasta po swojemu. Stwórz pokój, wyślij kod, krzycz STOP i wygrywaj!</p>
</header>
<div id="error" class="alert hidden"></div>
<div id="app"></div>
<footer>Debile kontra Kapusty • Do 12 graczy</footer>
</main>
<script>
const CATS=['Państwo','Miasto','Zwierzę','Imię','Zawód','Roślina','Rzecz','Postać fikcyjna','Marka samochodu'];
let session=null,S=null,stream=null,poll=null,tick=null;
const el=id=>document.getElementById(id),app=el('app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function error(s){el('error').textContent=s;el('error').classList.remove('hidden');setTimeout(()=>el('error').classList.add('hidden'),6000)}
async function api(op,b={}){
  let r;
  try{r=await fetch('/api/'+op,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...b,...(session||{})})})}
  catch{throw Error('Brak połączenia z serwerem')}
  const j=await r.json();
  if(!r.ok)throw Error(j.error||'Błąd serwera');
  return j;
}
async function action(op,b={}){
  try{await api(op,b);await refresh()}
  catch(x){error(x.message)}
}
function home(){
  S=null;
  app.innerHTML='<div class="grid"><section class="card"><div class="label">NOWA GRA</div><h2>Utwórz pokój</h2><label>Twój nick</label><input id="newname" maxlength="24" placeholder="Np. Kapusta123"><label>Liczba rund</label><select id="rounds"><option>3</option><option selected>5</option><option>10</option><option>15</option><option>20</option></select><label>Czas rundy</label><select id="roundtime"><option value="60">1 minuta</option><option value="90">1,5 minuty</option><option value="120" selected>2 minuty</option><option value="180">3 minuty</option><option value="300">5 minut</option></select><label>Odliczanie po STOP</label><select id="stoptime"><option>10</option><option selected>15</option><option>20</option><option>30</option><option>45</option></select><label>Kategorie</label><div id="categories"></div><button class="primary wide" id="create">UTWÓRZ POKÓJ</button></section><section class="card"><div class="label">DOŁĄCZ DO EKIPY</div><h2>Wejdź do pokoju</h2><label>Twój nick</label><input id="joinname" maxlength="24" placeholder="Twój nick"><label>Kod pokoju</label><input id="joincode" maxlength="6" placeholder="ABC123"><button class="primary wide" id="join">DOŁĄCZ</button><div class="info">Do 12 osób w jednym pokoju. Gospodarz wybiera kategorie i ocenia odpowiedzi, a wszyscy widzą wyniki na żywo.</div></section></div>';
  el('categories').innerHTML=CATS.map((c,i)=>'<label class="check"><input type="checkbox" value="'+esc(c)+'" '+(i<5?'checked':'')+'>'+esc(c)+'</label>').join('');
  el('create').onclick=async()=>{
    const cats=[...el('categories').querySelectorAll('input:checked')].map(x=>x.value);
    try{
      const j=await api('create',{name:el('newname').value,cats,rounds:+el('rounds').value,roundTime:+el('roundtime').value,stopTime:+el('stoptime').value});
      connect(j);
    }catch(x){error(x.message)}
  };
  el('join').onclick=async()=>{
    try{connect(await api('join',{name:el('joinname').value,code:el('joincode').value.toUpperCase()}))}
    catch(x){error(x.message)}
  };
}
function connect(j){
  session={code:j.code,token:j.token};
  sessionStorage.setItem('dk-session',JSON.stringify(session));
  if(stream)stream.close();
  stream=new EventSource('/api/events?code='+encodeURIComponent(session.code)+'&token='+encodeURIComponent(session.token));
  stream.onmessage=()=>refresh();
  stream.onerror=()=>{};
  if(poll)clearInterval(poll);
  poll=setInterval(refresh,3000);
  refresh();
}
async function refresh(){
  if(!session)return;
  try{
    const next=await api('state');
    const changed=!S||next.phase!==S.phase||(next.phase!=='play'&&next.rev!==S.rev);
    S=next;
    if(changed)render();
    clock();
  }catch(x){
    if(x.message==='Pokój nie istnieje'||x.message==='Brak dostępu do pokoju'){
      sessionStorage.removeItem('dk-session');
      session=null;
      if(stream)stream.close();
      if(poll)clearInterval(poll);
      home();
    }else error(x.message);
  }
}
function shell(title,body){
  app.innerHTML='<section class="card"><div class="row"><div><div class="label">POKÓJ</div><div class="code">'+esc(S.code)+'</div></div><div><div class="label">RUNDA</div><strong>'+S.round+' / '+S.rounds+'</strong></div></div><p class="muted">'+S.players.map(p=>esc(p.name)+' ('+p.total+' pkt)').join(' • ')+'</p></section><section class="card"><h2>'+title+'</h2>'+body+'</section>';
}
function render(){
  if(!S)return;
  if(S.phase==='lobby'){
    shell('Poczekalnia','<p>Wyślij znajomym kod pokoju. Graczy: '+S.players.length+'/12</p><p>'+S.players.map(p=>'<span class="chip">'+esc(p.name)+'</span>').join('')+'</p><p class="muted">Kategorie: '+S.cats.map(esc).join(', ')+'</p>'+(S.host?'<button class="primary wide" id="start">ROZPOCZNIJ GRĘ</button>':'<div class="info">Czekamy, aż gospodarz rozpocznie grę.</div>'));
    if(S.host)el('start').onclick=()=>action('start');
  }else if(S.phase==='play'){
    let body='<div class="row"><div><div class="label">Wylosowana litera</div><div class="letter">'+esc(S.letter)+'</div></div><div><div class="label">Pozostały czas</div><div class="timer" id="timer">--:--</div></div></div>';
    if(S.stopper)body+='<div class="alert">STOP nacisnął(a): '+esc(S.stopper)+'! Trwa końcowe odliczanie.</div>';
    if(S.locked)body+='<div class="info">Twoje odpowiedzi zostały zablokowane po STOP.</div>';
    body+=S.cats.map((c,i)=>'<div class="answer"><label>'+esc(c)+'</label><input class="ans" data-i="'+i+'" maxlength="60" '+(S.locked?'disabled':'')+' value="'+esc(S.answers[c]||'')+'" placeholder="Odpowiedź na '+esc(S.letter)+'"></div>').join('');
    body+='<button class="stop wide" id="stop" '+(S.locked?'disabled':'')+'>STOP! ZAKOŃCZYŁEM/AM</button><p class="muted">STOP można nacisnąć po wypełnieniu wszystkich pól. Pozostali gracze mają jeszcze wybrany czas na dokończenie.</p>';
    shell('Wpisuj odpowiedzi!',body);
    for(const inp of document.querySelectorAll('.ans')){
      inp.oninput=()=>{
        const cat=S.cats[+inp.dataset.i],value=inp.value;
        S.answers[cat]=value;
        clearTimeout(inp._save);
        inp._save=setTimeout(()=>action('answer',{cat,value}),250);
      };
    }
    el('stop').onclick=async()=>{
      try{
        const inputs=[...document.querySelectorAll('.ans')];
        for(const inp of inputs){
          await api('answer',{cat:S.cats[+inp.dataset.i],value:inp.value});
        }
        await action('stop');
      }catch(x){error(x.message)}
    };
    clock();
  }else if(S.phase==='review'){
    const cat=S.cats[S.idx];
    let body='<div class="label">KATEGORIA '+(S.idx+1)+' Z '+S.cats.length+'</div><h2>'+esc(cat)+'</h2><p class="muted">Wszyscy widzą odpowiedzi i punkty. Gospodarz może zmieniać oceny.</p><div class="scroll"><table><thead><tr><th>Gracz</th><th>Odpowiedź</th><th>Ocena</th><th>Punkty</th></tr></thead><tbody>';
    for(const x of S.review){
      const status=x.valid==='valid'?'Słownik ✓':x.valid==='wrong'?'Zła litera':x.valid==='empty'?'Puste':'Do sprawdzenia';
      body+='<tr><td>'+esc(x.name)+'</td><td>'+esc(x.answer||'—')+'</td><td class="'+(x.valid==='valid'?'good':x.valid==='review'?'maybe':'bad')+'">'+status+(x.duplicate?' • Powtórka':'')+'</td><td>';
      if(S.host)body+='<select class="score" data-id="'+esc(x.id)+'">'+[0,5,10,15].map(v=>'<option value="'+v+'" '+(x.points===v?'selected':'')+'>'+v+' pkt</option>').join('')+'</select>';
      else body+='<strong>'+x.points+' pkt</strong>';
      body+='</td></tr>';
    }
    body+='</tbody></table></div>';
    if(S.host)body+='<button class="primary wide" id="next">'+(S.idx===S.cats.length-1?'ZATWIERDŹ RUNDĘ':'ZATWIERDŹ I NASTĘPNA KATEGORIA')+'</button>';
    else body+='<div class="info">Gospodarz ocenia odpowiedzi. Zmiany punktów zobaczysz na żywo.</div>';
    shell('Wspólne ocenianie',body);
    for(const sel of document.querySelectorAll('.score'))sel.onchange=()=>action('score',{id:sel.dataset.id,value:+sel.value});
    if(S.host)el('next').onclick=()=>action('next');
  }else if(S.phase==='between'){
    let body='<div class="label">RANKING</div><div class="scroll"><table><thead><tr><th>Miejsce</th><th>Gracz</th><th>Punkty</th></tr></thead><tbody>';
    [...S.players].sort((a,b)=>b.total-a.total).forEach((p,i)=>body+='<tr><td>'+(i+1)+'</td><td>'+esc(p.name)+'</td><td>'+p.total+'</td></tr>');
    body+='</tbody></table></div>';
    if(S.host)body+=(S.round<S.rounds?'<button class="primary wide" id="start">NASTĘPNA RUNDA</button>':'')+'<button class="wide" id="finish">ZAKOŃCZ CAŁĄ GRĘ</button>';
    else body+='<div class="info">Czekamy na decyzję gospodarza.</div>';
    shell('Koniec rundy!',body);
    if(S.host){
      if(el('start'))el('start').onclick=()=>action('start');
      el('finish').onclick=()=>action('finish');
    }
  }else if(S.phase==='final'){
    const rank=S.final||[];
    let body=rank.length?'<div class="winner">🏆 Wygrywa '+esc(rank[0].name)+'!</div><p class="muted">Zdobyte punkty: '+rank[0].total+'</p>':'';
    body+='<div class="scroll"><table><thead><tr><th>#</th><th>Gracz</th><th>Punkty</th><th>Poprawne</th><th>Śr. STOP</th></tr></thead><tbody>';
    rank.forEach((p,i)=>body+='<tr><td>'+(i+1)+'</td><td>'+esc(p.name)+'</td><td>'+p.total+'</td><td>'+p.percent+'%</td><td>'+(p.speed===null?'—':p.speed+' s')+'</td></tr>');
    body+='</tbody></table></div><p class="muted">Procent poprawnych odpowiedzi jest obliczany na podstawie przyznanych punktów. Średni czas STOP pokazuje szybkość graczy, którzy nacisnęli STOP.</p><button class="primary wide" id="again">NOWA GRA</button>';
    shell('Podsumowanie całej gry',body);
    el('again').onclick=()=>{
      sessionStorage.removeItem('dk-session');
      session=null;
      if(stream)stream.close();
      if(poll)clearInterval(poll);
      home();
    };
  }
}
function clock(){
  const t=el('timer');
  if(!t||!S||S.phase!=='play')return;
  const sec=Math.max(0,Math.ceil((S.deadline-Date.now())/1000));
  t.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
}
tick=setInterval(clock,250);
try{
  const saved=sessionStorage.getItem('dk-session');
  if(saved)connect(JSON.parse(saved));
  else home();
}catch{home()}
</script>
</body>
</html>
`;

const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
    api(req,res,url);
    return;
  }
  if(url.pathname==='/'||url.pathname==='/index.html'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(PAGE);
    return;
  }
  res.writeHead(404);
  res.end('Nie znaleziono');
});

server.listen(PORT,'0.0.0.0',()=>{
  console.log('Debile kontra Kapusty działa na porcie '+PORT);
});
