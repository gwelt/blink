function Bauer() {
	this.koerner=0;
	this.maschinen=[]; maschinen_preisleistungsliste.forEach((m)=>{this.maschinen.push(new Maschine(m.typ,0))});
	this.verbesserungen=[];
	return this;
}

Bauer.prototype.leistung = function() {return 1}
Bauer.prototype.besitzt = function() {return this.koerner}
Bauer.prototype.erhaelt = function(n) {this.koerner+=n; this.aktualisiert_buchhaltung();}
Bauer.prototype.klickt = function() {this.erhaelt(this.leistung())}
Bauer.prototype.zahlt = function(n) {if (this.besitzt()>=n) {this.erhaelt(-n); return true} else {return false}}
Bauer.prototype.aktualisiert_buchhaltung = function() {
	document.getElementById('kk_koerner').innerHTML=Math.floor(this.besitzt());
	document.getElementById('kk_produktion').innerHTML=this.maschinen.reduce((a,c)=>{return a+c.leistung()},0).toFixed(1)+' kps';
	let preissegment_warnungen=0;
	this.maschinen.forEach((m)=>{
		if ((this.besitzt()<m.preis())&&(m.anzahl<1)) {preissegment_warnungen++} else {preissegment_warnungen=0}
		if (preissegment_warnungen<2) {
			document.getElementById('kk_row_'+m.typ).style.display='flex';
			document.getElementById('kk_cell_'+m.typ+'_typ').innerHTML=m.typ+' ('+maschinen_verzeichnis(m.typ).leistung(1)+'kps)';
			let preis=document.getElementById('kk_cell_'+m.typ+'_preis');
			if (this.besitzt()>=m.preis()) {		
				preis.innerHTML='$'+m.preis();
				preis.onclick=()=>{m.kaufen(this)};
				preis.style.cursor='pointer'; preis.style.backgroundColor='#E0E0E0';
			} else {preis.style.cursor=''; preis.style.backgroundColor='';}
			if ((m.anzahl>0)||(this.besitzt()*2>=m.preis())) {preis.innerHTML='$'+m.preis()}
			document.getElementById('kk_cell_'+m.typ+'_anzahl').innerHTML=m.anzahl;
		}
	});
}
Bauer.prototype.schreibt_konto = function() {localStorage.setItem("kk_bauer",JSON.stringify(this))}
Bauer.prototype.reset_konto = function() {localStorage.removeItem("kk_bauer");this.liest_konto();}
Bauer.prototype.liest_konto = function() {
	let b=undefined; try {b=JSON.parse(localStorage.getItem("kk_bauer"))} catch {()=>{}}
	this.koerner=b?b.koerner:0;
	this.maschinen.forEach((m)=>{m.stopp(); m.anzahl=b?(b.maschinen.find(e=>e.typ==m.typ)||{"anzahl":0}).anzahl:0; m.start(this);});
	this.verbesserungen=b?b.verbesserungen:0;
	this.aktualisiert_buchhaltung();
}

function Maschine(typ,anzahl) {
	this.typ=typ;
	this.anzahl=anzahl||0;
	this.prozess_id=undefined;
	return this;
}

Maschine.prototype.leistung = function() {return maschinen_verzeichnis(this.typ).leistung(this.anzahl)}
Maschine.prototype.preis = function() {return maschinen_verzeichnis(this.typ).preis(this.anzahl)}
Maschine.prototype.kaufen = function(besitzer) {if (besitzer.zahlt(this.preis())) {this.anzahl++; this.start(besitzer); return true;} else {return false}}
Maschine.prototype.start = function(besitzer) {this.stopp(); this.prozess_id=setInterval(()=>{besitzer.erhaelt(this.leistung()/10)},100)}
Maschine.prototype.stopp = function() {if (this.prozess_id) {clearInterval(this.prozess_id)}}

function maschinen_verzeichnis(typ) {return maschinen_preisleistungsliste.find(e=>e.typ==typ)||{"preis":()=>{},"leistung":()=>{}}}
const maschinen_preisleistungsliste = [
	{"typ":"Kueken","preis":(n)=>{return Math.round(Math.exp(n/6.6)*18)},"leistung":(n)=>{return n*0.1}},
	{"typ":"Huhn","preis":(n)=>{return Math.round(Math.exp(n/6.6)*maschinen_verzeichnis('Kueken').preis(25))},"leistung":(n)=>{return n*1}},
	{"typ":"Doppelhuhn","preis":(n)=>{return Math.round(Math.exp(n/6.6)*maschinen_verzeichnis('Huhn').preis(20))},"leistung":(n)=>{return n*2}},
	{"typ":"Kornado","preis":(n)=>{return Math.round(Math.exp(n/6.6)*maschinen_verzeichnis('Doppelhuhn').preis(25))},"leistung":(n)=>{return n*8.4}}
];


/* === INITIALISIERUNG ================================================================== */
var bauer=new Bauer();
kk_HTML(bauer);
bauer.liest_konto();
setInterval(()=>{bauer.schreibt_konto()},60000);
window.onunload = function() {bauer.schreibt_konto()}

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
	kk_koerner.style.padding='0.25rem 0';
	kk_koerner.style.fontWeight='bold';
	kk_produktion.innerHTML='-';
	kk_produktion.style.padding='0.1rem 0';
	kk_produktion.style.fontSize='0.75rem';
	kk_btn_klick.style.margin='1rem 0';
	kk_btn_klick.appendChild(document.createTextNode('Korn +1'));
	kk_btn_klick.onclick=()=>{bauer.klickt()};
	let kk_marktplatz=document.createElement('div'); kk_marktplatz.id='kk_marktplatz'; kk.appendChild(kk_marktplatz);
	maschinen_preisleistungsliste.forEach((m)=>{
		let r=document.createElement('div');
		r.id='kk_row_'+m.typ;
		r.style.display='none';
		r.style.justifyContent='space-between';
		function cell(id,width) {
			let c=document.createElement('div');
			c.id=id; c.style.fontSize='0.75rem'; c.style.border='1px solid black'; c.style.borderRadius='0'; c.style.margin='0 0 0.2rem 0'; c.style.padding='0.2rem'; c.style.textAlign='right'; c.style.overflow='hidden'; c.style.maxWidth=width;
			return c;
		}
		r.appendChild(cell('kk_cell_'+m.typ+'_typ','50%'));
		r.appendChild(cell('kk_cell_'+m.typ+'_preis','32%'));
		r.appendChild(cell('kk_cell_'+m.typ+'_anzahl','14%'));
		kk_marktplatz.appendChild(r);
	});
}
