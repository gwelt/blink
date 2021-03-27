const Tail = require('tail').Tail;
const fetch = require('node-fetch');
const fs = require('fs')
const simpleParser = require('mailparser').simpleParser;
var test_mode=false;

function Email (date,from,to,subject,text,html,size) {
  this.date=date;
  this.from=from;
  this.to=to;
  this.subject=subject;
  this.text=text;
  this.html=html;
  this.size=size;
  return this;
}

function PatientParser(mailfile,eMailHandlerFunction,delimiter,timeout) {
  this.buffer='';
  this.timeoutObject=undefined;
  this.eMailHandlerFunction=eMailHandlerFunction;
  this.delimiter=delimiter||/[\r]{0,1}\n/g;
  this.timeoutMillis=timeout||1500;
  this.mailfile=mailfile;

  if (fs.existsSync('testdata')) {test_mode=true; this.mailfile='testdata';}
  if (fs.existsSync(this.mailfile)) {
    console.log(new Date().toISOString()+' | start tailing '+this.mailfile);
    const tail = new Tail(this.mailfile,{separator: null, fromBeginning: test_mode, fsWatchOptions: {}, follow: true, logger: console, flushAtEOF: true});
    tail.on("error", function(error) {console.log('ERROR: '+error)});
    tail.on("line", function(data) {patientParser.add(data)});
  } else {
    console.log('NO MAILFILE. NO START.');
  }

  return this;
}

PatientParser.prototype.add = function(data) {
  console.log('adding '+data.length+' characters to buffer')
  clearTimeout(this.timeoutObject);
  this.buffer+=data;
  let buffer_array=this.buffer.split(this.delimiter);
  console.log('buffer array contains '+buffer_array.length+' elements')
  this.buffer=buffer_array.pop();
  while (buffer_array.length>0) {
    this.parse(buffer_array.shift());
  }
  console.log('being patient now... waiting for more data')
  this.timeoutObject=setTimeout(()=>{let b=this.buffer; this.buffer=''; this.parse(b);},this.timeoutMillis);
}

PatientParser.prototype.parse = function(data) {
  console.log('parsing '+data.length+' characters')
  function st(text) {return unescape(text).replace(/[^\w\s\däüöÄÜÖß\.,'!\@#$^&%*()\+=\-\[\]\/{}\|:\?]/gm,'').slice(0,256)}
  simpleParser(data, {}, (err, p) => {
    let id=p.messageId;
    let date=p.date;
    let from=p.from; if (from!==undefined&&from.value!==undefined) {from=from.value[0].address} else {from=undefined}
    let to=p.to; if (to!==undefined&&to.value!==undefined) {to=to.value[0].address} else {to=undefined}
    let subject=p.subject;
    let text_plain=p.text?st(p.text.toString().replace(/<[^>]*>/gm,'').replace(/[\n]{2,}/gm,'\n').replace(/[\ ]{2,}/gm,'').trim()):undefined;
    let text_html=p.html?st(p.html.toString().replace(/<[^>]*>/gm,'').replace(/[\n]{1,}/gm,'').replace(/[\ ]{2,}/gm,'').trim()):undefined;
    let size=data.length;
    let mail=new Email(date,from,to,subject,text_plain,text_html,size);
    
    // workaround for blink PIN special
    if (from=='no-reply@blinkforhome.com') {
      let m=/\n([0-9]{6})<\/strong>/i.exec(p.html);
      if (m) {mail.blinkPIN=st(m[1])} 
    }
    
    this.eMailHandlerFunction(mail);
    // FLUSH MAIL-FILE
    //if (!test_mode) {fs.writeFile(this.mailfile,'',()=>{})};

  });
}

var patientParser=new PatientParser('/var/mail/mailhook',(mail)=>{

  if (test_mode) {console.log(mail); return;} // testing...

  // POST BLINK-PIN TO BLINK-API
  if (mail.blinkPIN!==undefined) {
    console.log('=== BLINK VERIFY PIN: '+mail.blinkPIN+' ===');
    let body = { command: 'verify', pin: mail.blinkPIN };
    fetch('http://localhost:3010/api', { // BLINK
      method: 'post',
      body:    JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    .catch(err => {console.error(err); return;})
    .then(res => res.json())
    .then(json => console.log('BLINK-API-REQUEST_BODY: '+JSON.stringify(body)+' | BLINK-API-REPLY: '+JSON.stringify(json)));
  }
  
},/\nFrom /g,3000);

