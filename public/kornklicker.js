


function Bauer(koerner,maschinen,verbesserungen) {
	this.koerner=koerner||0;
	this.maschinen=maschinen||[]; if (!this.maschinen.length) {preisleistungsliste.forEach((m)=>{this.maschinen.push(new Maschine(m.typ,this,0))})};
	this.verbesserungen=verbesserungen||[];
	return this;
}

Bauer.prototype.leistung = function() {return 1}
Bauer.prototype.besitzt = function() {return this.koerner}
Bauer.prototype.erhaelt = function(n) {this.koerner+=n; kk_update(this);}
Bauer.prototype.klickt = function() {this.erhaelt(this.leistung())}
Bauer.prototype.zahlt = function(n) {if (this.besitzt()>=n) {this.erhaelt(-n); return true} else {return false}}



function Maschine(typ,besitzer,anzahl) {
	this.typ=typ;
	this.besitzer=besitzer;
	this.anzahl=anzahl||0;
	this.prozess_id=undefined;
	return this;
}

Maschine.prototype.leistung = function() {return verzeichnis(this.typ).leistung(this)}
Maschine.prototype.preis = function() {return verzeichnis(this.typ).preis(this)}
Maschine.prototype.kaufen = function() {if (this.besitzer.zahlt(this.preis())) {this.anzahl++; this.start(); return true;} else {return false}}
Maschine.prototype.start = function() {this.stopp(); this.prozess_id=setInterval(()=>{this.besitzer.erhaelt(this.leistung())},1000)}
Maschine.prototype.stopp = function() {if (this.prozess_id) {clearInterval(this.prozess_id)}}
Maschine.prototype.erstelle_angebots_button = function() {
	let b = document.createElement('button');
	b.appendChild(document.createTextNode(this.typ+' ($'+this.preis()+') #'+this.anzahl));
	b.onclick=()=>{if (this.kaufen()) {b.firstChild.data=this.typ+' ($'+this.preis()+') #'+this.anzahl}; kk_update(this.besitzer);};
	return b;
}

function verzeichnis(typ) {return preisleistungsliste.find(e=>e.typ==typ)||{"preis":0,"leistung":0}}
const preisleistungsliste = [
	{"typ":"1/s","preis":m=>Math.round(Math.exp(m.anzahl)*(m.leistung()||1)+15),"leistung":m=>1*m.anzahl},
	{"typ":"2/s","preis":m=>Math.round(Math.exp(m.anzahl)*(m.leistung()||1)+55),"leistung":m=>2*m.anzahl},
	{"typ":"3/s","preis":m=>Math.round(Math.exp(m.anzahl)*(m.leistung()||1)+185),"leistung":m=>3*m.anzahl}
];



/* === INITIALISIERUNG ================================================================== */
var bauer=new Bauer();

/* === HTML-DARSTELLUNG ================================================================= */
kk_start(bauer);
function kk_start(bauer) {
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
	bauer.maschinen.forEach((m)=>{kk.appendChild(m.erstelle_angebots_button())});
	kk_update(bauer);
}
function kk_update(b) {
	document.getElementById('kk_koerner').innerHTML=Math.floor(b.besitzt());
	document.getElementById('kk_produktion').innerHTML='Koerner pro Sekunde: '+b.maschinen.reduce((a,c)=>{return a+c.leistung()},0).toFixed(2);
}