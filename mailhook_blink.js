const fetch = require('node-fetch');

function act(data) {
  //console.log(data); return; // testing...
  let body = { command: 'verify', pin: data };
  fetch('http://localhost:3010/api', {
    method: 'post',
    body:    JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
	.catch(err => {return err})
	.then(res => res.json())
  .then(json => console.log('REQUEST_BODY: '+JSON.stringify(body)+' | reply from blink-API: '+JSON.stringify(json)));
} 

const Tail = require('tail').Tail;
const tail = new Tail('/var/mail/mailhook',{separator: /[\r]{0,1}\n/, fromBeginning: false, fsWatchOptions: {}, follow: true, logger: console});

tail.on("error", function(error) {
  console.log('ERROR: '+error);
});

tail.on("line", function(data) {
  //<strong>Your verification PIN:<br> 
  //123456</strong>
  let m=/^([0-9]{6})<\/strong>/i.exec(data);
  if (m) {act(m[1])}
});
 
