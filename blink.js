module.exports = Blink;
// usage:
//const Blink = require('./blink.js');
//var blink = new Blink('youremail@domain.com','yoursecretpassword','UNIQUE_ID_LIKE_11111111-1111-1111-1111-111111111111');
const https = require('https');

function Blink(username,password,hardware_id,accepted_age_of_data_in_seconds) {
	this.username=username;
	this.password=password;
	this.hardware_id=hardware_id;
	
	// LOGIN =>
	this.pin=undefined;

	// VERIFY =>
	this.access_token=undefined;
	this.refresh_token=undefined;
	this.token_type=undefined;
	this.refresh_timeout=undefined;

	// GET_ACCOUNT_TIER_TULSA =>
	this.account_id=undefined;
	this.tier=undefined;
	this.tulsa_id=undefined;

	this.accepted_age_of_data_in_seconds=accepted_age_of_data_in_seconds;
	this.client_verification_required=undefined;
	
	this.homescreen={};
	this.videoevents={};
	this.lastupdate=undefined;
	this.cache=new Cache(50);
	this.log=new Logger(150);
	return this;
}

Blink.prototype.LOGIN = function (callback) {
	let options={'method':'POST','hostname':'api.oauth.blink.com','path':'/oauth/token','headers':{'content-type':'application/json','hardware_id':this.hardware_id},'port':'443'}
	let data={'username':this.username,'password':this.password,'grant_type':'password','client_id':'android','scope':'client'}
	if (this.username&&this.password) {
		this.request(options,JSON.stringify(data),false,(r)=>{
			//{"email":"n****@gm***.com","next_time_in_secs":60,"phone":"n****@gm***.com","tsv_state":"email"}
			//{"error":"unsupported_grant_type","error_description":"invalid grant"}
			let rj=undefined; try {rj=JSON.parse(r)} catch(e){r=undefined};
			if (rj) {
				this.write_log('>OK LOGIN/REQUEST_2FA_CODE. | '+r);
				this.client_verification_required=true;
				callback('{"message":"CLIENT VERIFICATION REQUIRED."}');
			} else {
				this.write_log('>ERROR LOGIN/REQUEST_2FA_CODE FAILED. | '+r);
				callback('{"error":"ERROR LOGIN/REQUEST_2FA_CODE FAILED. | '+r+'"}');
			}
		});
	} else {
		this.write_log('>LOGIN: USERNAME AND PASSWORD REQUIRED.');
		callback('{"error":"LOGIN: USERNAME AND PASSWORD REQUIRED."}');
	}
}

Blink.prototype.VERIFY = function (pin,callback) {
	this.pin=pin;
	let options={'method':'POST','hostname':'api.oauth.blink.com','path':'/oauth/token','headers':{'2fa-code':this.pin,'content-type':'application/json','hardware_id':this.hardware_id},'port':'443'}
	let data={'username':this.username,'password':this.password,'grant_type':'password','client_id':'android','scope':'client'}
	if (this.username&&this.password&&this.pin) {
		this.request(options,JSON.stringify(data),false,(r)=>{
			//{"access_token":"...","expires_in":14400,"refresh_token":"...","scope":"client","token_type":"Bearer"}
			//{"err_msg":"bad request response from dependency service","error":"Verification Code is invalid or expired"}
			let rj=undefined; try {rj=JSON.parse(r)} catch(e){r=undefined};
			if (rj&&rj.access_token) {
				this.write_log('>OK VERIFY. ('+this.pin+')');
				//this.all_token=rj;
				this.access_token=rj.access_token;
				this.refresh_token=rj.refresh_token;
				this.token_type=rj.token_type;
				if (rj.expires_in>0) {
					clearTimeout(this.refresh_timeout);
					this.refresh_timeout=setTimeout(()=>{this.REFRESH(()=>{})},1000*(rj.expires_in-600)); // REFRESH in 240 minutes (-10 minutes buffer)
				}
				//this.access_token_content=this.get_access_token_content();
				this.GET_ACCOUNT_TIER_TULSA((r2)=>{
					this.client_verification_required=false;
					callback(r+''+r2);
				})
			} else {
				this.write_log('>ERROR VERIFY FAILED. ('+this.pin+') | '+r);
				callback('{"error":"ERROR VERIFY FAILED. ('+this.pin+') | '+r+'"}');
			}
		});
	} else {
		this.write_log('>VERIFY: PIN REQUIRED.');
		callback('{"error":"VERIFY: PIN REQUIRED."}');
	}
}

Blink.prototype.GET_ACCOUNT_TIER_TULSA = function (callback) {
	this.request(this.get_blinkRequestOptions('/api/v1/users/tier_info',undefined,undefined,'rest-prod.immedia-semi.com'),'',false,(r)=>{
		//{"tier":"e003","account_id":114085,"tulsa_id":3864463}
		let rj=undefined; try {rj=JSON.parse(r)} catch(e){r=undefined};
		if (rj&&rj.tier) {
			this.write_log('>OK GET_ACCOUNT_TIER_TULSA. | '+r);
			this.tier=rj.tier;
			this.account_id=rj.account_id;
			this.tulsa_id=rj.tulsa_id;
			callback(r);
		} else {
			this.write_log('>ERROR GET_ACCOUNT_TIER_TULSA FAILED. | '+r);
			callback('{"error":"ERROR GET_ACCOUNT_TIER_TULSA FAILED. | '+r+'"}');
		}
	});
}

Blink.prototype.REFRESH = function (callback) {
	let options={'method':'POST','hostname':'api.oauth.blink.com','path':'/oauth/token','headers':{'content-type':'application/json','hardware_id':this.hardware_id},'port':'443'}
	let data={'refresh_token':this.refresh_token,'grant_type':'refresh_token','client_id':'android','scope':'client'}
	if (this.refresh_token) {
		this.request(options,JSON.stringify(data),false,(r)=>{
			//{"access_token":"...","expires_in":14400,"refresh_token":"...","scope":"client","token_type":"Bearer"}
			//{"err_msg":"bad request response from dependency service","error":"Verification Code is invalid or expired"}
			let rj=undefined; try {rj=JSON.parse(r)} catch(e){r=undefined};
			if (rj&&rj.access_token) {
				this.write_log('>OK REFRESH.');
				//this.all_token=rj;
				this.access_token=rj.access_token;
				this.refresh_token=rj.refresh_token;
				this.token_type=rj.token_type;
				if (rj.expires_in>0) {
					clearTimeout(this.refresh_timeout);
					this.refresh_timeout=setTimeout(()=>{this.REFRESH(()=>{})},1000*(rj.expires_in-600)); // REFRESH in 240 minutes (-10 minutes buffer)
				}
				//this.access_token_content=this.get_access_token_content();
				this.client_verification_required=false;
				callback(r);
			} else {
				this.write_log('>ERROR REFRESH FAILED. | '+r);
				callback('{"error":"ERROR REFRESH FAILED. | '+r+'"}');
			}
		});
	} else {
		this.write_log('>REFRESH: REFRESH_TOKEN REQUIRED.');
		callback('{"error":"REFRESH: REFRESH_TOKEN REQUIRED."}');
	}
}

Blink.prototype.request = function (options,data,is_binary,callback) {
	this.write_log('REQUEST: '+options.method+': '+options.hostname+options.path); //+' '+JSON.stringify(options.headers)+' '+((options.method=='POST')?data:''));
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

Blink.prototype.get_blinkRequestOptions = function (path,method,headers,hostname) {
	let bro = new Object();
	bro.path=path||'';
	bro.method=method||'GET';
	bro.headers=headers||(this.access_token?{'Authorization':this.token_type+' '+this.access_token}:undefined);
	bro.hostname=hostname||'rest-'+(this.tier||'prod')+'.immedia-semi.com';
	bro.port=443;
	return bro;
}

Blink.prototype.LOGOUT = function (callback) {
	this.username=undefined;
	this.password=undefined;
	//this.hardware_id=undefined;
	
	// LOGIN =>
	this.pin=undefined;

	// VERIFY =>
	this.access_token=undefined;
	this.refresh_token=undefined;
	this.token_type=undefined;
	clearTimeout(this.refresh_timeout);
	this.refresh_timeout=undefined;

	// GET_ACCOUNT_TIER_TULSA =>
	this.account_id=undefined;
	this.tier=undefined;
	this.tulsa_id=undefined;

	//this.accepted_age_of_data_in_seconds=undefined;
	this.client_verification_required=undefined;
	
	this.homescreen={};
	this.videoevents={};
	this.lastupdate=undefined;
	this.cache=new Cache(50);
	this.log=new Logger(150);

    this.write_log('>OK LOGOUT.');
	callback(JSON.stringify({}));
}

Blink.prototype.GET_INDEX = function (callback,force_update,force_cache) {
    function stopwatch(startdate) {if (typeof startdate != 'undefined') {return new Date()-startdate} else {return new Date()}}
    // if no update is needed, return cached values
    let cache_age=stopwatch(this.lastupdate)/1000;
    if ( force_cache || (cache_age<(this.accepted_age_of_data_in_seconds||cache_age)&&!force_update) ) {
		let homescreen_JSON=(this.homescreen?JSON.stringify(this.homescreen):'{}');
		let videoevents_JSON=(this.videoevents?JSON.stringify(this.videoevents):'{}');
		let r='{"lastupdate":"'+this.lastupdate+'","client_verification_required":'+this.client_verification_required+',"homescreen":'+homescreen_JSON+',"videoevents":'+videoevents_JSON+'}';
		this.write_log('>OK GET_INDEX [FROM CACHE] VALID FOR '+((this.accepted_age_of_data_in_seconds||cache_age)-cache_age).toFixed(0)+' SECONDS');
		callback(r);    	
    } else {
	    // else update
		if (this.account_id) {   

			let homescreen = new Promise((resolve)=>{this.GET_HOMESCREEN((r)=>{resolve(r)})});
			let videoevents = new Promise((resolve)=>{this.GET_VIDEO_EVENTS((r)=>{resolve(r)})});
			Promise.all([homescreen,videoevents]).then((values_of_all_promises_array)=>{
				this.lastupdate=stopwatch();
				this.write_log('>OK UPDATED STATUS (HOMESCREEN AND VIDEOEVENTS)');
				//this.write_log('>PROMISES: '+JSON.stringify(values_of_all_promises_array));
				this.write_log('>THIS.HOMESCREEN: '+JSON.stringify(this.homescreen));
				if (JSON.stringify(this.homescreen)===JSON.stringify({})) { /// TRY
					this.write_log('>NO DATA. CALLING LOGIN.');
					this.LOGIN(callback);
				} else {
					this.write_log('>DATA AVAILABLE/UPDATED.');
					this.GET_INDEX((r)=>{callback(r)},false,true);
				}
			});

		} else {this.write_log('>GET_INDEX: LOGIN REQUIRED.'); callback('{"error":"GET_INDEX: LOGIN REQUIRED."}');}	
    }
}

Blink.prototype.GET_HOMESCREEN = function (callback) {
    if (this.account_id) {    	
		this.request(this.get_blinkRequestOptions('/api/v3/accounts/'+this.account_id+'/homescreen'),'',false,(r)=>{
			let rj=undefined; try {rj=JSON.parse(r)} catch(e){r=undefined}; 
			if (!this.is_errormessage(rj)) {
				this.homescreen=rj;
				if (this.homescreen && this.homescreen.cameras) {

					// hack: some cams are listed as "owls" or "doorbells"
					// copy them to cameras-list ... should do the trick
					let also_show_owls_and_doorbells=true; // Deactivated. "owls" (Blink Minis) don't work with this API. Videos show up in captured video list (even if not listed in homescreen.cameras), but capturing images or videos with current API won't work.
					if (also_show_owls_and_doorbells) {
						if (this.homescreen.owls) {
							let cams_and_owls = this.homescreen.cameras.concat(this.homescreen.owls);
							this.homescreen.cameras=cams_and_owls;
						}				
						if (this.homescreen.doorbells) {
							let cams_and_doorbells = this.homescreen.cameras.concat(this.homescreen.doorbells);
							this.homescreen.cameras=cams_and_doorbells;
						}				
					}

					// store last thumbnail_updated_at - and sort
					this.homescreen.cameras.forEach((c)=>{
						let ts=(/ts=(\d*)/g.exec(c.thumbnail)); 
						if (ts) {
							// if it's an automated video-thumbnail, there will be a "ts" in the thumbnail-URL ...
							c.thumbnail_updated_at=ts[1]; 
						}
						/*
						 else {
							// ...else there will be a value for the last manual update of the image in cam_last_update_store
							c.thumbnail_updated_at=this.cam_last_update_store.find(c.id);
							// just saw that even the manual updates have a "ts" in URL... so this will never be used
						}
						*/
					});
					this.homescreen.cameras.sort((a,b)=>b.thumbnail_updated_at-a.thumbnail_updated_at);

				};
		     	this.write_log('>OK GET_HOMESCREEN');
		     	this.homescreen={cameras:this.homescreen.cameras}; // this is all we need
				this.homescreen.cameras=this.homescreen.cameras.map(c=>{ return {// this is all we need
		     		id:c.id,
		     		network_id:c.network_id,
		     		thumbnail:c.thumbnail,
		     		thumbnail_updated_at:c.thumbnail_updated_at,
		     		name:c.name,
		     		signals:{temp:c.signals?c.signals.temp:undefined},
		     		status:c.status
				}});

				callback(JSON.stringify(this.homescreen));
			} else {
				this.write_log('>ERROR DID NOT GET_HOMESCREEN');
				this.homescreen={};
				callback(r); 
			}
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
				}).slice(0,6);

				this.videoevents=rj;
				this.write_log('>OK GET_VIDEO_EVENTS');
		     	this.videoevents={media:this.videoevents.media}; // this is all we need
		     	this.videoevents.media=this.videoevents.media.map(m=>{ return { // this is all we need
		     		id:m.id,
		     		thumbnail:m.thumbnail,
		     		created_at:m.created_at
		     	}});

				callback(JSON.stringify(this.videoevents));
			} else {
				this.write_log('>ERROR DID NOT GET_VIDEO_EVENTS');
				this.videoevents={};
				callback(r);
			}
		});
    } else {this.write_log('>ERROR ACCOUNT_ID REQUIRED.'); callback('{"error":"ACCOUNT_ID REQUIRED."}');}
}

Blink.prototype.GET_IMAGE = function (cam_id,callback) {
	if (this.homescreen&&this.homescreen.cameras) {
		let cam_array_number=this.homescreen.cameras.findIndex((c)=>cam_id==c.id);
		if (cam_array_number==-1) {cam_array_number=0}
		let image=this.homescreen.cameras[cam_array_number].thumbnail+'.jpg';
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

Blink.prototype.UPDATE_CAM = function (cam_id,n,callback) {
	if (this.homescreen&&this.homescreen.cameras) {
		let cam_array_number=this.homescreen.cameras.findIndex((c)=>cam_id==c.id);
		if (cam_array_number==-1) {cam_array_number=0}
		cam_id=this.homescreen.cameras[cam_array_number].id;
		let network_id=this.homescreen.cameras[cam_array_number].network_id;
		if (network_id) {
		    this.request(this.get_blinkRequestOptions('/network/'+network_id+'/camera/'+cam_id+'/thumbnail','POST'),'',false,(r)=>{
		     	this.write_log('>OK UPDATE_CAM '+cam_id+' @ '+network_id);
		     	callback(r);
		    });
		}
	} else {this.write_log('>ERROR CAM/NETWORK NOT AVAILABLE.'); callback('{"error":"CAM/NETWORK NOT AVAILABLE."}');}
}

Blink.prototype.CAPTURE_VIDEO = function (cam_id,n,callback) {
	if (this.homescreen&&this.homescreen.cameras) {
		let cam_array_number=this.homescreen.cameras.findIndex((c)=>cam_id==c.id);
		if (cam_array_number==-1) {cam_array_number=0}
		cam_id=this.homescreen.cameras[cam_array_number].id;
		let network_id=this.homescreen.cameras[cam_array_number].network_id;
		if (network_id) {
		    this.request(this.get_blinkRequestOptions('/network/'+network_id+'/camera/'+cam_id+'/clip','POST'),'',false,(r)=>{
		     	this.write_log('>OK CAPTURE_VIDEO '+cam_id+' @ '+network_id);
		    	callback(r);
		    });
		}
	} else {this.write_log('>ERROR CAM/NETWORK NOT AVAILABLE.'); callback('{"error":"CAM/NETWORK NOT AVAILABLE."}');}
}

Blink.prototype.GET_COMMAND_STATUS = function (cam_id,command_id,callback) {
	if (this.homescreen&&this.homescreen.cameras&&command_id) {
		let cam_array_number=this.homescreen.cameras.findIndex((c)=>cam_id==c.id);
		if (cam_array_number==-1) {cam_array_number=0}
		let network_id=this.homescreen.cameras[cam_array_number].network_id;
		if (network_id) {
		    this.request(this.get_blinkRequestOptions('/network/'+network_id+'/command/'+command_id,'GET'),'',false,(r)=>{
		     	this.write_log('>OK COMMAND_STATUS '+command_id+' @ '+network_id);
		    	callback(r);
		    });
		}
	} else {this.write_log('>ERROR COMMAND_STATUS NOT AVAILABLE.'); callback('{"error":"COMMAND_STATUS NOT AVAILABLE."}');}
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

function Cache(max_items) {this.items=[];this.max_items=max_items||1;}
function Cacheitem(id,data) {this.id=id;this.data=data;}
Cache.prototype.add = function (cacheitem) {this.items.push(cacheitem); while (this.items.length>this.max_items) {this.items.splice(0,1)};}
Cache.prototype.get = function (id) {let f=this.items.find(i => i.id==id); return f?f.data:undefined}

function Logger(maxlength) {this.maxlength=(maxlength||25); this.list=[];}
Logger.prototype.add = function (s) {this.list.push(s); while (this.list.length>this.maxlength) {this.list.splice(0,1)};}
Logger.prototype.read = function (latest) {return latest?this.list[this.length-1]:this.list.reduce((a,c)=>a+c+'\n','');}


/* https://github.com/fronzbot/blinkpy/issues/1114 */
/* TEST ================================================================================================
var config = {}; try {config=require('./config.json')} catch(err){};
var blink = new Blink(config.username,config.password,config.hardware_id,config.accepted_age_of_data_in_seconds);

var _TOKEN={"access_token":"...","expires_in":14400,"refresh_token":"...","scope":"client","token_type":"Bearer"}
blink.access_token=_TOKEN.access_token;
blink.refresh_token=_TOKEN.refresh_token;
blink.token_type=_TOKEN.token_type;

var _ACCOUNT_TIER_TULSA={"tier":"e003","account_id":123456,"tulsa_id":1234567}
blink.tier=_ACCOUNT_TIER_TULSA.tier;
blink.account_id=_ACCOUNT_TIER_TULSA.account_id;
blink.tulsa_id=_ACCOUNT_TIER_TULSA.tulsa_id;

console.log('\n==========================\n'+JSON.stringify(blink)+'\n==========================\n');

//blink.LOGIN((r)=>{console.log('RESPONSE: '+r)});
//blink.VERIFY('065964',(r)=>{console.log('RESPONSE: '+r)});
//blink.GET_ACCOUNT_TIER_TULSA((r)=>{console.log('RESPONSE: '+r)})
//blink.REFRESH((r)=>{console.log('RESPONSE: '+r)});
//blink.GET_HOMESCREEN((r)=>{console.log('RESPONSE: '+r)});
//blink.GET_INDEX((r)=>{console.log('RESPONSE: '+r)});
//blink.LOGOUT((r)=>{console.log('RESPONSE: '+r)});
*/
