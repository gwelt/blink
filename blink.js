module.exports = Blink;
// usage:
// var blink = new Blink('youremail@domain.com','yoursecretpassword','UNIQUE_ID_LIKE_11111111-1111-1111-1111-111111111111');
const https = require('https');

function Blink(email,password,unique_id,account_id,client_id,authtoken,region_tier) {
	this.email=email;
	this.password=password;
	this.unique_id=unique_id;

	this.account_id=account_id;
	this.client_id=client_id;
	this.authtoken=authtoken;
	this.region_tier=region_tier;
	
	this.homescreen={};
	this.thumbnails=[];
	this.log=new Logger();
	return this;
}

Blink.prototype.LOGIN = function (callback) {
    this.write_log('... LOGIN '+this.email+' @ '+this.unique_id);
	if (this.email&&this.password) {
	    let data = {"email":this.email,"password":this.password,"unique_id":this.unique_id};
		this.request(this.get_blinkRequestOptions('/api/v4/account/login','POST',{'Content-Type':'application/json'}),JSON.stringify(data),false,(r)=>{
			let rj=JSON.parse(r); 
			if (!this.is_errormessage(rj)) {
				this.account_id=rj.account?rj.account.id:undefined;
				this.client_id=rj.client?rj.client.id:undefined;
				this.authtoken=rj.authtoken?rj.authtoken.authtoken:undefined;
				this.region_tier=rj.region?rj.region.tier:undefined;
			    this.write_log('>OK LOGIN '+this.email+' | ACCOUNT_ID '+this.account_id+' | CLIENT_ID '+this.client_id+' | AUTHTOKEN '+this.authtoken+' | REGION_TIER '+this.region_tier);
			    this.write_log(r);
			    if (rj.client.verification_required) {this.write_log('>ERROR VERIFICATION REQUIRED FOR CLIENT ID '+this.client_id)};
			}
		    callback(r);
		});
	} else {this.write_log('>ERROR EMAIL AND PASSWORD REQUIRED.'); callback('{"error":"EMAIL AND PASSWORD REQUIRED."}');}
}

Blink.prototype.VERIFY = function (pin,callback) {
    this.write_log('... VERIFY');
    if (this.account_id&&this.client_id&&pin) {    	
	    let data = {"pin":pin};
		this.request(this.get_blinkRequestOptions('/api/v4/account/'+this.account_id+'/client/'+this.client_id+'/pin/verify','POST',{'Content-Type':'application/json','TOKEN_AUTH':this.authtoken}),JSON.stringify(data),false,(r)=>{
		    this.write_log('>OK VERIFY '+r);
			callback(r);
		});
    } else {this.write_log('>ERROR ACCOUNT_ID, CLIENT_ID AND PIN REQUIRED.'); callback('{"error":"ACCOUNT_ID, CLIENT_ID AND PIN REQUIRED."}');}
}

Blink.prototype.LOGOUT = function (callback) {
    this.write_log('... LOGOUT');
	if (this.account_id&&this.client_id) {
		this.request(this.get_blinkRequestOptions('/api/v4/account/'+this.account_id+'/client/'+this.client_id+'/logout','POST'),'',false,(r)=>{
		    this.write_log('>OK LOGOUT '+r);
			callback(r);
		});
	} else {this.write_log('>ERROR ACCOUNT_ID AND CLIENT_ID REQUIRED.'); callback('{"error":"ACCOUNT_ID AND CLIENT_ID REQUIRED."}');}
}

Blink.prototype.UPDATE = function (callback) {
    this.write_log('... UPDATE');
    if (this.account_id) {    	
		this.request(this.get_blinkRequestOptions('/api/v3/accounts/'+this.account_id+'/homescreen'),'',false,(r)=>{
			let rj=JSON.parse(r); 
			if (!this.is_errormessage(rj)) {
				this.homescreen=rj;
		     	this.write_log('>OK UPDATE');
			} else {this.homescreen={}}
			callback(r);
		});
    } else {this.write_log('>ERROR ACCOUNT_ID REQUIRED.'); callback('{"error":"ACCOUNT_ID REQUIRED."}');}
}

Blink.prototype.GET_IMAGE = function (c,callback) {
    this.write_log('... GET_IMAGE');
	let cam=c||(this.homescreen.cameras)?this.homescreen.cameras[0]:undefined;
	if (cam) {
	    this.request(this.get_blinkRequestOptions(cam.thumbnail+'.jpg'),'',true,(r)=>{
	    	this.write_log('>OK GET_IMAGE (NETWORK_ID '+cam.network_id+' | CAM_ID '+cam.id+')');
	    	callback(r);
	    });	
	} else {this.write_log('>ERROR IMAGE/CAM NOT AVAILABLE.'); callback('{"error":"IMAGE/CAM NOT AVAILABLE."}');}
}

Blink.prototype.UPDATE_CAM = function (c,n,callback) {
    this.write_log('... UPDATE_CAM');
	let cam=c||(this.homescreen)?this.homescreen.cameras[0]:undefined;
	let network=n||(this.homescreen)?this.homescreen.networks[0]:undefined;
	if (cam&&network) {
	    this.request(this.get_blinkRequestOptions('/network/'+network.id+'/camera/'+cam.id+'/thumbnail','POST'),'',false,(r)=>{
	     	this.write_log('>OK UPDATE_CAM '+cam.id+' @ '+network.id+' | last updated '+cam.updated_at);
	    	callback(r);
	    });
	} else {this.write_log('>ERROR CAM/NETWORK NOT AVAILABLE.'); callback('{"error":"CAM/NETWORK NOT AVAILABLE."}');}
}

Blink.prototype.is_errormessage = function (o) {
	if (o.message) {
		this.write_log('>ERROR '+o.message+' (CODE:'+o.code+')');
		return true;
	} else {return false;}
}

Blink.prototype.write_log = function (s) {
	function getDateString() {let d=new Date(); return (new Date(d-d.getTimezoneOffset()*60000)).toISOString().slice(0, -5);}
	this.log.add(getDateString()+' '+s);
	//console.log(s);
}

Blink.prototype.get_blinkRequestOptions = function (path,method,headers) {
	let bro = new Object();
	bro.path=path||'';
	bro.method=method||'GET';
	bro.headers=headers||(this.authtoken?{'TOKEN_AUTH':this.authtoken}:undefined);
	bro.hostname='rest-'+(this.region_tier||'prod')+'.immedia-semi.com';
	bro.port=443;
	return bro;
}

Blink.prototype.request = function (options,data,is_binary,callback) {
	this.write_log('... '+options.method+': '+options.hostname+options.path); //+' '+JSON.stringify(options.headers)+' '+((options.method=='POST')?data:''));
	let req = https.request(options, res => {
	  let r='';
	  if (is_binary) {res.setEncoding('binary')};
	  res.on('data', d => {r+=d})
	  res.on('end', function () {callback(r)})
	})
	req.on('error', error => {
	  console.error('==ERROR== ',error)
	})
	req.write(data);
	req.end();
}

function Logger(maxlength) {this.maxlength=(maxlength||25); this.list=[];}
Logger.prototype.add = function (s) {this.list.push(s); while (this.list.length>this.maxlength) {this.list.splice(0,1)};}
Logger.prototype.read = function (latest) {return latest?this.list[this.length-1]:this.list.reduce((a,c)=>a+c+'\n','');}
