module.exports = Blink;
// usage:
// var blink = new Blink('youremail@domain.com','yoursecretpassword','UNIQUE_ID_LIKE_11111111-1111-1111-1111-111111111111');
const https = require('https');

function Blink(email,password,unique_id,account_id,client_id,authtoken,region_tier,accepted_age_of_data_in_seconds) {
	this.email=email;
	this.password=password;
	this.unique_id=unique_id;

	this.account_id=account_id;
	this.client_id=client_id;
	this.authtoken=authtoken;
	this.region_tier=region_tier;
	
	this.homescreen={};
	this.videoevents={};
	this.lastupdate=undefined;
	this.accepted_age_of_data_in_seconds=accepted_age_of_data_in_seconds;
	this.cache=new Cache(10);
	this.log=new Logger();
	return this;
}

Blink.prototype.LOGIN = function (callback) {
	if (this.email&&this.password) {
	    let data = {"email":this.email,"password":this.password,"unique_id":this.unique_id};
		this.request(this.get_blinkRequestOptions('/api/v4/account/login','POST',{'Content-Type':'application/json'}),JSON.stringify(data),false,(r)=>{
			let rj=undefined; try {rj=JSON.parse(r)} catch(e){r=undefined}; 
			if (!this.is_errormessage(rj)) {
				this.account_id=rj.account?rj.account.id:undefined;
				this.client_id=rj.client?rj.client.id:undefined;
				this.authtoken=rj.authtoken?rj.authtoken.authtoken:undefined;
				this.region_tier=rj.region?rj.region.tier:undefined;
			    this.write_log('>OK LOGIN '+this.email+' | ACCOUNT_ID '+this.account_id+' | CLIENT_ID '+this.client_id+' | AUTHTOKEN '+this.authtoken+' | REGION_TIER '+this.region_tier);
			    this.write_log(r);
			    if (rj.client.verification_required) {this.write_log('>ERROR VERIFICATION REQUIRED FOR CLIENT ID '+this.client_id)};
			} else {this.email=undefined;this.password=undefined;}
		    callback(r);
		});
	} else {this.write_log('>ERROR EMAIL AND PASSWORD REQUIRED.'); callback('{"error":"EMAIL AND PASSWORD REQUIRED."}');}
}

Blink.prototype.VERIFY = function (pin,callback) {
    if (this.account_id&&this.client_id&&pin) {    	
	    let data = {"pin":pin};
		this.request(this.get_blinkRequestOptions('/api/v4/account/'+this.account_id+'/client/'+this.client_id+'/pin/verify','POST',{'Content-Type':'application/json','TOKEN_AUTH':this.authtoken}),JSON.stringify(data),false,(r)=>{
		    this.write_log('>OK VERIFY '+r);
			callback(r);
		});
    } else {this.write_log('>ERROR ACCOUNT_ID, CLIENT_ID AND PIN REQUIRED.'); callback('{"error":"ACCOUNT_ID, CLIENT_ID AND PIN REQUIRED."}');}
}

Blink.prototype.LOGOUT = function (callback) {
	if (this.account_id&&this.client_id) {
		this.request(this.get_blinkRequestOptions('/api/v4/account/'+this.account_id+'/client/'+this.client_id+'/logout','POST'),'',false,(r)=>{
		    this.write_log('>OK LOGOUT '+r);
			this.email=undefined;
			this.password=undefined;
			callback(r);
		});
	} else {this.write_log('>ERROR ACCOUNT_ID AND CLIENT_ID REQUIRED.'); callback('{"error":"ACCOUNT_ID AND CLIENT_ID REQUIRED."}');}
}

Blink.prototype.GET_STATUS = function (callback,force_update,force_cache) {
    function stopwatch(startdate) {if (typeof startdate != 'undefined') {return new Date()-startdate} else {return new Date()}}
    // if no update is needed, return cached values
    let cache_age=stopwatch(this.lastupdate)/1000;
    if ( force_cache || (cache_age<(this.accepted_age_of_data_in_seconds||cache_age)&&!force_update) ) {
		let homescreen_JSON=(this.homescreen?JSON.stringify(this.homescreen):'{}');
		let videoevents_JSON=(this.videoevents?JSON.stringify(this.videoevents):'{}');
		let r='{"lastupdate":"'+this.lastupdate+'","homescreen":'+homescreen_JSON+',"videoevents":'+videoevents_JSON+'}';
		this.write_log('>OK GET_STATUS [FROM CACHE] VALID FOR '+((this.accepted_age_of_data_in_seconds||cache_age)-cache_age).toFixed(0)+' SECONDS');
		callback(r);    	
    } else {
	    // else update
		if (this.account_id) {    	
			this.GET_HOMESCREEN(()=>{
				this.GET_VIDEO_EVENTS(()=>{
					this.lastupdate=stopwatch();
					this.write_log('>OK UPDATED STATUS (HOMESCREEN AND VIDEOEVENTS)');
					this.GET_STATUS((r)=>{
						callback(r);
					},false,true);
				});
			});
		} else {this.write_log('>ERROR ACCOUNT_ID REQUIRED.'); callback('{"error":"ACCOUNT_ID REQUIRED."}');}	
    }
}

Blink.prototype.GET_HOMESCREEN = function (callback) {
    if (this.account_id) {    	
		this.request(this.get_blinkRequestOptions('/api/v3/accounts/'+this.account_id+'/homescreen'),'',false,(r)=>{
			let rj=undefined; try {rj=JSON.parse(r)} catch(e){r=undefined}; 
			if (!this.is_errormessage(rj)) {
				this.homescreen=rj;
		     	this.write_log('>OK GET_HOMESCREEN');
			} else {this.homescreen={}}
			callback(r);
		});
    } else {this.write_log('>ERROR ACCOUNT_ID REQUIRED.'); callback('{"error":"ACCOUNT_ID REQUIRED."}');}
}

Blink.prototype.GET_VIDEO_EVENTS = function (callback) {
    if (this.account_id) {
    	let d=new Date();
    	d.setDate(d.getDate()-1);
    	//d.toISOString().slice(0,-5);
		this.request(this.get_blinkRequestOptions('/api/v1/accounts/'+this.account_id+'/media/changed?since='+d.toISOString().slice(0,-5)+'+0000&page=1'),'',false,(r)=>{
			let rj=undefined; try {rj=JSON.parse(r)} catch(e){r=undefined}; 
			if (rj&&!this.is_errormessage(rj)) {

				// filter and sort media in video-events
				rj.media=rj.media.filter(e => e.source!='snapshot' && !e.deleted).sort((a, b)=>{
				  var keyA = new Date(a.created_at), keyB = new Date(b.created_at);
				  if (keyA < keyB) return 1;
				  if (keyA > keyB) return -1;
				  return 0;
				}).slice(0,3);

				this.videoevents=rj;
				this.write_log('>OK GET_VIDEO_EVENTS');
			} else {this.videoevents={}}
			callback(r);
		});
    } else {this.write_log('>ERROR ACCOUNT_ID REQUIRED.'); callback('{"error":"ACCOUNT_ID REQUIRED."}');}
}

Blink.prototype.GET_IMAGE = function (cam,callback) {
	let image=((this.homescreen.cameras)?this.homescreen.cameras[0].thumbnail+'.jpg':undefined);
	if (image) {
		let cached=this.cache.get(image);
		if (cached) {
		    this.write_log('>OK GET_IMAGE [FROM CACHE] '+image);
			callback(cached);
		} else {
		    this.request(this.get_blinkRequestOptions(image),'',true,(r)=>{
		    	this.write_log('>OK GET_IMAGE '+image);
		    	this.cache.add(new Cacheitem(image,r));
		    	callback(r);
		    });	
		}
	} else {this.write_log('>ERROR IMAGE/CAM NOT AVAILABLE.'); callback('{"error":"IMAGE/CAM NOT AVAILABLE."}');}
}

Blink.prototype.UPDATE_CAM = function (c,n,callback) {
	let cam=c||(this.homescreen.cameras)?this.homescreen.cameras[0]:undefined;
	let network=n||(this.homescreen.networks)?this.homescreen.networks[0]:undefined;
	if (cam&&network) {
	    this.request(this.get_blinkRequestOptions('/network/'+network.id+'/camera/'+cam.id+'/thumbnail','POST'),'',false,(r)=>{
	     	this.write_log('>OK UPDATE_CAM '+cam.id+' @ '+network.id+' | last updated '+cam.updated_at);
	    	callback(r);
	    });
	} else {this.write_log('>ERROR CAM/NETWORK NOT AVAILABLE.'); callback('{"error":"CAM/NETWORK NOT AVAILABLE."}');}
}

Blink.prototype.GET_MEDIA = function (m,callback) {
	let media=(m?'/api/v2/accounts/'+this.account_id+'/media/clip/'+m+'.mp4':undefined)||((this.videoevents.media)?this.videoevents.media[0].media:undefined);
	if (media) {
		let cached=this.cache.get(media);
		if (cached) {
		    this.write_log('>OK GET_MEDIA [FROM CACHE] '+media);
			callback(cached);
		} else {
		    this.request(this.get_blinkRequestOptions(media),'',true,(r)=>{
		    	this.write_log('>OK GET_MEDIA '+media);
		    	this.cache.add(new Cacheitem(media,r));
		    	callback(r);
		    });
		}	
	} else {this.write_log('>ERROR MEDIA NOT AVAILABLE.'); callback('{"error":"MEDIA NOT AVAILABLE."}');}
}

Blink.prototype.GET_MEDIA_THUMBNAIL = function (t,callback) {
	let thumbnail=(t?'/api/v2/accounts/'+this.account_id+'/media/thumb/'+t:undefined)||((this.videoevents.media)?this.videoevents.media[0].thumbnail:undefined);
	if (thumbnail) {
		let cached=this.cache.get(thumbnail);
		if (cached) {
		    this.write_log('>OK GET_MEDIA_THUMBNAIL [FROM CACHE] '+thumbnail);
			callback(cached);
		} else {
		    this.request(this.get_blinkRequestOptions(thumbnail),'',true,(r)=>{
		    	this.write_log('>OK GET_MEDIA_THUMBNAIL '+thumbnail);
		    	this.cache.add(new Cacheitem(thumbnail,r));
		    	callback(r);
		    });	
		}

	} else {this.write_log('>ERROR MEDIA_THUMBNAIL NOT AVAILABLE.'); callback('{"error":"MEDIA_THUMBNAIL NOT AVAILABLE."}');}
}

Blink.prototype.is_errormessage = function (o) {
	if (o&&o.message) {
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

function Cache(max_items) {this.items=[];this.max_items=max_items||1;}
function Cacheitem(id,data) {this.id=id;this.data=data;}
Cache.prototype.add = function (cacheitem) {this.items.push(cacheitem); while (this.items.length>this.max_items) {this.items.splice(0,1)};}
Cache.prototype.get = function (id) {let f=this.items.find(i => i.id==id); return f?f.data:undefined}

function Logger(maxlength) {this.maxlength=(maxlength||25); this.list=[];}
Logger.prototype.add = function (s) {this.list.push(s); while (this.list.length>this.maxlength) {this.list.splice(0,1)};}
Logger.prototype.read = function (latest) {return latest?this.list[this.length-1]:this.list.reduce((a,c)=>a+c+'\n','');}
