function Bauer(koerner,maschinen,verbesserungen) {
	this.koerner=koerner||0;
	this.maschinen=maschinen||[]; if (!this.maschinen.length) {maschinen_preisleistungsliste.forEach((m)=>{this.maschinen.push(new Maschine(m.typ,this,0))})};
	this.verbesserungen=verbesserungen||[];
	return this;
}

Bauer.prototype.leistung = function() {return 1}
Bauer.prototype.besitzt = function() {return this.koerner}
Bauer.prototype.erhaelt = function(n) {this.koerner+=n; this.aktualisiert_buchhaltung();}
Bauer.prototype.klickt = function() {this.erhaelt(this.leistung())}
Bauer.prototype.zahlt = function(n) {if (this.besitzt()>=n) {this.erhaelt(-n); return true} else {return false}}
Bauer.prototype.aktualisiert_buchhaltung = function() {
	document.getElementById('kk_koerner').innerHTML=Math.floor(this.besitzt());
	document.getElementById('kk_produktion').innerHTML='Koerner pro Sekunde: '+this.maschinen.reduce((a,c)=>{return a+c.leistung()},0).toFixed(2);
	this.maschinen.forEach((m)=>{
		document.getElementById('kk_cell_'+m.typ+'_typ').innerHTML=m.typ;
		let preis=document.getElementById('kk_cell_'+m.typ+'_preis');
		preis.innerHTML='$'+m.preis();
		if (this.besitzt()>=m.preis()) {		
			preis.onclick=()=>{m.kaufen()};
			preis.style.cursor='pointer'; preis.style.backgroundColor='#F0F0F0';
		} else {preis.style.cursor=''; preis.style.backgroundColor='';}
		document.getElementById('kk_cell_'+m.typ+'_anzahl').innerHTML=m.anzahl;
	});
}


function Maschine(typ,besitzer,anzahl) {
	this.typ=typ;
	this.besitzer=besitzer;
	this.anzahl=anzahl||0;
	this.prozess_id=undefined;
	return this;
}

Maschine.prototype.leistung = function() {return maschinen_verzeichnis(this.typ).leistung(this)}
Maschine.prototype.preis = function() {return maschinen_verzeichnis(this.typ).preis(this)}
Maschine.prototype.kaufen = function() {if (this.besitzer.zahlt(this.preis())) {this.anzahl++; this.start(); return true;} else {return false}}
Maschine.prototype.start = function() {this.stopp(); this.prozess_id=setInterval(()=>{this.besitzer.erhaelt(this.leistung()/10)},100)}
Maschine.prototype.stopp = function() {if (this.prozess_id) {clearInterval(this.prozess_id)}}

function maschinen_verzeichnis(typ) {return maschinen_preisleistungsliste.find(e=>e.typ==typ)||{"preis":0,"leistung":0}}
const maschinen_preisleistungsliste = [
	{"typ":"Huhn","preis":m=>Math.round(Math.exp(m.anzahl/6.6)*18*(m.leistung()||1)),"leistung":m=>1*m.anzahl},
	{"typ":"Doppelhuhn","preis":m=>Math.round(Math.exp(m.anzahl/6.6)*20*(m.leistung()||2)),"leistung":m=>2*m.anzahl},
	{"typ":"Quadruhn","preis":m=>Math.round(Math.exp(m.anzahl/6.6)*22*(m.leistung()||4)),"leistung":m=>4*m.anzahl}
];


/* === INITIALISIERUNG ================================================================== */
const bauer=new Bauer(); kk_HTML(bauer); bauer.erhaelt(0);

/* === HTML-DARSTELLUNG ================================================================= */
function kk_HTML(bauer) {
	let kk=document.getElementById('kornklicker');
	let kk_koerner=document.createElement('div'); kk_koerner.id='kk_koerner'; kk.appendChild(kk_koerner);
	let kk_produktion=document.createElement('div'); kk_produktion.id='kk_produktion'; kk.appendChild(kk_produktion);
	let kk_btn_klick=document.createElement('button'); kk.appendChild(kk_btn_klick);
	kk.style.position='relative';
	kk.style.backgroundColor='#c0c0c0';
	kk.style.top='2rem';
	kk.style.padding='1rem';
	kk_koerner.innerHTML='-';
	kk_koerner.style.padding='0.5rem 0';
	kk_produktion.innerHTML='-';
	kk_produktion.style.padding='0.5rem 0';
	kk_produktion.style.fontSize='0.8rem';
	kk_btn_klick.style.margin='0.5rem 0';
	kk_btn_klick.appendChild(document.createTextNode('Klick ein Korn!'));
	kk_btn_klick.onclick=()=>{bauer.klickt()};
	let kk_marktplatz=document.createElement('div'); kk_marktplatz.id='kk_marktplatz'; kk.appendChild(kk_marktplatz);
	maschinen_preisleistungsliste.forEach((m)=>{
		let r=document.createElement('div');
		r.style.display='flex';
		r.style.justifyContent='space-between';
		function cell(id,width) {
			let c=document.createElement('div');
			c.id=id; c.style.fontSize='0.8rem'; c.style.border='1px solid black'; c.style.borderRadius='0'; c.style.margin='0 0 0.2rem 0'; c.style.padding='0.2rem'; c.style.textAlign='right'; c.style.overflow='hidden'; c.style.maxWidth=width;
			c.innerHTML='&nbsp;';
			return c;
		}
		r.appendChild(cell('kk_cell_'+m.typ+'_typ','50%'));
		r.appendChild(cell('kk_cell_'+m.typ+'_preis','32%'));
		r.appendChild(cell('kk_cell_'+m.typ+'_anzahl','14%'));
		kk_marktplatz.appendChild(r);
	});
}
