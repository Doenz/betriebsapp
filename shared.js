/* AUTO-GENERATED — NICHT HÄNDISCH EDITIEREN!
 * Quelle: shared/shared.js
 * Sync:   node dev/sync-shared.js  (läuft auch automatisch vor jedem bump-version)
 * Stand:  2026-05-31T17:11:32.531Z
 */
/**
 * Betriebsapp – Shared Module  (MASTER)
 *
 * Gemeinsame Funktionen und Konstanten fuer Haupt-App (index.html)
 * und Mobile-App (mobile-app/index.html).
 *
 * Verwendung:
 *   <script src="shared/shared.js"></script>   (Haupt-App)
 *   <script src="shared.js"></script>          (Mobile-App, Auto-Sync)
 *
 * Namespace: window.BS
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MASTER-DATEI — Änderungen NUR hier reinschreiben.
 * mobile-app/shared.js wird automatisch beim nächsten `node dev/bump-version.js`
 * synchronisiert. Manueller Sync: `node dev/sync-shared.js`.
 * Drift-Check: `node dev/sync-shared.js --check` (gibt Fehler aus, wenn nicht synchron).
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

(function(global){
  'use strict';

  // ============ KONSTANTEN ============
  const SUPABASE_URL = 'https://glfcazurctiyxmrvbjdy.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_jsQr_GTzKE4jnPEQzEGqmQ_0IQhuTy3';

  // Was wird synchronisiert (mit Cloud)
  const SYNC_ALLOWED_KEYS = [
    'tiere','besamungen','behandlungen','schlachtungen',
    'felder','journal','wiesenSettings','wiesenEntries',
    // Stall + Notizen (auch auf Mobile verfuegbar)
    'stallUnterhalt','notizen','allgemeineNotizen',
    // Gruppentypen (verwaltbare Tier-Stallgruppen)
    'gruppenTypen',
    // Imkerei
    'imkerSettings','imkerStaende','imkerVoelker','imkerArbeiten',
    'imkerErnte','imkerBehandlungen','imkerBeobachtungen'
  ];
  // Was NIEMALS in die Cloud geht (bleibt lokal auf PC)
  const SYNC_FORBIDDEN_KEYS = ['maschinen','wartungen','services','rechnungen'];

  // ============ STRING / HTML ============
  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  // ============ DATUM / ZEIT ============
  function deCH(d){
    if(!d) return '';
    const x = new Date(d);
    if(isNaN(x)) return String(d);
    return x.toLocaleDateString('de-CH');
  }
  function toISO(d){
    if(!d) return '';
    if(typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0,10);
    const x = new Date(d);
    if(isNaN(x)) return '';
    return x.toISOString().slice(0,10);
  }
  function ageDays(d){
    if(!d) return null;
    const x = new Date(d);
    if(isNaN(x)) return null;
    return Math.floor((Date.now() - x.getTime())/86400000);
  }
  function daysBetween(a, b){
    if(!a || !b) return 0;
    const da = new Date(a), db = new Date(b);
    if(isNaN(da) || isNaN(db)) return 0;
    return Math.abs(Math.floor((db - da)/86400000));
  }

  // ============ TVD ============
  function normTvd(t){
    return String(t||'').replace(/\D/g,'');
  }

  // ============ TIER-KATEGORIEN ============
  function gveKategorie(tier){
    if(!tier) return 'Kuh';
    if(tier.kategorie && tier.kategorie !== 'auto') return tier.kategorie;
    if(tier.erstkalbe) return 'Kuh';
    const age = ageDays(tier.gebDatum);
    if(age == null) return 'Kuh';
    if(age > 425) return 'Rind';
    return 'Kalb';
  }

  // ============ ALP ============
  function stripAlpPlus(a){
    if(!a) return '';
    if(a === 'Portein+') return 'Portein';
    if(a === 'Sarn+') return 'Sarn';
    if(a === 'Merla+') return 'Merla';
    return a;
  }
  function addAlpPlus(a){
    if(!a) return '';
    if(a === 'Portein') return 'Portein+';
    if(a === 'Sarn') return 'Sarn+';
    if(a === 'Merla') return 'Merla+';
    return a;
  }

  // ============ DATEN-HELFER (stateful, data als Parameter) ============
  function istGeschlachtet(tvd, data){
    if(!tvd || !data || !data.schlachtungen) return false;
    const n = normTvd(tvd);
    return data.schlachtungen.some(s => normTvd(s.tvd) === n);
  }
  function findTier(data, tvd){
    if(!data || !data.tiere) return null;
    const n = normTvd(tvd);
    return data.tiere.find(t => normTvd(t.tvd) === n) || null;
  }
  function hatKalb(data, kuhTvd){
    if(!data || !data.tiere) return false;
    const n = normTvd(kuhTvd);
    return data.tiere.some(k =>
      normTvd(k.mutterTvd) === n &&
      gveKategorie(k) === 'Kalb' &&
      !istGeschlachtet(k.tvd, data) &&
      !k.abgang
    );
  }
  // Setzt/entfernt das "+" an der Alp-Bezeichnung einer Kuh basierend darauf,
  // ob sie aktuell ein Kalb hat. Mutiert data in-place.
  function updateAlpKalbStatus(data, kuhTvd){
    if(!data || !data.tiere) return;
    const t = findTier(data, kuhTvd);
    if(!t || !t.alp) return;
    if(gveKategorie(t) === 'Kalb') return; // Kaelber bekommen kein +
    const basis = stripAlpPlus(t.alp);
    t.alp = hatKalb(data, kuhTvd) ? addAlpPlus(basis) : basis;
  }

  // ============ CLOUD / FEHLER-INTERPRETATION ============
  function interpretFetchError(e){
    const msg = (e && e.message) || String(e);
    if(/HTTP 401|HTTP 403/.test(msg)) return 'Falscher PIN oder Key';
    if(/HTTP 404/.test(msg)) return 'Tabelle fehlt in Supabase';
    if(/HTTP 5\d\d/.test(msg)) return 'Supabase-Server-Fehler';
    if(/Failed to fetch|NetworkError|Network request failed/i.test(msg)) return 'Keine Internet-Verbindung';
    if(/Kein PIN/.test(msg)) return 'Kein PIN gesetzt';
    return msg;
  }

  // ============ EXPORT ============
  const BS = {
    // Konstanten
    SUPABASE_URL, SUPABASE_KEY,
    SYNC_ALLOWED_KEYS, SYNC_FORBIDDEN_KEYS,
    // String/HTML
    esc,
    // Datum
    deCH, toISO, ageDays, daysBetween,
    // TVD
    normTvd,
    // Kategorien
    gveKategorie,
    // Alp
    stripAlpPlus, addAlpPlus,
    // Daten-Helfer
    istGeschlachtet, findTier, hatKalb, updateAlpKalbStatus,
    // Cloud
    interpretFetchError,
    // Versions-Stempel (beim Laden sichtbar)
    VERSION: '1.3'
  };

  global.BS = BS;

  // Convenience: Im Browser-Kontext zur Console loggen
  if(typeof window !== 'undefined' && window.console){
    console.log('Betriebsapp Shared Module v' + BS.VERSION + ' geladen.');
  }
})(typeof self !== 'undefined' ? self : this);
