/**
 * Betriebsapp Mobile – Imkerei-Modul
 *
 * Touch-optimierte Erfassung für Bienenstände, Völker, Arbeiten,
 * Ernte, Behandlungen und Beobachtungen. Nutzt das globale `data`,
 * `saveLocal()`, `openModal()`, `closeModal()`, `toast()` und `esc/deCH/toISO`
 * der Mobile-App.
 *
 * Render zur sc-imker Screen. Sub-Navigation via Chips.
 */

(function(global){
  'use strict';

  const DEFAULT_ARBEIT_TYPEN = ['Durchsicht','Wabe geben','Honig schleudern','Ableger bilden','Wanderung','Einwinterung','Auswinterung','Reinigung','Königin tauschen','Sonstiges'];
  const DEFAULT_VARROA_MITTEL = [
    { name:'60% Ameisensäure', einheit:'1 Liter', defaultAnwendung:'Verdampfen' },
    { name:'70% Ameisensäure', einheit:'1 Liter', defaultAnwendung:'Verdampfen' },
    { name:'85% Ameisensäure', einheit:'1 Liter', defaultAnwendung:'Verdampfen' },
    { name:'Formipro Ameisensäure-Streifen', einheit:'2 Streifen', defaultAnwendung:'Verdampfen' },
    { name:'Oxuvar 5.7% (Konzentrat)', einheit:'275 g', defaultAnwendung:'Träufeln' },
    { name:'Varroxal (Oxalsäure-Dihydrat)', einheit:'75 g / 1000 g', defaultAnwendung:'Verdampfen' }
  ];
  const ANWENDUNG_TYPEN = ['Träufeln','Verdampfen','Sprühen'];
  const SCHWARM_TYPEN = ['Schwarm','Kunstschwarm','Ableger'];

  function ensureData(){
    if(typeof data === 'undefined') return;
    if(!data.imkerSettings) data.imkerSettings = { name:'',vorname:'',strasse:'',plzOrt:'',telefon:'',email:'',betriebsNr:'',sektion:'',arbeitTypen: DEFAULT_ARBEIT_TYPEN.slice(), varroaMittel: DEFAULT_VARROA_MITTEL.map(m=>Object.assign({},m)) };
    if(!Array.isArray(data.imkerSettings.arbeitTypen) || !data.imkerSettings.arbeitTypen.length){
      data.imkerSettings.arbeitTypen = DEFAULT_ARBEIT_TYPEN.slice();
    }
    if(!Array.isArray(data.imkerSettings.varroaMittel) || !data.imkerSettings.varroaMittel.length){
      data.imkerSettings.varroaMittel = DEFAULT_VARROA_MITTEL.map(m=>Object.assign({},m));
    }
    ['imkerStaende','imkerVoelker','imkerArbeiten','imkerErnte','imkerBehandlungen','imkerBeobachtungen']
      .forEach(k => { if(!Array.isArray(data[k])) data[k] = []; });
    // Migration: Beutentyp Volk → Stand
    (data.imkerStaende||[]).forEach(s => {
      if(s.beutentyp == null) s.beutentyp = '';
      if(!s.beutentyp){
        const v = (data.imkerVoelker||[]).find(x => x.standId===s.id && x.beutentyp);
        if(v) s.beutentyp = v.beutentyp;
      }
    });
    // Migration: Arbeit.typ → Arbeit.typen
    (data.imkerArbeiten||[]).forEach(a => {
      if(!Array.isArray(a.typen)) a.typen = a.typ ? [a.typ] : [];
    });
    // Migration: Behandlung.applikation → anwendung ableiten falls leer
    (data.imkerBehandlungen||[]).forEach(b => {
      if(!b.anwendung && b.applikation){
        const t = b.applikation.toLowerCase();
        if(/träufel|traeufel/.test(t)) b.anwendung = 'Träufeln';
        else if(/verdampf|verdunst/.test(t)) b.anwendung = 'Verdampfen';
        else if(/sprüh|spruh/.test(t)) b.anwendung = 'Sprühen';
      }
    });
  }
  function arbeitTypen(){
    return (data.imkerSettings && Array.isArray(data.imkerSettings.arbeitTypen) && data.imkerSettings.arbeitTypen.length)
      ? data.imkerSettings.arbeitTypen : DEFAULT_ARBEIT_TYPEN;
  }
  function varroaMittel(){
    return (data.imkerSettings && Array.isArray(data.imkerSettings.varroaMittel) && data.imkerSettings.varroaMittel.length)
      ? data.imkerSettings.varroaMittel : DEFAULT_VARROA_MITTEL;
  }

  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  let activeSub = 'uebersicht';
  function setSub(s){ activeSub = s; render(); }

  function findStand(id){ return (data.imkerStaende||[]).find(x=>x.id===id); }
  function findVolk(id){ return (data.imkerVoelker||[]).find(x=>x.id===id); }
  function voelkerAmStand(sid){ return (data.imkerVoelker||[]).filter(v=>v.standId===sid); }
  function aktiveVoelker(sid){ return voelkerAmStand(sid).filter(v => (v.status||'aktiv')==='aktiv'); }
  function standLabel(s){ if(!s) return '–'; return s.standNr ? (s.standNr + (s.name?' · '+s.name:'')) : (s.name||'Stand'); }
  function volkLabel(v){ if(!v) return '–'; return 'Volk '+(v.volkNr||'?')+(v.typ&&v.typ!=='Volk'?' ('+v.typ+')':''); }

  function _esc(s){ return (window.esc||(x=>String(x||'')))(s); }
  function _de(d){ return (window.deCH||(x=>x||''))(d); }
  function _iso(d){ return (window.toISO||(x=>String(x||'').slice(0,10)))(d); }

  // ============ MAIN RENDER ============
  function render(){
    ensureData();
    const root = document.getElementById('imkMobileRoot');
    if(!root) return;
    const subs = [
      ['uebersicht','📊 Übersicht'],
      ['staende','📍 Stände'],
      ['voelker','🐝 Völker'],
      ['arbeit','🔧 Arbeit'],
      ['ernte','🍯 Ernte'],
      ['beh','💊 Behandlung'],
      ['beo','👁️ Beob.']
    ];
    root.innerHTML = `
      <div class="chips" style="margin-bottom:10px;">
        ${subs.map(([k,l]) => `<button class="chip ${activeSub===k?'active':''}" onclick="IMKM.setSub('${k}')">${l}</button>`).join('')}
      </div>
      <div id="imkMobileBody"></div>
    `;
    const body = document.getElementById('imkMobileBody');
    if(activeSub==='uebersicht') renderUebersicht(body);
    else if(activeSub==='staende') renderStaende(body);
    else if(activeSub==='voelker') renderVoelker(body);
    else if(activeSub==='arbeit') renderArbeiten(body);
    else if(activeSub==='ernte') renderErnte(body);
    else if(activeSub==='beh') renderBehandlungen(body);
    else if(activeSub==='beo') renderBeobachtungen(body);
  }

  function emptyState(text){
    return `<div class="card" style="text-align:center;color:#888;padding:30px 20px;">${_esc(text)}</div>`;
  }

  // ============ ÜBERSICHT ============
  function renderUebersicht(root){
    const jahr = new Date().getFullYear();
    const aktV = (data.imkerVoelker||[]).filter(v=>(v.status||'aktiv')==='aktiv').length;
    const honig = (data.imkerErnte||[])
      .filter(e=>(e.datum||'').startsWith(String(jahr)) && /honig/i.test(e.produkt||''))
      .reduce((s,e)=>s+(Number(e.mengeKg)||0),0);
    const beh = (data.imkerBehandlungen||[]).filter(b=>(b.datumVon||'').startsWith(String(jahr))).length;
    const arb = (data.imkerArbeiten||[]).filter(a=>(a.datum||'').startsWith(String(jahr))).length;
    const all = [
      ...(data.imkerArbeiten||[]).map(x=>({...x,_t:'Arbeit',_l:(x.typen&&x.typen.length?x.typen.join(', '):(x.typ||''))})),
      ...(data.imkerBehandlungen||[]).map(x=>({...x,_t:'Behandl.',_l:x.handelsname,datum:x.datumVon})),
      ...(data.imkerErnte||[]).map(x=>({...x,_t:'Ernte',_l:x.produkt+' '+(Number(x.mengeKg)||0)+'kg'})),
      ...(data.imkerBeobachtungen||[]).map(x=>({...x,_t:'Beob.',_l:x.beobachtung}))
    ].sort((a,b)=>(b.datum||'').localeCompare(a.datum||'')).slice(0,10);
    root.innerHTML = `
      <div class="card" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div><div style="font-size:24px;font-weight:bold;color:#27ae60">${aktV}</div><div style="font-size:12px;color:#888">Völker aktiv</div></div>
        <div><div style="font-size:24px;font-weight:bold;color:#e67e22">${honig.toFixed(1)} kg</div><div style="font-size:12px;color:#888">Honig ${jahr}</div></div>
        <div><div style="font-size:24px;font-weight:bold;color:#8e44ad">${beh}</div><div style="font-size:12px;color:#888">Behandl. ${jahr}</div></div>
        <div><div style="font-size:24px;font-weight:bold;color:#3498db">${arb}</div><div style="font-size:12px;color:#888">Arbeiten ${jahr}</div></div>
      </div>
      <div class="card">
        <h3 style="margin:0 0 8px;font-size:14px;">Letzte Aktivitäten</h3>
        ${all.length ? all.map(x=>{
          const st = findStand(x.standId);
          return `<div style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px;">
            <strong>${_de(x.datum)}</strong> · ${x._t}: ${_esc(x._l||'')}
            <div style="color:#888;font-size:11px;">${_esc(standLabel(st))}</div>
          </div>`;
        }).join('') : '<div style="color:#888;text-align:center;padding:14px;">Noch keine Einträge</div>'}
      </div>
    `;
  }

  // ============ STÄNDE ============
  function renderStaende(root){
    const list = data.imkerStaende || [];
    root.innerHTML = `
      <button class="btn btn-primary btn-wide" style="margin-bottom:10px" onclick="IMKM.standForm()">+ Neuer Stand</button>
      ${list.length ? list.map(s => `
        <div class="card" onclick="IMKM.standForm('${s.id}')" style="cursor:pointer;">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
              <div style="font-weight:600;font-size:15px;">${_esc(s.standNr||'-')} · ${_esc(s.name||'')}</div>
              <div style="color:#888;font-size:12px;">${_esc(s.fluradresse||'')} ${_esc(s.plzOrt||'')}</div>
              ${s.beutentyp?`<div style="color:#666;font-size:12px;">📦 ${_esc(s.beutentyp)}</div>`:''}
              ${s.koordinaten?`<div style="color:#888;font-size:11px;font-family:monospace;">${_esc(s.koordinaten)}</div>`:''}
            </div>
            <div style="text-align:right;">
              <div style="font-size:18px;font-weight:bold;color:#27ae60;">${aktiveVoelker(s.id).length}</div>
              <div style="font-size:10px;color:#888;">Völker</div>
            </div>
          </div>
        </div>
      `).join('') : emptyState('Noch keine Stände erfasst.')}
    `;
  }

  function standForm(id){
    const s = id ? findStand(id) : { id:uid(), standNr:'', name:'', beutentyp:'', fluradresse:'', plzOrt:'', koordinaten:'', aktiv:true, bemerkung:'', createdAt:new Date().toISOString() };
    openModal(`
      <h3 style="margin-top:0">${id?'Stand bearbeiten':'Neuer Stand'}</h3>
      <div style="display:grid;gap:8px;">
        <div><label style="font-size:12px;color:#666">Stand-Nr. (Kanton)</label><input id="msf_standNr" value="${_esc(s.standNr||'')}" placeholder="z.B. GR 2451" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Name</label><input id="msf_name" value="${_esc(s.name||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Beutentyp <span style="color:#888">(gilt für alle Völker am Stand)</span></label><input id="msf_beutentyp" value="${_esc(s.beutentyp||'')}" placeholder="Schweizerkasten, Magazin..." style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Fluradresse</label><input id="msf_fluradresse" value="${_esc(s.fluradresse||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">PLZ/Ort</label><input id="msf_plzOrt" value="${_esc(s.plzOrt||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Koordinaten</label><input id="msf_koordinaten" value="${_esc(s.koordinaten||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Status</label>
          <select id="msf_aktiv" style="width:100%;padding:8px;font-size:16px;">
            <option value="1" ${s.aktiv!==false?'selected':''}>aktiv</option>
            <option value="0" ${s.aktiv===false?'selected':''}>inaktiv</option>
          </select></div>
        <div><label style="font-size:12px;color:#666">Bemerkung</label><textarea id="msf_bemerkung" style="width:100%;padding:8px;min-height:60px;font-size:14px;">${_esc(s.bemerkung||'')}</textarea></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button class="btn btn-primary" onclick="IMKM.standSave('${s.id}')" style="flex:1;">Speichern</button>
        ${id?`<button class="btn btn-danger" onclick="IMKM.standDelete('${s.id}')">Löschen</button>`:''}
        <button class="btn btn-outline" onclick="closeModal()">Abbrechen</button>
      </div>
    `);
  }
  function standSave(id){
    const exists = findStand(id);
    const obj = {
      id, standNr: document.getElementById('msf_standNr').value.trim(),
      name: document.getElementById('msf_name').value.trim(),
      beutentyp: document.getElementById('msf_beutentyp').value.trim(),
      fluradresse: document.getElementById('msf_fluradresse').value.trim(),
      plzOrt: document.getElementById('msf_plzOrt').value.trim(),
      koordinaten: document.getElementById('msf_koordinaten').value.trim(),
      aktiv: document.getElementById('msf_aktiv').value === '1',
      bemerkung: document.getElementById('msf_bemerkung').value.trim(),
      createdAt: exists ? exists.createdAt : new Date().toISOString()
    };
    if(!obj.standNr && !obj.name){ toast('Stand-Nr. oder Name erforderlich'); return; }
    if(exists) Object.assign(exists, obj);
    else data.imkerStaende.push(obj);
    if(typeof saveLocal==='function') saveLocal();
    closeModal(); render(); toast('Stand gespeichert');
  }
  function standDelete(id){
    if(!confirm('Stand löschen?')) return;
    data.imkerStaende = data.imkerStaende.filter(s=>s.id!==id);
    if(typeof saveLocal==='function') saveLocal();
    closeModal(); render(); toast('Gelöscht');
  }

  // ============ VÖLKER ============
  function renderVoelker(root){
    const list = (data.imkerVoelker||[]).slice().sort((a,b)=>(a.volkNr||'').localeCompare(b.volkNr||''));
    root.innerHTML = `
      <button class="btn btn-primary btn-wide" style="margin-bottom:10px" onclick="IMKM.volkForm()">+ Neues Volk</button>
      ${list.length ? list.map(v => {
        const st = findStand(v.standId);
        const mutter = v.mutterVolkId ? findVolk(v.mutterVolkId) : null;
        const isAktiv = (v.status||'aktiv')==='aktiv';
        return `<div class="card" onclick="IMKM.volkForm('${v.id}')" style="cursor:pointer;${!isAktiv?'opacity:.6;':''}">
          <div style="display:flex;justify-content:space-between;">
            <div>
              <div style="font-weight:600;font-size:15px;">Volk ${_esc(v.volkNr||'?')} ${v.typ&&v.typ!=='Volk'?' · '+_esc(v.typ):''}</div>
              <div style="color:#888;font-size:12px;">${_esc(standLabel(st))}</div>
              ${mutter?`<div style="color:#666;font-size:11px;">↳ aus ${_esc(volkLabel(mutter))}</div>`:''}
              ${v.koeniginJahr?`<div style="color:#888;font-size:11px;">♀ ${_esc(v.koeniginJahr)} ${_esc(v.koeniginHerkunft||'')}</div>`:''}
            </div>
            <div style="font-size:11px;${isAktiv?'color:#27ae60':'color:#c00'}">${_esc(v.status||'aktiv')}</div>
          </div>
        </div>`;
      }).join('') : emptyState('Noch keine Völker.')}
    `;
  }

  function volkForm(id){
    const v = id ? findVolk(id) : { id:uid(), standId: (data.imkerStaende[0]||{}).id||'', volkNr:'', typ:'Volk', koeniginJahr:'', koeniginHerkunft:'', mutterVolkId:'', status:'aktiv', statusDatum:'', statusBemerkung:'', createdAt:new Date().toISOString() };
    const standOpts = (data.imkerStaende||[]).map(s=>`<option value="${s.id}" ${v.standId===s.id?'selected':''}>${_esc(standLabel(s))}</option>`).join('');
    const standBeute = (findStand(v.standId)||{}).beutentyp || '–';
    const mutterOpts = (data.imkerVoelker||[]).filter(x=>x.id!==v.id)
      .map(x=>`<option value="${x.id}" ${v.mutterVolkId===x.id?'selected':''}>${_esc(volkLabel(x))} – ${_esc(standLabel(findStand(x.standId)))}</option>`).join('');
    const showMutter = SCHWARM_TYPEN.includes(v.typ);
    openModal(`
      <h3 style="margin-top:0">${id?'Volk bearbeiten':'Neues Volk'}</h3>
      <div style="display:grid;gap:8px;">
        <div><label style="font-size:12px;color:#666">Volk-Nr.</label><input id="mvf_volkNr" value="${_esc(v.volkNr||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Stand</label><select id="mvf_standId" onchange="IMKM.volkStandChange()" style="width:100%;padding:8px;font-size:16px;"><option value="">–</option>${standOpts}</select></div>
        <div><label style="font-size:12px;color:#666">Typ</label><select id="mvf_typ" onchange="IMKM.volkTypChange()" style="width:100%;padding:8px;font-size:16px;">
          ${['Volk','Ableger','Schwarm','Kunstschwarm','Begattungskästchen'].map(t=>`<option ${v.typ===t?'selected':''}>${t}</option>`).join('')}
        </select></div>
        <div id="mvf_mutterRow" style="display:${showMutter?'block':'none'};">
          <label style="font-size:12px;color:#666">Mutter-Volk <span style="color:#888">(woher kommt der Schwarm/Ableger?)</span></label>
          <select id="mvf_mutterVolkId" style="width:100%;padding:8px;font-size:16px;">
            <option value="">– unbekannt / extern –</option>
            ${mutterOpts}
          </select>
        </div>
        <div><label style="font-size:12px;color:#666">Beutentyp <span style="color:#888">(vom Stand)</span></label><div id="mvf_beuteRO" style="padding:8px;background:#f0f0f0;border-radius:4px;font-size:14px;color:#555;">${_esc(standBeute)}</div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label style="font-size:12px;color:#666">Königin Jahr</label><input id="mvf_koeniginJahr" value="${_esc(v.koeniginJahr||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
          <div><label style="font-size:12px;color:#666">Herkunft</label><input id="mvf_koeniginHerkunft" value="${_esc(v.koeniginHerkunft||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        </div>
        <div><label style="font-size:12px;color:#666">Status</label><select id="mvf_status" style="width:100%;padding:8px;font-size:16px;">
          ${['aktiv','eingegangen','abgegeben','verkauft'].map(t=>`<option ${v.status===t?'selected':''}>${t}</option>`).join('')}
        </select></div>
        <div><label style="font-size:12px;color:#666">Status-Datum</label><input id="mvf_statusDatum" type="date" value="${_esc(v.statusDatum||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Status-Bemerkung (Ursache)</label><input id="mvf_statusBemerkung" value="${_esc(v.statusBemerkung||'')}" placeholder="Nosema, FB, Kahlflug, Kauf..." style="width:100%;padding:8px;font-size:16px;"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button class="btn btn-primary" onclick="IMKM.volkSave('${v.id}')" style="flex:1;">Speichern</button>
        ${id?`<button class="btn btn-danger" onclick="IMKM.volkDelete('${v.id}')">Löschen</button>`:''}
        <button class="btn btn-outline" onclick="closeModal()">Abbrechen</button>
      </div>
    `);
  }
  function volkStandChange(){
    const sid = document.getElementById('mvf_standId').value;
    const st = findStand(sid);
    const ro = document.getElementById('mvf_beuteRO');
    if(ro) ro.textContent = (st && st.beutentyp) || '–';
  }
  function volkTypChange(){
    const t = document.getElementById('mvf_typ').value;
    const row = document.getElementById('mvf_mutterRow');
    if(row) row.style.display = SCHWARM_TYPEN.includes(t) ? 'block' : 'none';
  }
  function volkSave(id){
    const exists = findVolk(id);
    const typ = document.getElementById('mvf_typ').value;
    const obj = {
      id, standId: document.getElementById('mvf_standId').value,
      volkNr: document.getElementById('mvf_volkNr').value.trim(),
      typ: typ,
      mutterVolkId: SCHWARM_TYPEN.includes(typ) ? (document.getElementById('mvf_mutterVolkId').value || '') : '',
      // beutentyp stammt jetzt vom Stand
      koeniginJahr: document.getElementById('mvf_koeniginJahr').value.trim(),
      koeniginHerkunft: document.getElementById('mvf_koeniginHerkunft').value.trim(),
      status: document.getElementById('mvf_status').value,
      statusDatum: document.getElementById('mvf_statusDatum').value,
      statusBemerkung: document.getElementById('mvf_statusBemerkung').value.trim(),
      createdAt: exists ? exists.createdAt : new Date().toISOString()
    };
    if(!obj.volkNr){ toast('Volk-Nr. erforderlich'); return; }
    if(exists) Object.assign(exists, obj);
    else data.imkerVoelker.push(obj);
    if(typeof saveLocal==='function') saveLocal();
    closeModal(); render(); toast('Volk gespeichert');
  }
  function volkDelete(id){
    if(!confirm('Volk löschen?')) return;
    data.imkerVoelker = data.imkerVoelker.filter(v=>v.id!==id);
    if(typeof saveLocal==='function') saveLocal();
    closeModal(); render();
  }

  // ============ ARBEITEN ============
  function renderArbeiten(root){
    const list = (data.imkerArbeiten||[]).slice().sort((a,b)=>(b.datum||'').localeCompare(a.datum||''));
    root.innerHTML = `
      <button class="btn btn-primary btn-wide" style="margin-bottom:10px" onclick="IMKM.arbForm()">+ Neue Arbeit</button>
      ${list.length ? list.map(a => {
        const st = findStand(a.standId);
        const typLabel = (a.typen && a.typen.length ? a.typen.join(', ') : (a.typ||'-'));
        return `<div class="card" onclick="IMKM.arbForm('${a.id}')" style="cursor:pointer;">
          <div style="display:flex;justify-content:space-between;">
            <div>
              <div style="font-weight:600;font-size:14px;">${_de(a.datum)} · ${_esc(typLabel)}</div>
              <div style="color:#666;font-size:13px;">${_esc(a.beschreibung||'')}</div>
              <div style="color:#888;font-size:11px;">${_esc(standLabel(st))}</div>
            </div>
            ${a.arbeitszeitMin?`<div style="font-size:11px;color:#888;">${_esc(a.arbeitszeitMin)} min</div>`:''}
          </div>
        </div>`;
      }).join('') : emptyState('Noch keine Arbeiten.')}
    `;
  }
  function arbForm(id){
    const a = id ? (data.imkerArbeiten||[]).find(x=>x.id===id)
                 : { id:uid(), datum:_iso(new Date()), standId:(data.imkerStaende[0]||{}).id||'', volkIds:[], typen:[], beschreibung:'', arbeitszeitMin:'', createdAt:new Date().toISOString() };
    if(!Array.isArray(a.typen)) a.typen = a.typ ? [a.typ] : [];
    const standOpts = (data.imkerStaende||[]).map(s=>`<option value="${s.id}" ${a.standId===s.id?'selected':''}>${_esc(standLabel(s))}</option>`).join('');
    const typen = arbeitTypen();
    openModal(`
      <h3 style="margin-top:0">${id?'Arbeit':'Neue Arbeit'}</h3>
      <div style="display:grid;gap:8px;">
        <div><label style="font-size:12px;color:#666">Datum</label><input id="maf_datum" type="date" value="${_esc(a.datum||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Stand</label><select id="maf_standId" style="width:100%;padding:8px;font-size:16px;"><option value="">–</option>${standOpts}</select></div>
        <div><label style="font-size:12px;color:#666">Typ(en) <span style="color:#888">– mehrere möglich</span></label>
          <div style="background:white;border:1px solid #ddd;padding:6px;border-radius:4px;max-height:160px;overflow:auto;">
            ${typen.map(t => `
              <label style="display:block;padding:6px;font-size:14px;">
                <input type="checkbox" name="maf_typ" value="${_esc(t)}" ${a.typen.includes(t)?'checked':''} style="transform:scale(1.3);margin-right:8px;"> ${_esc(t)}
              </label>
            `).join('')}
          </div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Liste in Stammdaten (PC-App) editieren</div>
        </div>
        <div><label style="font-size:12px;color:#666">Beschreibung</label><textarea id="maf_beschreibung" style="width:100%;padding:8px;min-height:80px;font-size:14px;">${_esc(a.beschreibung||'')}</textarea></div>
        <div><label style="font-size:12px;color:#666">Arbeitszeit (Min)</label><input id="maf_arbeitszeitMin" type="number" inputmode="numeric" value="${_esc(a.arbeitszeitMin||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button class="btn btn-primary" onclick="IMKM.arbSave('${a.id}')" style="flex:1;">Speichern</button>
        ${id?`<button class="btn btn-danger" onclick="IMKM.arbDelete('${a.id}')">Löschen</button>`:''}
        <button class="btn btn-outline" onclick="closeModal()">Abbrechen</button>
      </div>
    `);
  }
  function arbSave(id){
    const exists = (data.imkerArbeiten||[]).find(x=>x.id===id);
    const typen = Array.from(document.querySelectorAll('input[name="maf_typ"]:checked')).map(c=>c.value);
    const obj = {
      id, datum: document.getElementById('maf_datum').value,
      standId: document.getElementById('maf_standId').value,
      volkIds: exists ? (exists.volkIds||[]) : [],
      typen: typen,
      beschreibung: document.getElementById('maf_beschreibung').value.trim(),
      arbeitszeitMin: document.getElementById('maf_arbeitszeitMin').value,
      createdAt: exists ? exists.createdAt : new Date().toISOString()
    };
    if(!obj.datum){ toast('Datum nötig'); return; }
    if(!obj.typen.length){ toast('Mindestens einen Typ wählen'); return; }
    if(exists){ Object.assign(exists, obj); delete exists.typ; }
    else data.imkerArbeiten.push(obj);
    if(typeof saveLocal==='function') saveLocal();
    closeModal(); render(); toast('Gespeichert');
  }
  function arbDelete(id){
    if(!confirm('Arbeit löschen?')) return;
    data.imkerArbeiten = data.imkerArbeiten.filter(a=>a.id!==id);
    if(typeof saveLocal==='function') saveLocal();
    closeModal(); render();
  }

  // ============ ERNTE ============
  const ERNTE_PROD = ['Honig - Frühling','Honig - Sommer','Honig - Wald','Honig - Blüten','Wachs','Propolis','Pollen','Met'];
  function renderErnte(root){
    const list = (data.imkerErnte||[]).slice().sort((a,b)=>(b.datum||'').localeCompare(a.datum||''));
    const jahr = new Date().getFullYear();
    const summen = {};
    list.filter(e=>(e.datum||'').startsWith(String(jahr))).forEach(e=>{ summen[e.produkt] = (summen[e.produkt]||0)+(Number(e.mengeKg)||0); });
    root.innerHTML = `
      <button class="btn btn-primary btn-wide" style="margin-bottom:10px" onclick="IMKM.ernteForm()">+ Neue Ernte</button>
      ${Object.keys(summen).length ? `<div class="card" style="font-size:13px;"><strong>Summen ${jahr}:</strong><br>${Object.entries(summen).map(([p,kg])=>`${_esc(p)}: <strong>${kg.toFixed(1)} kg</strong>`).join(' · ')}</div>` : ''}
      ${list.length ? list.map(e => {
        const st = findStand(e.standId);
        return `<div class="card" onclick="IMKM.ernteForm('${e.id}')" style="cursor:pointer;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:600;font-size:14px;">${_de(e.datum)} · ${_esc(e.produkt||'')}</div>
              <div style="color:#888;font-size:12px;">${_esc(standLabel(st))}</div>
              ${e.bemerkung?`<div style="color:#888;font-size:11px;">${_esc(e.bemerkung)}</div>`:''}
            </div>
            <div style="font-size:18px;font-weight:bold;color:#e67e22;">${(Number(e.mengeKg)||0).toFixed(1)} kg</div>
          </div>
        </div>`;
      }).join('') : emptyState('Noch keine Ernte.')}
    `;
  }
  function ernteForm(id){
    const e = id ? (data.imkerErnte||[]).find(x=>x.id===id)
                 : { id:uid(), datum:_iso(new Date()), standId:(data.imkerStaende[0]||{}).id||'', volkIds:[], produkt:'Honig - Sommer', mengeKg:'', bemerkung:'', createdAt:new Date().toISOString() };
    const standOpts = (data.imkerStaende||[]).map(s=>`<option value="${s.id}" ${e.standId===s.id?'selected':''}>${_esc(standLabel(s))}</option>`).join('');
    openModal(`
      <h3 style="margin-top:0">${id?'Ernte':'Neue Ernte'}</h3>
      <div style="display:grid;gap:8px;">
        <div><label style="font-size:12px;color:#666">Datum</label><input id="mef_datum" type="date" value="${_esc(e.datum||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Stand</label><select id="mef_standId" style="width:100%;padding:8px;font-size:16px;"><option value="">–</option>${standOpts}</select></div>
        <div><label style="font-size:12px;color:#666">Produkt</label><select id="mef_produkt" style="width:100%;padding:8px;font-size:16px;">${ERNTE_PROD.map(p=>`<option ${e.produkt===p?'selected':''}>${p}</option>`).join('')}</select></div>
        <div><label style="font-size:12px;color:#666">Menge (kg)</label><input id="mef_mengeKg" type="number" step="0.1" inputmode="decimal" value="${_esc(e.mengeKg||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Bemerkung</label><input id="mef_bemerkung" value="${_esc(e.bemerkung||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button class="btn btn-primary" onclick="IMKM.ernteSave('${e.id}')" style="flex:1;">Speichern</button>
        ${id?`<button class="btn btn-danger" onclick="IMKM.ernteDelete('${e.id}')">Löschen</button>`:''}
        <button class="btn btn-outline" onclick="closeModal()">Abbrechen</button>
      </div>
    `);
  }
  function ernteSave(id){
    const exists = (data.imkerErnte||[]).find(x=>x.id===id);
    const obj = {
      id, datum: document.getElementById('mef_datum').value,
      standId: document.getElementById('mef_standId').value,
      volkIds: exists ? (exists.volkIds||[]) : [],
      produkt: document.getElementById('mef_produkt').value,
      mengeKg: document.getElementById('mef_mengeKg').value,
      bemerkung: document.getElementById('mef_bemerkung').value.trim(),
      createdAt: exists ? exists.createdAt : new Date().toISOString()
    };
    if(!obj.datum){ toast('Datum nötig'); return; }
    if(exists) Object.assign(exists, obj);
    else data.imkerErnte.push(obj);
    if(typeof saveLocal==='function') saveLocal();
    closeModal(); render(); toast('Gespeichert');
  }
  function ernteDelete(id){
    if(!confirm('Ernte löschen?')) return;
    data.imkerErnte = data.imkerErnte.filter(x=>x.id!==id);
    if(typeof saveLocal==='function') saveLocal();
    closeModal(); render();
  }

  // ============ BEHANDLUNGEN ============
  const BEH_ART = ['Sommerbehandlung','Winterbehandlung','Schwarmbehandlung','Notbehandlung'];
  const BEH_EINHEIT = ['Volk','Ableger','Schwarm','Begattungskästchen'];
  function renderBehandlungen(root){
    const list = (data.imkerBehandlungen||[]).slice().sort((a,b)=>(b.datumVon||'').localeCompare(a.datumVon||''));
    root.innerHTML = `
      <button class="btn btn-primary btn-wide" style="margin-bottom:10px" onclick="IMKM.behForm()">+ Neue Behandlung</button>
      ${list.length ? list.map(b => {
        const st = findStand(b.standId);
        return `<div class="card" onclick="IMKM.behForm('${b.id}')" style="cursor:pointer;">
          <div style="display:flex;justify-content:space-between;">
            <div>
              <div style="font-weight:600;font-size:14px;">${_de(b.datumVon)}${b.datumBis&&b.datumBis!==b.datumVon?'–'+_de(b.datumBis):''} · ${_esc(b.handelsname||'')}</div>
              <div style="color:#888;font-size:12px;">${_esc(b.einheitenTyp||'Volk')} × ${_esc(b.anzahl||'?')} · ${_esc([b.anwendung,b.dosierung].filter(Boolean).join(' · '))}</div>
              <div style="color:#888;font-size:11px;">${_esc(standLabel(st))} · ${_esc(b.art||'')}</div>
            </div>
          </div>
        </div>`;
      }).join('') : emptyState('Noch keine Behandlungen.')}
    `;
  }
  function behForm(id){
    const b = id ? (data.imkerBehandlungen||[]).find(x=>x.id===id)
                 : { id:uid(), datumVon:_iso(new Date()), datumBis:'', standId:(data.imkerStaende[0]||{}).id||'', volkIds:[], einheitenTyp:'Volk', anzahl:'', handelsname:'', anwendung:'', applikation:'', dosierung:'', art:'Sommerbehandlung', herkunft:'', bemerkung:'', createdAt:new Date().toISOString() };
    const standOpts = (data.imkerStaende||[]).map(s=>`<option value="${s.id}" ${b.standId===s.id?'selected':''}>${_esc(standLabel(s))}</option>`).join('');
    const mittel = varroaMittel();
    const mittelKnown = mittel.some(m=>m.name===b.handelsname);
    const mittelSel = mittelKnown ? b.handelsname : (b.handelsname ? '__custom__' : '');
    openModal(`
      <h3 style="margin-top:0">${id?'Behandlung':'Neue Behandlung'}</h3>
      <div style="background:#f0f7ff;padding:6px 8px;border-radius:4px;font-size:11px;color:#555;margin-bottom:8px;">Felder gemäss Kantonsformular Behandlungsjournal Bienen</div>
      <div style="display:grid;gap:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label style="font-size:12px;color:#666">Von</label><input id="mbf_datumVon" type="date" value="${_esc(b.datumVon||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
          <div><label style="font-size:12px;color:#666">Bis (opt.)</label><input id="mbf_datumBis" type="date" value="${_esc(b.datumBis||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        </div>
        <div><label style="font-size:12px;color:#666">Stand</label><select id="mbf_standId" style="width:100%;padding:8px;font-size:16px;"><option value="">–</option>${standOpts}</select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><label style="font-size:12px;color:#666">Typ</label><select id="mbf_einheitenTyp" style="width:100%;padding:8px;font-size:16px;">${BEH_EINHEIT.map(t=>`<option ${b.einheitenTyp===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div><label style="font-size:12px;color:#666">Anzahl</label><input id="mbf_anzahl" type="number" inputmode="numeric" value="${_esc(b.anzahl||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        </div>
        <div>
          <label style="font-size:12px;color:#666">Mittel <span style="color:#888">(GR-Bestellliste)</span></label>
          <select id="mbf_mittelSel" onchange="IMKM.behMittelChange()" style="width:100%;padding:8px;font-size:16px;">
            <option value="">– wählen –</option>
            ${mittel.map(m=>`<option value="${_esc(m.name)}" ${mittelSel===m.name?'selected':''}>${_esc(m.name)}${m.einheit?' ('+_esc(m.einheit)+')':''}</option>`).join('')}
            <option value="__custom__" ${mittelSel==='__custom__'?'selected':''}>– Sonstiges (Freitext) –</option>
          </select>
          <input id="mbf_handelsname" value="${_esc(b.handelsname||'')}" placeholder="Handelsname eintragen..." style="width:100%;padding:8px;font-size:16px;margin-top:4px;display:${mittelSel==='__custom__'?'block':'none'};">
        </div>
        <div><label style="font-size:12px;color:#666">Anwendung</label>
          <select id="mbf_anwendung" style="width:100%;padding:8px;font-size:16px;">
            <option value="">– wählen –</option>
            ${ANWENDUNG_TYPEN.map(t=>`<option ${b.anwendung===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div><label style="font-size:12px;color:#666">Dispenser / Detail (opt.)</label><input id="mbf_applikation" value="${_esc(b.applikation||'')}" placeholder="z.B. Liebig-Dispenser" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Dosierung</label><input id="mbf_dosierung" value="${_esc(b.dosierung||'')}" placeholder="z.B. je 100 ml" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Art</label><select id="mbf_art" style="width:100%;padding:8px;font-size:16px;">${BEH_ART.map(t=>`<option ${b.art===t?'selected':''}>${t}</option>`).join('')}</select></div>
        <div><label style="font-size:12px;color:#666">Herkunft</label><input id="mbf_herkunft" value="${_esc(b.herkunft||'')}" placeholder="z.B. BI Heinrich Heusser" style="width:100%;padding:8px;font-size:16px;"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button class="btn btn-primary" onclick="IMKM.behSave('${b.id}')" style="flex:1;">Speichern</button>
        ${id?`<button class="btn btn-danger" onclick="IMKM.behDelete('${b.id}')">Löschen</button>`:''}
        <button class="btn btn-outline" onclick="closeModal()">Abbrechen</button>
      </div>
    `);
  }
  function behMittelChange(){
    const sel = document.getElementById('mbf_mittelSel').value;
    const txt = document.getElementById('mbf_handelsname');
    const anw = document.getElementById('mbf_anwendung');
    if(sel === '__custom__'){ txt.style.display='block'; txt.focus(); }
    else if(sel){
      txt.style.display='none'; txt.value = sel;
      const m = varroaMittel().find(x=>x.name===sel);
      if(m && m.defaultAnwendung && !anw.value) anw.value = m.defaultAnwendung;
    } else { txt.style.display='none'; txt.value=''; }
  }
  function behSave(id){
    const exists = (data.imkerBehandlungen||[]).find(x=>x.id===id);
    const mittelSel = document.getElementById('mbf_mittelSel').value;
    let handelsname = '';
    if(mittelSel==='__custom__') handelsname = document.getElementById('mbf_handelsname').value.trim();
    else if(mittelSel) handelsname = mittelSel;
    const obj = {
      id, datumVon: document.getElementById('mbf_datumVon').value,
      datumBis: document.getElementById('mbf_datumBis').value,
      standId: document.getElementById('mbf_standId').value,
      volkIds: exists ? (exists.volkIds||[]) : [],
      einheitenTyp: document.getElementById('mbf_einheitenTyp').value,
      anzahl: document.getElementById('mbf_anzahl').value,
      handelsname: handelsname,
      anwendung: document.getElementById('mbf_anwendung').value,
      applikation: document.getElementById('mbf_applikation').value.trim(),
      dosierung: document.getElementById('mbf_dosierung').value.trim(),
      art: document.getElementById('mbf_art').value,
      herkunft: document.getElementById('mbf_herkunft').value.trim(),
      bemerkung: exists ? (exists.bemerkung||'') : '',
      createdAt: exists ? exists.createdAt : new Date().toISOString()
    };
    if(!obj.datumVon){ toast('Datum nötig'); return; }
    if(!obj.handelsname){ toast('Mittel nötig (Pflicht Kanton)'); return; }
    if(exists) Object.assign(exists, obj);
    else data.imkerBehandlungen.push(obj);
    if(typeof saveLocal==='function') saveLocal();
    closeModal(); render(); toast('Behandlung gespeichert');
  }
  function behDelete(id){
    if(!confirm('Behandlung löschen?')) return;
    data.imkerBehandlungen = data.imkerBehandlungen.filter(x=>x.id!==id);
    if(typeof saveLocal==='function') saveLocal();
    closeModal(); render();
  }

  // ============ BEOBACHTUNGEN ============
  const BEO_KAT = ['Verhalten','Krankheit','Königin','Brut','Schädlinge (Varroa, Wespen)','Sonstiges'];
  function renderBeobachtungen(root){
    const list = (data.imkerBeobachtungen||[]).slice().sort((a,b)=>(b.datum||'').localeCompare(a.datum||''));
    root.innerHTML = `
      <button class="btn btn-primary btn-wide" style="margin-bottom:10px" onclick="IMKM.beoForm()">+ Neue Beobachtung</button>
      ${list.length ? list.map(o => {
        const st = findStand(o.standId);
        const v = findVolk(o.volkId);
        return `<div class="card" onclick="IMKM.beoForm('${o.id}')" style="cursor:pointer;${o.handlungsbedarf?'border-left:4px solid #e67e22;':''}">
          <div style="font-weight:600;font-size:14px;">${_de(o.datum)} · ${_esc(o.kategorie||'-')} ${o.handlungsbedarf?'⚠️':''}</div>
          <div style="color:#444;font-size:13px;">${_esc(o.beobachtung||'')}</div>
          <div style="color:#888;font-size:11px;">${_esc(standLabel(st))} ${v?' · '+_esc(volkLabel(v)):''}</div>
        </div>`;
      }).join('') : emptyState('Noch keine Beobachtungen.')}
    `;
  }
  function beoForm(id){
    const o = id ? (data.imkerBeobachtungen||[]).find(x=>x.id===id)
                 : { id:uid(), datum:_iso(new Date()), standId:(data.imkerStaende[0]||{}).id||'', volkId:'', kategorie:'Verhalten', beobachtung:'', handlungsbedarf:false, createdAt:new Date().toISOString() };
    const standOpts = (data.imkerStaende||[]).map(s=>`<option value="${s.id}" ${o.standId===s.id?'selected':''}>${_esc(standLabel(s))}</option>`).join('');
    const volkOpts = (o.standId ? voelkerAmStand(o.standId) : (data.imkerVoelker||[])).map(v=>`<option value="${v.id}" ${o.volkId===v.id?'selected':''}>${_esc(volkLabel(v))}</option>`).join('');
    openModal(`
      <h3 style="margin-top:0">${id?'Beobachtung':'Neue Beobachtung'}</h3>
      <div style="display:grid;gap:8px;">
        <div><label style="font-size:12px;color:#666">Datum</label><input id="mof_datum" type="date" value="${_esc(o.datum||'')}" style="width:100%;padding:8px;font-size:16px;"></div>
        <div><label style="font-size:12px;color:#666">Stand</label><select id="mof_standId" style="width:100%;padding:8px;font-size:16px;"><option value="">–</option>${standOpts}</select></div>
        <div><label style="font-size:12px;color:#666">Volk (optional)</label><select id="mof_volkId" style="width:100%;padding:8px;font-size:16px;"><option value="">–</option>${volkOpts}</select></div>
        <div><label style="font-size:12px;color:#666">Kategorie</label><select id="mof_kategorie" style="width:100%;padding:8px;font-size:16px;">${BEO_KAT.map(t=>`<option ${o.kategorie===t?'selected':''}>${t}</option>`).join('')}</select></div>
        <div><label style="font-size:12px;color:#666">Beobachtung</label><textarea id="mof_beobachtung" style="width:100%;padding:8px;min-height:80px;font-size:14px;">${_esc(o.beobachtung||'')}</textarea></div>
        <div><label style="font-size:13px;"><input type="checkbox" id="mof_handlungsbedarf" ${o.handlungsbedarf?'checked':''}> Handlungsbedarf</label></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;">
        <button class="btn btn-primary" onclick="IMKM.beoSave('${o.id}')" style="flex:1;">Speichern</button>
        ${id?`<button class="btn btn-danger" onclick="IMKM.beoDelete('${o.id}')">Löschen</button>`:''}
        <button class="btn btn-outline" onclick="closeModal()">Abbrechen</button>
      </div>
    `);
  }
  function beoSave(id){
    const exists = (data.imkerBeobachtungen||[]).find(x=>x.id===id);
    const obj = {
      id, datum: document.getElementById('mof_datum').value,
      standId: document.getElementById('mof_standId').value,
      volkId: document.getElementById('mof_volkId').value,
      kategorie: document.getElementById('mof_kategorie').value,
      beobachtung: document.getElementById('mof_beobachtung').value.trim(),
      handlungsbedarf: document.getElementById('mof_handlungsbedarf').checked,
      createdAt: exists ? exists.createdAt : new Date().toISOString()
    };
    if(!obj.datum){ toast('Datum nötig'); return; }
    if(exists) Object.assign(exists, obj);
    else data.imkerBeobachtungen.push(obj);
    if(typeof saveLocal==='function') saveLocal();
    closeModal(); render(); toast('Gespeichert');
  }
  function beoDelete(id){
    if(!confirm('Löschen?')) return;
    data.imkerBeobachtungen = data.imkerBeobachtungen.filter(x=>x.id!==id);
    if(typeof saveLocal==='function') saveLocal();
    closeModal(); render();
  }

  // ============ EXPORT ============
  global.IMKM = {
    render, ensureData, setSub,
    standForm, standSave, standDelete,
    volkForm, volkSave, volkDelete, volkStandChange, volkTypChange,
    arbForm, arbSave, arbDelete,
    ernteForm, ernteSave, ernteDelete,
    behForm, behSave, behDelete, behMittelChange,
    beoForm, beoSave, beoDelete,
    VERSION:'1.0'
  };
  if(typeof console!=='undefined') console.log('IMKEREI Mobile v'+global.IMKM.VERSION+' geladen.');
})(window);
