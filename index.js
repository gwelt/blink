var express = require('express');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');
var path = require('path');
var config = {}; try {config=require('./config.json')} catch(err){};
var port = process.env.PORT || config.port || 3000;
const Blink = require('./blink.js');
var blink = new Blink(config.username,config.password,config.hardware_id,config.accepted_age_of_data_in_seconds);
server.listen(port, function () { console.log('\x1b[44m SERVER LISTENING ON PORT '+port+' \x1b[0m'); blink_init(); });

setInterval(()=>{blink.GET_INDEX(()=>{})},60000*30); // GET_INDEX every 30 minutes //

process.on('SIGINT', function(){ if (config.SIGINT==undefined) {config.SIGINT=true; console.log('SIGINT'); process.exit(0);} });
process.on('SIGTERM', function(){ if (config.SIGTERM==undefined) {config.SIGTERM=true; console.log('SIGTERM'); process.exit(0);} });

app.use(bodyParser.json({ strict: true }));
app.use(function (error, req, res, next){next()}); // don't show error-message, if it's not JSON ... just ignore it
app.use(bodyParser.urlencoded({ extended: true }));

app.use('(/blink)?/', express.static(__dirname + '/public'));

app.use('(/blink)?/api', function(req,res) {
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	//console.log('>>> '+req.params.file+' > '+JSON.stringify(req.body));
	switch (req.body.command) {

		case 'login':
			if (req.body.username) {blink.username=req.body.username};
			if (req.body.password) {blink.password=req.body.password};
			blink.LOGIN((r)=>{
				res.set('Content-Type','application/json'); res.end(r);
			});
			break;

		case 'verify':
			blink.VERIFY(req.body.pin,(r)=>{
				res.set('Content-Type','application/json'); res.end(r);
			});
			break;

		case 'logout':
			if (getcookie(req).OAuthID) {
				blink.LOGOUT((r)=>{
					res.set('Content-Type','application/json'); res.end(r);
				});
			} else {res.end('{"error":"not authorized"}');}
			break;

		case 'get_index':
			if (getcookie(req).OAuthID) {
				blink.GET_INDEX((r)=>{
					res.set('Content-Type','application/json'); res.end(r);
				},req.body.force);
				log_to_waechterlog(req);	
			} else {res.end('{"error":"not authorized"}');}
			break;

		case 'update_cam':
			if (getcookie(req).OAuthID) {
				blink.UPDATE_CAM(req.body.cam_id,undefined,(r)=>{
					res.set('Content-Type','application/json'); res.end(r);
				});
			} else {res.end('{"error":"not authorized"}');}
			break;

		case 'capture_video':
			if (getcookie(req).OAuthID) {
				blink.CAPTURE_VIDEO(req.body.cam_id,undefined,(r)=>{
					res.set('Content-Type','application/json'); res.end(r);
				});
			} else {res.end('{"error":"not authorized"}');}
			break;

		case 'get_command_status':
			blink.GET_COMMAND_STATUS(req.body.cam_id,req.body.command_id,(r)=>{
				res.set('Content-Type','application/json'); res.end(r);
			});
			break;

		case 'get_log':
			res.set('Content-Type','text/plain');
			res.end(blink.log.read());
			break;

		default:
			res.end('{"error":"unknown api-call"}');
			break;

	}		

});

app.use('(/blink)?/cam/:id?', function(req,res) {
	blink.GET_IMAGE(req.params.id,(r)=>{
		if (r) {
			res.set('Content-Type','image/jpeg');
			res.end(r,'binary');
		} else {res.end('HELLO. THIS IS BLINK.\nI DON\'T SEE THIS CAM HERE.')}
	});
});

app.use('(/blink)?/media/thumbnail/:media_id?', function(req,res) {
	blink.GET_MEDIA_THUMBNAIL(req.params.media_id||undefined,(r)=>{
		if (r) {
			res.set('Content-Type','image/jpeg');
			res.end(r,'binary');
		} else {res.end('HELLO. THIS IS BLINK.\nI DON\'T SEE A THUMBNAIL HERE.')}
	});
});

app.use('(/blink)?/media/:media_id?', function(req,res) {
	blink.GET_MEDIA(req.params.media_id||undefined,(r)=>{
		if (r) {
			res.set('Content-Type','video/mp4');
			res.end(r,'binary');
		} else {res.end('HELLO. THIS IS BLINK.\nI DON\'T SEE MEDIA.MP4 HERE.')}
	});
});

app.use('(/blink)?/:file?', function(req,res) {
	switch (req.params.file) {

		case 'cam.jpg':
			blink.GET_IMAGE(undefined,(r)=>{
				if (r) {
					res.set('Content-Type','image/jpeg');
					res.end(r,'binary');
				} else {res.end('HELLO. THIS IS BLINK.\nI DON\'T SEE CAM.JPG HERE.')}
			});
			break;

		case 'media.mp4':
			blink.GET_MEDIA(undefined,(r)=>{
				if (r) {
					res.set('Content-Type','video/mp4');
					res.end(r,'binary');
				} else {res.end('HELLO. THIS IS BLINK.\nI DON\'T SEE MEDIA.MP4 HERE.')}
			});
			break;

		//case undefined:
		//	res.sendFile('index.html',{root:path.join(__dirname,'public')});
		//	break;

		default:
			res.sendStatus(404);
			break;

	}
});

function blink_init() {
	console.log('Hello. This is Blink.\nLet\'s start with your credentials.');
	prompt('> username  : ',blink.username,false,(username)=>{
		blink.username=username;
		prompt('> password  : ',blink.password,true,(password)=>{
			blink.password=password;
			if (password!=='') {
				blink.LOGIN((r)=>{
					console.log('Ok. Port '+port+' is now linked to your Blink-account.\n'+r);
					blink.GET_INDEX(()=>{});
					// if verification is required, prompt for PIN (will automatically be sent from Blink by email)
					if (blink.client_verification_required) {
						console.log('Blink requests verification. Please check you email for the required PIN.')
						prompt('> PIN       : ',undefined,false,(pin)=>{
							blink.VERIFY(pin,(r)=>{
								console.log('Ok. Thanks for verifying.')
								blink.GET_INDEX(()=>{});
							});
						});
					};
				})
			}
		})
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

function getcookie(req) {return {'OAuthID':'test'}}
