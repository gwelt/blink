var express = require('express');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');
var path = require('path');
var config = {}; try {config=require('./config.json')} catch(err){};
var port = process.env.PORT || config.port || 3000;
const Blink = require('./blink.js');
var blink = new Blink(config.email,config.password,config.unique_id,config.account_id,config.client_id,config.authtoken,config.region_tier);
server.listen(port, function () { console.log('\x1b[44m SERVER LISTENING ON PORT '+port+' \x1b[0m'); blink_init(); });
process.on('SIGINT', function(){ if (config.SIGINT==undefined) {config.SIGINT=true; console.log('SIGINT'); process.exit(0);} });
process.on('SIGTERM', function(){ if (config.SIGTERM==undefined) {config.SIGTERM=true; console.log('SIGTERM'); process.exit(0);} });

app.use(bodyParser.json({ strict: true }));
app.use(function (error, req, res, next){next()}); // don't show error-message, if it's not JSON ... just ignore it
app.use(bodyParser.urlencoded({ extended: true }));
app.use('(/blink)?/:file?', function(req,res) {
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	//console.log('>>> '+req.params.file+' > '+JSON.stringify(req.body));

	switch (req.params.file) {

		case 'api':
			switch (req.body.command) {

				case 'login':
					if (req.body.email) {blink.email=req.body.email};
					if (req.body.password) {blink.password=req.body.password};
					blink.LOGIN((r)=>{
						res.set('Content-Type','application/json'); res.end(r);
						// TODO: disable sending result (r) in prod, because it contains authtoken
						//res.set('Content-Type','text/plain'); res.end('OK');
					});
					break;

				case 'verify':
					blink.VERIFY(req.body.pin,(r)=>{
						res.set('Content-Type','application/json'); res.end(r);
						//res.set('Content-Type','text/plain'); res.end('OK');
					});
					break;

				case 'logout':
					blink.LOGOUT((r)=>{
						res.set('Content-Type','application/json'); res.end(r);
						//res.set('Content-Type','text/plain'); res.end('OK');
					});
					break;

				case 'update':
					blink.UPDATE((r)=>{
						res.set('Content-Type','application/json'); res.end(r);
						//res.set('Content-Type','text/plain'); res.end('OK');
					});
					break;

				case 'update_cam':
					blink.UPDATE_CAM(undefined,undefined,(r)=>{
						res.set('Content-Type','application/json'); res.end(r);
						//res.set('Content-Type','text/plain'); res.end('OK');
					});
					break;

				case 'get_homescreen':
					res.set('Content-Type','application/json');
					res.end(blink.homescreen?JSON.stringify(blink.homescreen):'{}');
					break;

				case 'get_log':
					res.set('Content-Type','text/plain');
					res.end(blink.log.read());
					break;

				default:
					res.end('{"error":"unknown api-call"}');
					//res.end(JSON.stringify(req.body));
					break;

			}
			break;

		case 'cam.jpg':
			blink.GET_IMAGE(undefined,(r)=>{
				if (r) {
					res.set('Content-Type','image/jpeg');
					res.end(r,'binary');
				} else {res.end('HELLO. THIS IS BLINK.\nI DON\'T SEE CAM.JPG HERE.')}
			});
			break;

		case 'delete_credentials':
			blink.email=undefined;
			blink.password=undefined;
			res.end();
			break;

		case 'delete_authtoken':
			blink.authtoken=undefined;
			
		case undefined:
			res.sendFile('index.html',{root:path.join(__dirname,'public')});
			break;

		default:
			res.end();
			break;

	}

});

function blink_init() {
	console.log('Hello. This is Blink.\nLet\'s start with your credentials.');
	prompt('> email     : ',blink.email,false,(email)=>{
		blink.email=email;
		//prompt('> unique_id : ',blink.unique_id,false,(unique_id)=>{
		//	blink.unique_id=unique_id;
			prompt('> password  : ',blink.password,true,(password)=>{
				blink.password=password;
				if ( (password=='') && (blink.account_id&&blink.account_id!='') && (blink.client_id&&blink.client_id!='') && (blink.authtoken&&blink.authtoken!='') && (blink.region_tier&&blink.region_tier!='') ) {
					// for testing-purpose: if credentials are present > ready to go without logging in (requesting new authtoken) again
					console.log('[TESTING-MODE] resuming with authtoken from config.json '+blink.authtoken);
					blink.write_log('>OK RESUMING '+blink.email+' | ACCOUNT_ID '+blink.account_id+' | CLIENT_ID '+blink.client_id+' | AUTHTOKEN '+blink.authtoken+' | REGION_TIER '+blink.region_tier);
					blink.UPDATE(()=>{});
				} else {blink.LOGIN((r)=>{
					console.log('Ok. http://localhost:'+port+' is now linked to your Blink-account.');
					blink.UPDATE(()=>{});
					// if verification is required, prompt for PIN (will automatically be sent from Blink by email)
					if (r&&r.client&&r.client.verification_required&&r.client.id) {
						console.log('Sorry. Blink requests verification. Please check you email for the required PIN.')
						prompt('> PIN       : ',undefined,false,(pin)=>{
							blink.VERIFY(pin,(r)=>{console.log('Ok. Thanks for verifying.')});
							blink.UPDATE(()=>{});
						});
					};
				})}
			})
		//});
	});
}

function prompt (question,preferred_value,isPassword,callback) {
	if ((preferred_value&&preferred_value!='')||config.headless_mode) {
		console.log(question+(isPassword?'':preferred_value));
		callback(preferred_value);
	} else {
		let readline = require('readline');
		let rl = readline.createInterface({
		  input: process.stdin,
		  output: process.stdout
		});
		rl.question(question, function(answer) {
		  rl.close();
		  if (isPassword) {process.stdout.write('\n')};
		  callback(answer);
		});
		rl._writeToOutput = function _writeToOutput(stringToWrite) {
		  if (isPassword)
		    rl.output.write("*");
		  else
		    rl.output.write(stringToWrite);
		};			
	};
};
