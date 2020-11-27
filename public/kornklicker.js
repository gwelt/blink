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
	this.maschinen.forEach((m)=>{
		let preis=m.preis();
		if ((m.anzahl>0)||(this.besitzt()>=preis/10)) {
			document.getElementById('kk_row_'+m.typ).style.display='flex';
			document.getElementById('kk_cell_'+m.typ+'_typ').innerHTML=m.typ+' ('+maschinen_verzeichnis(m.typ).leistung(1)+'kps)';
			document.getElementById('kk_cell_'+m.typ+'_anzahl').innerHTML=m.anzahl;
			let e_preis=document.getElementById('kk_cell_'+m.typ+'_preis');
			if ((this.besitzt()>=preis/2)||(m.anzahl>0)) {e_preis.innerHTML='$'+preis}
			if (this.besitzt()>=preis) {e_preis.onclick=()=>{m.kaufen(this)}; e_preis.style.cursor='pointer'; e_preis.style.backgroundColor='#0078D4'; e_preis.style.color='#FFF'; e_preis.style.border='0px solid #FFF';}
			else {e_preis.style.cursor=''; e_preis.style.backgroundColor=''; e_preis.style.color='';}
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
	let kk_png_klick_container=document.createElement('div'); kk.appendChild(kk_png_klick_container);
	let kk_png_klick=document.createElement('IMG'); kk_png_klick_container.appendChild(kk_png_klick);
	kk.style.position='relative';
	//kk.style.backgroundColor='#fff';
	kk.style.top='2rem';
	kk.style.padding='1rem';
	kk_koerner.innerHTML='-';
	kk_koerner.style.padding='0.25rem 0';
	kk_koerner.style.fontWeight='bold';
	kk_produktion.innerHTML='-';
	kk_produktion.style.padding='0.1rem 0';
	kk_produktion.style.fontSize='0.75rem';
	kk_png_klick.src='kk_koerner.png';
	kk_png_klick.width=kk.clientWidth/2;
	kk_png_klick.style.position='relative';
	kk_png_klick.style.left='4%';
	kk_png_klick.style.transition='all 0.5s';
	kk_png_klick.style.cursor='pointer';
	kk_png_klick.onclick=()=>{bauer.klickt()};
	let kk_marktplatz=document.createElement('div'); kk_marktplatz.id='kk_marktplatz'; kk.appendChild(kk_marktplatz);
	maschinen_preisleistungsliste.forEach((m)=>{
		let r=document.createElement('div');
		r.id='kk_row_'+m.typ;
		r.style.display='none';
		r.style.justifyContent='space-between';
		r.style.borderRadius='0';
		r.style.backgroundColor='#f0f0f0';
		function cell(id,width) {
			let c=document.createElement('div');
			c.id=id; c.style.backgroundColor=''; c.style.fontSize='0.75rem'; c.style.border='1px solid #f0f0f0'; c.style.borderRadius='0'; c.style.margin='0.1rem'; c.style.padding='0.2rem'; c.style.textAlign='right'; c.style.overflow='hidden'; c.style.maxWidth=width;
			return c;
		}
		r.appendChild(cell('kk_cell_'+m.typ+'_typ','50%'));
		r.appendChild(cell('kk_cell_'+m.typ+'_preis','32%'));
		r.appendChild(cell('kk_cell_'+m.typ+'_anzahl','14%'));
		kk_marktplatz.appendChild(r);
	});
}
