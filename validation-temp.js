
(async function(){
 const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
 const fmt=n=>Number(n||0).toLocaleString('en-US');
 const fmtMonth=m=>new Date(m+'-01T00:00:00').toLocaleDateString('en-US',{month:'short',year:'2-digit'});
 const sidebar=$('#sidebar'),overlay=$('#overlay'),toast=$('#toast');
 let granularity='Monthly',compare=true, dailyData=null, territoryData=null;
 function notify(msg){toast.textContent=msg;toast.classList.add('show');window.setTimeout(()=>toast.classList.remove('show'),2600)}
 function closeMenu(){sidebar.classList.remove('open');overlay.classList.remove('show')}
 $('#menuBtn').addEventListener('click',()=>{sidebar.classList.toggle('open');overlay.classList.toggle('show')});
 overlay.addEventListener('click',closeMenu);
 $$('.nav a').forEach(a=>a.addEventListener('click',e=>{
   e.preventDefault();$$('.nav a').forEach(n=>n.classList.remove('active'));a.classList.add('active');
   const page=a.dataset.page;$('#pageTitle').innerHTML='YourPass <span>'+page+'</span>';closeMenu();
   if(page==='Export Reports'){notify('Export will be available in a later phase.');}
   else if(page==='Data Management'){notify('Static source files are stored in the repository.');}
   else if(page==='Country Analytics'){document.querySelector('#countries').scrollIntoView({behavior:'smooth',block:'start'});}
   else if(page==='Overview'){window.scrollTo({top:0,behavior:'smooth'});}
   else {notify(page+' uses currently loaded static data where supported.');}
 }));
 $$('.segmented button').forEach(b=>b.addEventListener('click',()=>{$$('.segmented button').forEach(n=>n.classList.remove('active'));b.classList.add('active');granularity=b.dataset.granularity;$('#chartGranularity').value=granularity;renderAll()}));
 $('#chartGranularity').addEventListener('change',e=>{$$('.segmented button').forEach(n=>n.classList.toggle('active',n.dataset.granularity===e.target.value));granularity=e.target.value;renderAll()});
 $('#compareSwitch').addEventListener('click',()=>{compare=!compare;$('#compareSwitch').classList.toggle('on',compare);$('#compareSwitch').setAttribute('aria-checked',String(compare));renderAll()});
 $('#period').addEventListener('change',e=>{
   const now=new Date(),fmtDate=d=>d.toISOString().slice(0,10);
   if(e.target.value==='Current Month'){const d=new Date(now.getFullYear(),now.getMonth(),1);$('#dateFrom').value=fmtDate(d);$('#dateTo').value=fmtDate(now)}
   else if(e.target.value==='Last 3 Months'){const d=new Date(now.getFullYear(),now.getMonth()-2,1);$('#dateFrom').value=fmtDate(d);$('#dateTo').value=fmtDate(now)}
   else if(e.target.value==='From Beginning'){$('#dateFrom').value=dailyData?.startDate||'';$('#dateTo').value=dailyData?.endDate||fmtDate(now)}
 });
 function selectedYears(){return Array.from($('#years').selectedOptions).map(o=>o.value)}
 function getFilteredDaily(){
   if(!dailyData) return [];
   const start=$('#dateFrom').value||dailyData.startDate, end=$('#dateTo').value||dailyData.endDate;
   const platform=$('#platform').value;
   if(platform==='Android') return [];
   const out=[];
   const startD=new Date(dailyData.startDate+'T00:00:00Z');
   for(let i=0;i<dailyData.values.total.length;i++){
     const d=new Date(startD);d.setUTCDate(d.getUTCDate()+i);
     const date=d.toISOString().slice(0,10);
     if(date<start||date>end)continue;
     const year=date.slice(0,4);
     const years=selectedYears();
     if(years.length&&!years.includes(year))continue;
     out.push({date,total:dailyData.values.total[i],firstTime:dailyData.values.firstTime[i],redownloads:dailyData.values.redownloads[i]});
   }
   return out;
 }
 function aggregate(daily, gran){
   const map=new Map();
   daily.forEach(r=>{
     const key=gran==='Daily'?r.date:gran==='Yearly'?r.date.slice(0,4):r.date.slice(0,7);
     if(!map.has(key))map.set(key,{period:key,total:0,firstTime:0,redownloads:0});
     const v=map.get(key);v.total+=r.total;v.firstTime+=r.firstTime;v.redownloads+=r.redownloads;
   });
   return [...map.values()].sort((a,b)=>a.period.localeCompare(b.period));
 }
 function drawTrend(rows){
   const canvas=$('#downloadsChart');if(!canvas)return;
   if($('#platform').value==='Android'){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.font='13px system-ui';ctx.fillStyle='#87948b';ctx.textAlign='center';ctx.fillText('Android data has not been loaded',Math.max(140,canvas.width/(window.devicePixelRatio||1)/2),100);return;}
   const rect=canvas.getBoundingClientRect(),w=Math.max(280,rect.width||650),h=220,dpr=window.devicePixelRatio||1;
   canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
   const pad={l:38,r:8,t:14,b:48},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
   const vals=rows.map(x=>x.total),max=Math.max(1,...vals),barGap=rows.length>35?2:7,barW=Math.max(2,Math.min(28,(cw/Math.max(rows.length,1))-barGap));
   ctx.font='10px system-ui';ctx.strokeStyle='#e8eee9';ctx.fillStyle='#7b897f';ctx.textAlign='right';
   for(let i=0;i<=4;i++){const y=pad.t+ch*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(fmt(Math.round(max*(4-i)/4)),pad.l-6,y+3)}
   rows.forEach((r,i)=>{const x=pad.l+(i+.5)*cw/rows.length-barW/2, bh=r.total/max*ch;ctx.fillStyle='#11964f';ctx.fillRect(x,pad.t+ch-bh,barW,bh);if(rows.length<=18){ctx.save();ctx.translate(x+barW/2,h-pad.b+10);ctx.rotate(-Math.PI/4);ctx.textAlign='right';ctx.fillStyle='#718078';ctx.fillText(granularity==='Daily'?r.period.slice(5):granularity==='Yearly'?r.period:fmtMonth(r.period),0,0);ctx.restore()}});
 }
 function drawMonthlyTable(rows){
   const tbody=document.querySelector('.data-table tbody');
   if(!tbody)return;
   tbody.innerHTML=rows.slice(-24).reverse().map(r=>'<tr><td>'+r.period+'</td><td class="muted-value">Pending</td><td>'+fmt(r.total)+'</td><td>'+fmt(r.total)+'</td></tr>').join('')||'<tr><td class="table-empty" colspan="4">No data for selected period</td></tr>';
   const headers=document.querySelector('.data-table thead');
   if(headers)headers.innerHTML='<tr><th>Period</th><th>Android</th><th>iOS</th><th>Total available*</th></tr>';
   tbody.querySelectorAll('.muted-value').forEach(td=>td.style.color='#a1aaa3');
 }
 function renderKpis(daily){
   const androidOnly=$('#platform').value==='Android';
   const total=daily.reduce((s,r)=>s+r.total,0),first=daily.reduce((s,r)=>s+r.firstTime,0),redownloads=daily.reduce((s,r)=>s+r.redownloads,0);
   $('#kpiTotal').textContent=androidOnly?'Pending':fmt(total);$('#kpiTotal').classList.toggle('loaded',!androidOnly);
   $('#kpiIOS').textContent=$('#platform').value==='Android'?'Not selected':fmt(total);$('#kpiIOS').classList.toggle('loaded',$('#platform').value!=='Android');
   $('#kpiFirstTime').textContent=androidOnly?'Not selected':fmt(first);$('#kpiFirstTime').classList.toggle('loaded',!androidOnly);
   $('#metricIOS').textContent=androidOnly?'Not selected':fmt(total);$('#metricIOS').style.color=androidOnly?'#9aa69e':'var(--green)';
   const redown=$('#metricRedownloads');if(redown){redown.textContent=androidOnly?'Not selected':fmt(redownloads);redown.style.color=androidOnly?'#9aa69e':'var(--green)';}
   $('#kpiTotalFoot').textContent=androidOnly?'Android file not loaded':'iOS only · Android pending';
   $('#kpiAndroid').textContent='Pending';
 }
 function refreshChips(){
   const platform=$('#platform').value,period=$('#period').value,from=$('#dateFrom').value,to=$('#dateTo').value,years=selectedYears();
   const fmtDate=s=>s?new Date(s+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'All';
   const chips=[platform,period,(from||to)?fmtDate(from)+' – '+fmtDate(to):'All dates',years.length?'Years: '+years.join(', '):'All years',granularity,'Compare '+(compare?'on':'off')];
   $('#activeFilters').innerHTML=chips.map(x=>'<span class="chip">'+x.replaceAll('&','&amp;').replaceAll('<','&lt;')+'</span>').join('');
 }
 function renderAll(){
   if(!dailyData)return;
   const raw=getFilteredDaily(),rows=aggregate(raw,granularity);
   renderKpis(raw);drawTrend(rows);drawMonthlyTable(aggregate(raw,'Monthly'));refreshChips();
   const total=raw.reduce((s,r)=>s+r.total,0);
   const subtitle=document.querySelector('.heading p');
   if(subtitle)subtitle.textContent='App Performance & Device Insights · Jordan · iOS source data loaded';
   const chartDesc=document.querySelector('#downloadsChart')?.parentElement;
   if(chartDesc && !raw.length){const ctx=$('#downloadsChart').getContext('2d');ctx.clearRect(0,0,$('#downloadsChart').width,$('#downloadsChart').height);ctx.font='13px system-ui';ctx.fillStyle='#87948b';ctx.textAlign='center';ctx.fillText($('#platform').value==='Android'?'Android data has not been loaded':'No data for the selected filters',Math.max(140,$('#downloadsChart').width/2),105);}
   const rank=$('#topPeriods');
   if(rank){const top=[...aggregate(raw,'Monthly')].sort((a,b)=>b.total-a.total).slice(0,5);rank.className='empty-ranking';rank.innerHTML=top.length?top.map((r,i)=>'<div style="display:flex;justify-content:space-between;width:100%;padding:7px 0;border-bottom:1px solid #eef2ef"><span>'+fmtMonth(r.period)+'</span><strong>'+fmt(r.total)+'</strong></div>').join(''):'No periods available.';}
 }
 function renderCountries(){
   if(!territoryData)return;
   const active=territoryData.countries.filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
   const select=$('#countrySelect');select.innerHTML=active.map(c=>'<option value="'+c.name.replaceAll('"','&quot;')+'">'+c.name+'</option>').join('');
   const top=active.slice(0,10);
   $('#countryRanking').innerHTML=top.map((c,i)=>'<div class="country-rank-row"><span class="country-rank-num">'+(i+1)+'</span><span class="country-rank-name">'+c.name+'</span><span class="country-rank-value">'+fmt(c.total)+'</span></div>').join('');
   $('#countryTable tbody').innerHTML=active.map(c=>'<tr data-country="'+c.name.replaceAll('"','&quot;')+'"><td>'+c.name+'</td><td>'+fmt(c.total)+'</td><td>'+((c.total/3414)*100).toFixed(1)+'%</td><td>'+fmtMonth(territoryData.months[c.monthly.indexOf(Math.max(...c.monthly))])+'</td></tr>').join('');
   function renderSelected(){
     const country=active.find(c=>c.name===select.value)||active[0];if(!country)return;
     $('#countryTotal').textContent=fmt(country.total);
     $('#countryShare').textContent=((country.total/3414)*100).toFixed(1)+'%';
     const peak=Math.max(...country.monthly), peakIndex=country.monthly.indexOf(peak);
     $('#countryPeak').textContent=fmtMonth(territoryData.months[peakIndex])+' · '+fmt(peak);
     $('#countryChartTitle').textContent=country.name+' · Monthly Downloads';
     const max=Math.max(1,...country.monthly);
     $('#countryChart').innerHTML=country.monthly.map((n,i)=>'<div class="country-bar-wrap" title="'+territoryData.months[i]+': '+fmt(n)+'"><strong>'+fmt(n)+'</strong><div class="country-bar" style="height:'+Math.max(2,n/max*125)+'px"></div><span>'+fmtMonth(territoryData.months[i])+'</span></div>').join('');
     document.querySelectorAll('#countryTable tbody tr').forEach(tr=>tr.classList.toggle('selected',tr.dataset.country===country.name));
   }
   select.value='Jordan';select.addEventListener('change',renderSelected);
   $('#countryTable tbody').addEventListener('click',e=>{const row=e.target.closest('tr[data-country]');if(row){select.value=row.dataset.country;renderSelected()}});
   renderSelected();
 }
 $('#applyBtn').addEventListener('click',()=>{const from=$('#dateFrom').value,to=$('#dateTo').value;if(from&&to&&from>to){notify('Start date must be before end date.');return}renderAll();notify('Filters applied to available iOS data.')});
 $('#resetBtn').addEventListener('click',()=>{
   $('#platform').value='iOS';$('#period').value='From Beginning';$('#dateFrom').value=dailyData?.startDate||'2025-08-13';$('#dateTo').value=dailyData?.endDate||'2026-10-12';
   Array.from($('#years').options).forEach(o=>o.selected=['2025','2026'].includes(o.value));granularity='Monthly';$$('.segmented button').forEach(b=>b.classList.toggle('active',b.dataset.granularity==='Monthly'));$('#chartGranularity').value='Monthly';compare=true;$('#compareSwitch').classList.add('on');$('#compareSwitch').setAttribute('aria-checked','true');renderAll();notify('Filters reset to the full iOS data period.');
 });
 $('#years').addEventListener('change',()=>{
   const ys=selectedYears();if(ys.length){const min=Math.min(...ys.map(Number)),max=Math.max(...ys.map(Number));
   let from=$('#dateFrom').value,to=$('#dateTo').value;
   if(from&&Number(from.slice(0,4))<min)$('#dateFrom').value=min+'-01-01';
   if(to&&Number(to.slice(0,4))>max)$('#dateTo').value=max+'-12-31';}
 });
 try{
   const [d,t]=await Promise.all([fetch('data/ios_daily.json').then(r=>{if(!r.ok)throw Error('iOS daily JSON failed');return r.json()}),fetch('data/ios_territories.json').then(r=>{if(!r.ok)throw Error('territory JSON failed');return r.json()})]);
   dailyData=d;territoryData=t;
   if(d.values.total.length!==426||d.values.firstTime.length!==426||d.values.redownloads.length!==426)throw Error('Unexpected daily row count');
   if(d.values.total.reduce((a,b)=>a+b,0)!==3414||d.values.firstTime.reduce((a,b)=>a+b,0)!==3081||d.values.redownloads.reduce((a,b)=>a+b,0)!==333)throw Error('iOS totals validation failed');
   if(t.countries.reduce((a,c)=>a+c.total,0)!==3414)throw Error('Territory totals do not reconcile');
   // Country list excludes empty territories, which App Store Connect can report with zero values.
   $('#period').value='From Beginning';$('#dateFrom').value=d.startDate;$('#dateTo').value=d.endDate;
   $('#years').querySelectorAll('option').forEach(o=>o.selected=['2025','2026'].includes(o.value));
   $('#platform').value='iOS';
   renderAll();renderCountries();
   const pill=document.querySelector('.top-actions .status-pill');if(pill)pill.innerHTML='<span class="dot"></span> iOS data loaded · 52 active territories';
 }catch(err){
   console.error(err);notify('Could not load repository data. Refresh the page.');
   const status=document.querySelector('.top-actions .status-pill');if(status)status.innerHTML='<span class="dot" style="background:#d55"></span> Data load error';
 }
 window.addEventListener('resize',()=>{if(dailyData)renderAll()});
})();
