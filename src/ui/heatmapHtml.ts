export function heatmapPageHtml(apiBase: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Commit Journal · 活跃热力图</title>
  <style>
    :root {
      --bg: #0f1419;
      --panel: #171c22;
      --text: #e7ecf1;
      --muted: #8b98a5;
      --border: #2a3440;
      --lv0: #21262d;
      --lv1: #0e4429;
      --lv2: #006d32;
      --lv3: #26a641;
      --lv4: #39d353;
      --accent: #3fb950;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background: radial-gradient(1200px 600px at 10% -10%, #1b2733, var(--bg));
      color: var(--text); min-height: 100vh;
    }
    .wrap { max-width: 980px; margin: 0 auto; padding: 28px 20px 60px; }
    h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: .02em; }
    .sub { color: var(--muted); margin: 0 0 20px; font-size: 13px; }
    .bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 18px; }
    select, button {
      background: var(--panel); color: var(--text); border: 1px solid var(--border);
      border-radius: 8px; padding: 8px 12px; font-size: 13px;
    }
    button { cursor: pointer; }
    button.primary { background: #238636; border-color: #2ea043; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin-bottom: 18px; }
    .stat { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
    .stat .l { color: var(--muted); font-size: 12px; }
    .stat .v { font-size: 24px; font-weight: 650; margin-top: 6px; }
    .stat .n { color: var(--muted); font-size: 11px; margin-top: 4px; }
    .heatmap {
      background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 16px;
      overflow-x: auto;
    }
    .body { display: grid; grid-template-columns: 22px 1fr; gap: 8px; }
    .weekdays { display: grid; grid-template-rows: repeat(7, 12px); gap: 3px; padding-top: 18px; color: var(--muted); font-size: 10px; }
    .main { min-width: max-content; }
    .months { display: grid; grid-auto-flow: column; grid-auto-columns: 15px; gap: 3px; height: 16px; margin-bottom: 2px; color: var(--muted); font-size: 11px; }
    .month { white-space: nowrap; }
    .grid {
      display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 12px);
      grid-auto-columns: 12px; gap: 3px;
    }
    .cell {
      width: 12px; height: 12px; border-radius: 2px; border: 0; padding: 0; background: var(--lv0);
    }
    .cell.lv1 { background: var(--lv1); } .cell.lv2 { background: var(--lv2); }
    .cell.lv3 { background: var(--lv3); } .cell.lv4 { background: var(--lv4); }
    .cell.is-blank { opacity: .25; }
    .cell.has-commits { cursor: pointer; }
    .cell.is-today { outline: 1px solid var(--accent); }
    .foot { display: flex; justify-content: space-between; gap: 12px; margin-top: 12px; color: var(--muted); font-size: 12px; flex-wrap: wrap; }
    .legend { display: inline-flex; align-items: center; gap: 4px; }
    .drawer {
      position: fixed; right: 0; top: 0; bottom: 0; width: min(420px, 100%);
      background: #12171d; border-left: 1px solid var(--border); transform: translateX(100%);
      transition: transform .2s ease; padding: 18px; overflow: auto; z-index: 20;
    }
    .drawer.open { transform: none; }
    .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: none; z-index: 10; }
    .backdrop.open { display: block; }
    .commit { border-bottom: 1px solid var(--border); padding: 10px 0; }
    .commit .t { font-size: 12px; color: var(--muted); display: flex; gap: 8px; }
    .commit .title { margin: 6px 0; font-size: 14px; }
    .empty, .err { color: var(--muted); padding: 24px 0; }
    @media (max-width: 720px) { .stats { grid-template-columns: repeat(2, minmax(0,1fr)); } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>活跃热力图</h1>
    <p class="sub">GitHub 风格提交活跃度 · 数据来自本地已同步提交 · API ${apiBase}</p>
    <div class="bar">
      <label>账号
        <select id="account"></select>
      </label>
      <label>区间
        <select id="year"><option value="0">近一年</option></select>
      </label>
      <button class="primary" id="refresh">刷新</button>
      <button id="sync">同步提交</button>
    </div>
    <div id="stats" class="stats"></div>
    <div id="heatmap" class="heatmap"><div class="empty">加载中…</div></div>
    <p class="sub">仅统计本地已同步提交，按本地自然日归档。点有提交的方格可查看当日明细。</p>
  </div>
  <div class="backdrop" id="backdrop"></div>
  <aside class="drawer" id="drawer">
    <div id="dayTitle"></div>
    <div id="dayList"></div>
  </aside>
  <script>
    const API = ${JSON.stringify(apiBase)};
    const WEEKDAY = ['一','二','三','四','五','六','日'];
    const HEAT = 4;
    const $ = (id) => document.getElementById(id);

    async function jget(path) {
      const res = await fetch(API + path);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
    async function jpost(path, body) {
      const res = await fetch(API + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }

    function levelOf(count, step) {
      if (count <= 0) return 0;
      return Math.min(HEAT, Math.ceil(count / step));
    }

    function mondayOf(d) {
      const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0,0,0,0); return x;
    }
    function fmt(d) {
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), da = String(d.getDate()).padStart(2,'0');
      return y + '-' + m + '-' + da;
    }
    function parseDay(s) {
      const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d);
    }
    function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }

    async function loadAccounts() {
      const data = await jget('/api/accounts');
      const sel = $('account');
      sel.innerHTML = '';
      for (const a of data.accounts) {
        const opt = document.createElement('option');
        opt.value = a.id; opt.textContent = a.name + (a.active ? ' (当前)' : '');
        if (a.active) opt.selected = true;
        sel.appendChild(opt);
      }
      if (!data.accounts.length) {
        $('heatmap').innerHTML = '<div class="empty">还没有账号。请用 dsh 工具 upsert_account 添加 Codeup 账号。</div>';
      }
    }

    function renderStats(stats) {
      const items = [
        ['提交总数', stats.totalCommits, '所选区间内全部提交'],
        ['活跃天数', stats.activeDays + ' 天', '至少有一次提交'],
        ['最长连续', stats.longestStreak + ' 天', '连续每天都有提交'],
        ['单日最高', stats.maxDayCount + ' 条', stats.maxDayDate || '暂无记录']
      ];
      $('stats').innerHTML = items.map(([l,v,n]) =>
        '<div class="stat"><div class="l">'+l+'</div><div class="v">'+v+'</div><div class="n">'+n+'</div></div>'
      ).join('');
    }

    function renderHeatmap(data) {
      if (!data.stats.totalCommits) {
        $('heatmap').innerHTML = '<div class="empty">当前区间还没有提交记录，先点「同步提交」。</div>';
        $('stats').innerHTML = '';
        return;
      }
      renderStats(data.stats);
      const fromDay = parseDay(data.from), toDay = parseDay(data.to);
      const gridStart = mondayOf(fromDay);
      const endPad = (7 - ((toDay.getDay()+6)%7) - 1 + 7) % 7;
      const gridEnd = addDays(toDay, endPad);
      const totalDays = Math.round((gridEnd - gridStart) / 86400000) + 1;
      const weeks = Math.ceil(totalDays / 7);
      const countByDay = new Map(data.days.map(d => [d.date, d.count]));
      const step = Math.max(1, Math.ceil(data.stats.maxDayCount / HEAT));
      const todayKey = fmt(new Date());
      let cells = '';
      for (let i = 0; i < weeks * 7; i++) {
        const day = addDays(gridStart, i);
        const key = fmt(day);
        const inRange = day >= fromDay && day <= toDay;
        const count = inRange ? (countByDay.get(key) || 0) : 0;
        const lv = levelOf(count, step);
        const cls = ['cell', inRange ? 'lv'+lv : 'is-blank', count>0?'has-commits':'', key===todayKey?'is-today':'']
          .filter(Boolean).join(' ');
        const tip = inRange ? (key + ' · ' + count + ' 条提交') : key;
        cells += '<button class="'+cls+'" title="'+tip+'" data-date="'+key+'" data-count="'+count+'" '+(count>0 && inRange?'':'disabled')+'></button>';
      }
      let months = '';
      let last = -4, prevMonth = -1;
      for (let w = 0; w < weeks; w++) {
        const weekStart = addDays(gridStart, w*7);
        if (weekStart < fromDay) continue;
        if (weekStart.getMonth() === prevMonth) continue;
        prevMonth = weekStart.getMonth();
        if (w - last < 3 || w > weeks - 4) continue;
        months += '<span class="month" style="grid-column:'+(w+1)+'">'+(weekStart.getMonth()+1)+'月</span>';
        last = w;
      }
      $('heatmap').innerHTML =
        '<div class="body"><div class="weekdays">'+WEEKDAY.map(x=>'<span>'+x+'</span>').join('')+'</div>'+
        '<div class="main"><div class="months" style="grid-template-columns:repeat('+weeks+',12px)">'+months+'</div>'+
        '<div class="grid">'+cells+'</div></div></div>'+
        '<div class="foot"><span>共 '+weeks+' 周 · 活跃 '+data.stats.activeDays+' 天 · 合计 '+data.stats.totalCommits+' 条</span>'+
        '<span class="legend">少 <span class="cell lv0"></span><span class="cell lv1"></span><span class="cell lv2"></span><span class="cell lv3"></span><span class="cell lv4"></span> 多</span></div>';

      $('heatmap').querySelectorAll('.has-commits').forEach(btn => {
        btn.addEventListener('click', () => openDay(btn.getAttribute('data-date')));
      });
    }

    async function openDay(date) {
      $('backdrop').classList.add('open');
      $('drawer').classList.add('open');
      $('dayTitle').innerHTML = '<h2 style="margin:0 0 8px">'+date+'</h2><div class="sub">加载中…</div>';
      $('dayList').innerHTML = '';
      const accountId = $('account').value;
      const data = await jget('/api/activity/day?accountId='+encodeURIComponent(accountId)+'&date='+encodeURIComponent(date));
      $('dayTitle').innerHTML = '<h2 style="margin:0 0 8px">'+date+'</h2><div class="sub">'+data.commits.length+' 条提交</div>';
      if (!data.commits.length) {
        $('dayList').innerHTML = '<div class="empty">当天没有提交</div>';
        return;
      }
      $('dayList').innerHTML = data.commits.map(c =>
        '<div class="commit"><div class="t"><span>'+c.time.slice(11,16)+'</span><span>'+c.repo+'</span></div>'+
        '<div class="title">'+c.title+'</div>'+
        '<div class="t"><span>'+c.sha+'</span>'+(c.webUrl?' · <a href="'+c.webUrl+'" target="_blank" rel="noreferrer">打开</a>':'')+'</div></div>'
      ).join('');
    }

    function closeDay() {
      $('backdrop').classList.remove('open');
      $('drawer').classList.remove('open');
    }

    async function loadActivity() {
      const accountId = $('account').value;
      if (!accountId) return;
      const year = Number($('year').value || 0);
      const q = '/api/activity?accountId='+encodeURIComponent(accountId)+(year?('&year='+year):'');
      $('heatmap').innerHTML = '<div class="empty">加载中…</div>';
      try {
        const data = await jget(q);
        const ysel = $('year');
        const current = ysel.value;
        ysel.innerHTML = '<option value="0">近一年</option>' + (data.years||[]).map(y =>
          '<option value="'+y+'">'+y+' 年</option>'
        ).join('');
        ysel.value = current;
        renderHeatmap(data);
      } catch (e) {
        $('heatmap').innerHTML = '<div class="err">'+(e.message||e)+'</div>';
      }
    }

    $('refresh').onclick = loadActivity;
    $('year').onchange = loadActivity;
    $('account').onchange = loadActivity;
    $('backdrop').onclick = closeDay;
    $('sync').onclick = async () => {
      const accountId = $('account').value;
      if (!accountId) return;
      $('sync').disabled = true; $('sync').textContent = '同步中…';
      try {
        const r = await jpost('/api/sync', { accountId });
        alert('同步完成：新增 '+r.inserted+'，拉取 '+r.fetched+(r.errors&&r.errors.length?('；错误 '+r.errors.length):''));
        await loadActivity();
      } catch (e) {
        alert(e.message || e);
      } finally {
        $('sync').disabled = false; $('sync').textContent = '同步提交';
      }
    };

    loadAccounts().then(loadActivity);
  </script>
</body>
</html>`
}
