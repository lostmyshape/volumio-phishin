'use strict';

var libQ = require('kew');
var fs=require('fs-extra');
var config = new (require('v-conf'))();
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var unirest = require('unirest');

var phApiBaseUrl = 'http://phish.in/api/v1/';


module.exports = ControllerPhishin;
function ControllerPhishin(context) {
	var self = this;

	this.context = context;
	this.commandRouter = this.context.coreCommand;
	this.logger = this.context.logger;
	this.configManager = this.context.configManager;

}



ControllerPhishin.prototype.onVolumioStart = function()
{
	var self = this;
	var configFile=this.commandRouter.pluginManager.getConfigurationFile(this.context,'config.json');
	this.config = new (require('v-conf'))();
	this.config.loadFile(configFile);

  return libQ.resolve();
}

ControllerPhishin.prototype.onStart = function() {
  var self = this;
	self.addToBrowseSources();

	self.mpdPlugin = this.commandRouter.pluginManager.getPlugin('music_service', 'mpd');
	self.serviceName = "volumio-phishin";
	self.loadPhishinI18nStrings();

  return libQ.resolve();
};

ControllerPhishin.prototype.onStop = function() {
    return libQ.resolve();
};

ControllerPhishin.prototype.onRestart = function() {
    var self = this;
    // Optional, use if you need it
		return libQ.resolve();
};


// Configuration Methods -----------------------------------------------------------------------------

ControllerPhishin.prototype.getUIConfig = function() {
    var defer = libQ.defer();
    var self = this;

    var lang_code = this.commandRouter.sharedVars.get('language_code');

    self.commandRouter.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
        __dirname+'/i18n/strings_en.json',
        __dirname + '/UIConfig.json')
        .then(function(uiconf)
        {


            defer.resolve(uiconf);
        })
        .fail(function()
        {
            defer.reject(new Error());
        });

    return defer.promise;
};

ControllerPhishin.prototype.getConfigurationFiles = function() {
	return ['config.json'];
}

ControllerPhishin.prototype.setUIConfig = function(data) {
	var self = this;
	//Perform your installation tasks here
};

ControllerPhishin.prototype.getConf = function(varName) {
	var self = this;
	//Perform your installation tasks here
};

ControllerPhishin.prototype.setConf = function(varName, varValue) {
	var self = this;
	//Perform your installation tasks here
};



// Playback Controls ---------------------------------------------------------------------------------------
// If your plugin is not a music_sevice don't use this part and delete it


ControllerPhishin.prototype.addToBrowseSources = function () {
	var self = this;
	self.commandRouter.volumioAddToBrowseSources({
			name: 'Phish.in',
			uri: 'phishin',
			plugin_type: 'music_service',
			plugin_name: 'volumio-phishin'
	});
};

ControllerPhishin.prototype.handleBrowseUri = function (curUri) {
    var self = this;
    var response;

		self.logger.info("CURURI: "+curUri);

		if (curUri.startsWith('phishin')) {
			if (curUri == 'phishin') {
				//list root menu
				response = libQ.resolve({
					"navigation": {
					"prev": {
							"uri": "/"
						},
						"lists": [
							{
								"availableListViews": ["list"],
								"items": [
									{
										"service": self.serviceName,
										"type": "item-no-menu",
										"title": self.getPhishinI18nString('YEARS'),
										"artist": "",
										"album": "",
										"icon": "fa fa-calendar-check-o",
										"uri": "phishin/years"
									},
									{
										"service": self.serviceName,
										"type": "item-no-menu",
										"title": self.getPhishinI18nString('TOURS'),
										"artist": "",
										"album": "",
										"icon": "fa fa-globe",
										"uri": "phishin/tours"
									},
									{
										"service": self.serviceName,
										"type": "item-no-menu",
										"title": self.getPhishinI18nString('ON_THIS_DAY'),
										"artist": "",
										"album": "",
										"icon": "fa fa-calendar-times-o",
										"uri": "phishin/thisday"
									},
									{
										"service": self.serviceName,
										"type": "folder",
										"title": self.getPhishinI18nString('RANDOM_SHOW'),
										"artist": "",
										"album": "",
										"icon": "fa fa-random",
										"uri": "phishin/random"
									}
								]
							}
						]
					}
				});
			}

			else if (curUri.startsWith('phishin/years')){
				if (curUri == 'phishin/years') {
					//list years
					response = self.listYears(curUri);
				}
				else {
					//list shows from year picked
					response = self.listYearShows(curUri);
				}
			}

			else if (curUri.startsWith('phishin/tours')) {
				if (curUri == 'phishin/tours') {
					//list tours
					response = self.listTours(curUri);
				} else {
					//list shows from year picked
					response = self.listTourShows(curUri);
				}
			}

			else if (curUri.startsWith('phishin/thisday')) {
				//get shows from this day
				response = self.listTodayShows(curUri);
			}

			else if (curUri.startsWith('phishin/shows')) {
				//get random show tracks
				response = self.listShowTracks(curUri);
			}

			else if (curUri.startsWith('phishin/random')) {
				//get random show tracks
				response = self.listShowTracks(curUri);
			}
		}
    return response;
};

//List Years
ControllerPhishin.prototype.listYears = function (curUri) {
	var self = this;
	var defer = libQ.defer();
	var uri = phApiBaseUrl + 'years.json?include_show_counts=true';
	//self.logger.info("phURI: "+uri);

	var response = {
		"navigation": {
			"lists": [
				{
					"availableListViews":["list"],
					"items":[]
				}
			],
			"prev":{
				"uri":"phishin"
			}
		}
	};
	//self.logger.info("phURI: "+uri);

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error('An error occurred while querying Phish.in.'));
		}
		else {
			for (var i = 0; i < res.body.data.length; i++){
				var name = res.body.data[i].date + ': ' + res.body.data[i].show_count + ' ' + self.getPhishinI18nString('SHOWS_LWR');
				var yearUri = 'phishin/years/'+ res.body.data[i].date;
				//self.logger.info('name: '+name+', yearUri: '+yearUri);
				var yearFolder = {
					"service": self.serviceName,
					"type": "item-no-menu",
					"title": name,
					"artist": "",
					"album": "",
					"icon": "fa fa-calendar",
					"uri": yearUri
				};
				response.navigation.lists[0].items.push(yearFolder);
			}
//			self.logger.info("1st item name: "+response.navigation.lists[0].items[0].title);

			defer.resolve(response);
		}
	});

	return defer.promise;
//	return response;
}
//List tours
ControllerPhishin.prototype.listTours = function (curUri) {
	var self = this;
	var defer = libQ.defer();
	var uri = phApiBaseUrl + 'tours.json?per_page=10000&sort_attr=starts_on';
	//self.logger.info("phURI: "+uri);

	var response = {
		"navigation": {
			"lists": [
				{
					"availableListViews":["list"],
					"items":[]
				}
			],
			"prev":{
				"uri":"phishin"
			}
		}
	};

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error('An error occurred while querying Phish.in.'));
		}
		else {
			for (var i = 0; i < res.body.data.length; i++){
				var name = res.body.data[i].name + ': ' + res.body.data[i].shows_count + ' ' + self.getPhishinI18nString('SHOWS_LWR');
				var tourUri = 'phishin/tours/'+ res.body.data[i].id;
				//self.logger.info('name: '+name+', yearTourUri: '+ tourUri);
				var tourFolder = {
					"service": self.serviceName,
					"type": "item-no-menu",
					"title": name,
					"artist": "",
					"album": "",
					"icon": "fa fa-calendar",
					"uri": tourUri
				};
				response.navigation.lists[0].items.push(tourFolder);
			}
//			self.logger.info("1st item name: "+response.navigation.lists[0].items[0].title);

			defer.resolve(response);
		}
	});

	return defer.promise;
//	return response;
}

//List shows by year chosen
ControllerPhishin.prototype.listYearShows = function(curUri) {
	var self = this;
	var defer = libQ.defer();

	var yearReq = curUri.split('/')[2];
	var uri = phApiBaseUrl + 'years/' + yearReq + '.json';
	var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

	var response = {
		"navigation": {
			"lists": [
				{
					"availableListViews":["list"],
					"items":[]
				}
			],
			"prev":{
				"uri":"phishin/years"
			}
		}
	};

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error('An error occurred while querying Phish.in.'));
		}
		else {
			var dataLength = res.body.data.length;
			for (var i = 0; i < dataLength; i++){
				var d = new Date(res.body.data[i].date);
				var showDate = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
				var showVenue = res.body.data[i].venue_name;
				var showCity = res.body.data[i].location;
				var showUri = 'phishin/shows/'+  res.body.data[i].id + '?prevUri=' + curUri;
				//self.logger.info(showDate+' '+showVenue+' '+showCity+', showUri: '+ showUri);
				var showFolder = {
					"service": self.serviceName,
					"type": "folder",
					"title": showDate + ' ' + showVenue + ', ' + showCity,
					"artist": "",
					"album": "",
					"icon": "fa fa-headphones",
					"uri": showUri
				};
				response.navigation.lists[0].items.push(showFolder);
			}
			//self.logger.info("1st item name: "+response.navigation.lists[0].items[0].title);

			defer.resolve(response);
		}
	});

	return defer.promise;
}

//List shows by tour chosen
ControllerPhishin.prototype.listTourShows = function(curUri) {
	var self = this;
	var defer = libQ.defer();

	var tourReq = curUri.split('/')[2];
	var uri = phApiBaseUrl + 'tours/' + tourReq + '.json';
	var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
	//self.logger.info("uri: " + uri);

	var response = {
		"navigation": {
			"lists": [
				{
					"availableListViews":["list"],
					"items":[]
				}
			],
			"prev":{
				"uri":"phishin/tours"
			}
		}
	};

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error('An error occurred while querying Phish.in.'));
		}
		else {
			var dataLength = res.body.data.shows.length;
			for (var i = 0; i < dataLength; i++){
				var d = new Date(res.body.data.shows[i].date);
				var showDate = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
				var showVenue = res.body.data.shows[i].venue_name;
				var showCity = res.body.data.shows[i].location;
				var showUri = 'phishin/shows/'+  res.body.data.shows[i].id + '?prevUri=' + curUri;
				//self.logger.info(showDate+' '+showVenue+' '+showCity+', showUri: '+ showUri);
				var showFolder = {
					"service": self.serviceName,
					"type": "folder",
					"title": showDate + ' ' + showVenue + ', ' + showCity,
					"artist": "",
					"album": "",
					"icon": "fa fa-headphones",
					"uri": showUri
				};
				response.navigation.lists[0].items.push(showFolder);
			}
			//self.logger.info("1st item name: "+response.navigation.lists[0].items[0].title);

			defer.resolve(response);
		}
	});

	return defer.promise;
}

//List show(s) of day
ControllerPhishin.prototype.listTodayShows = function(curUri) {
	var self = this;
	var defer = libQ.defer();

	var today = new Date();
	var mm = today.getMonth()+1;
	var dd = today.getDate();
	var todayMonthDay = mm + '-' + dd;
	var uri = phApiBaseUrl + 'shows-on-day-of-year/' + todayMonthDay + '.json';
	var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
	//self.logger.info("uri: " + uri);

	var response = {
		"navigation": {
			"lists": [
				{
					"availableListViews":["list"],
					"items":[]
				}
			],
			"prev":{
				"uri":"phishin"
			}
		}
	};

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error('An error occurred while querying Phish.in.'));
		}
		else {
			var dataLength = res.body.data.length;
			if (dataLength > 0) {
				//If shows returned, list them
				for (var i = 0; i < dataLength; i++){
					var d = new Date(res.body.data[i].date);
					var showDate = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
					var showVenue = res.body.data[i].venue_name;
					var showCity = res.body.data[i].location;
					var showUri = 'phishin/shows/'+  res.body.data[i].id + '?prevUri=' + curUri;

					var showFolder = {
						"service": self.serviceName,
						"type": "folder",
						"title": showDate + ' ' + showVenue + ', ' + showCity,
						"artist": "",
						"album": "",
						"icon": "fa fa-headphones",
						"uri": showUri
					};
					response.navigation.lists[0].items.push(showFolder);
				}
			}
			else {
				//Add message when no show of day
				var showFolder = {
					"service": self.serviceName,
					"type": "item-no-menu",
					"title": self.getPhishinI18nString('NO_SHOW_TODAY'),
					"artist": "",
					"album": "",
					"icon": "fa fa-ban",
					"uri": 'phishin'
				};
				response.navigation.lists[0].items.push(showFolder);
			}
			//self.logger.info("1st item name: "+response.navigation.lists[0].items[0].title);

			defer.resolve(response);
		}
	});

	return defer.promise;
}

//list tracks when show picked
ControllerPhishin.prototype.listShowTracks = function(curUri) {
	var self = this;
	var defer = libQ.defer();

	var showUri = curUri.match(/[^?]*/);
	showUri = showUri[0];
	var prevUri = curUri.match(/prevUri=[^&\s]*/m);
	if (!prevUri) {
		prevUri = 'phishin';
	}
	else {
		prevUri = prevUri[0];
		prevUri = prevUri.substring(prevUri.indexOf('=') +1 ,prevUri.length);
	}


	var uriSplitted = showUri.split('/');
	if (uriSplitted[1] == 'random') {
		var showId = '';
	}
	else {
		var showId = uriSplitted[2];
	}
	//self.logger.info('ShowId: ' + showId);

	var phishinDefer = self.getShowTracks(showId);
	phishinDefer.then(function(results){
		//self.logger.info("results[0] title: " + results[0].title);
		var response = {
			"navigation": {
				"lists": [
					{
						"availableListViews":["list"],
						"items":[]
					}
				],
				"prev":{
					"uri":prevUri
				}
			}
		};
		for (var i = 0; i < results.length; i++) {
			//self.logger.info("track: " + results[i].title);
			response.navigation.lists[0].items.push(results[i]);
		}
		//self.logger.info("1st item name: "+response.navigation.lists[0].items[0].title);

		defer.resolve(response);

	});

	return defer.promise;
}

//return list of tracks based on show id
ControllerPhishin.prototype.getShowTracks = function(id, sendList) {
	var self = this;
	var defer = libQ.defer();
	if (sendList === undefined) sendList = true;
	self.logger.info("id in getShowTracks: " + id);

	if (id === ""  || id === undefined) {
		var uri = phApiBaseUrl + 'random-show.json';
	}
	else {
		var uri = phApiBaseUrl + 'shows/' + id + '.json';
	}
	self.logger.info("uri in getShowTracks: " + uri);

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error('An error occurred while querying Phish.in.'));
		}
		else {
			var response = [];
			var d = new Date(res.body.data.date);
			var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
			var showDate = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
			var showVenue = res.body.data.venue.name;
			var showCity = res.body.data.venue.location;
			var showTitle = showDate + ' ' + showVenue + ', ' + showCity;
			for (var i = 0; i < res.body.data.tracks.length; i++) {
				var track = res.body.data.tracks[i];
				var trackHours = parseInt((track.duration / (1000 * 60 * 60)) % 24),
				trackMinutes = parseInt((track.duration / (1000 * 60)) % 60),
				trackSeconds = parseInt((track.duration / 1000) % 60);
				trackMinutes = (trackHours > 0 && trackMinutes < 10) ? "0" + trackMinutes : trackMinutes;
				trackSeconds = (trackSeconds < 10) ? "0" + trackSeconds : trackSeconds;
				var trackTime = ((trackHours > 0) ? trackHours + ":" : "") + trackMinutes + ":" + trackSeconds;
				response.push({
					"service": self.serviceName,
					"type": "song",
					"title": track.title + (sendList ? " (" + trackTime + ")" : ""),
					"name": track.title + (sendList ? " (" + trackTime + ")" : ""),
					"tracknumber": track.position,
					"artist": "Phish",
					"album": showTitle,
					"icon": (sendList ? "fa fa-music" : ""),
					//"albumart": "/albumart?sourceicon=music_service/volumio_phishin/ph-cover.png",
					"albumart": "/albumart?path=music_service/volumio_phishin/ph-cover.png",
					"uri": (sendList ? "phishin/track/" + track.id +"?showTitle=" + showTitle : track.mp3),
					"duration": Math.trunc(track.duration / 1000)
				});
			}
			defer.resolve(response);
		}
	});

	return defer.promise;
}

// Get single track for explodeUri
ControllerPhishin.prototype.getTrack = function(id) {
	var self = this;
	var defer = libQ.defer();

	var uri = phApiBaseUrl + 'tracks/' + id + '.json';

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error('An error occurred while querying Phish.in.'));
		}
		else {
			//create new promise, resolve then send to new function to add show title
			var d = new Date(res.body.data.show_date);
			var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
			var showDate = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
			var showTitle = showDate;
			var response = [{
				"service": self.serviceName,
				"type": "song",
				"title": res.body.data.title,
				"name": res.body.data.title,
				"tracknumber": res.body.data.position,
				"artist": "Phish",
				"album": showTitle,
				"show_id": res.body.data.show_id,
				//"albumart": "/albumart?sourceicon=music_service/volumio_phishin/ph-cover.png",
				"albumart": "/albumart?path=music_service/volumio_phishin/ph-cover.png",
				"uri": res.body.data.mp3,
				"duration": Math.trunc(res.body.data.duration / 1000)
			}];
			defer.resolve(response);
		}
	});

	return defer.promise
		.then(function(result){
			var deferRes = libQ.defer();
			var showTitleUri = phApiBaseUrl + 'shows/' + result[0].show_id + '.json';
			unirest.get(showTitleUri).end( function(titleRes){
				if (titleRes.error){
					deferRes.reject(new Error('An error occurred while querying Phish.in.'));
				}
				else {
					var showVenue = titleRes.body.data.venue.name;
					var showCity = titleRes.body.data.venue.location;
					var d = new Date(titleRes.body.data.date);
					var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
					var showDate = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
					var newShowTitle = showDate + ' ' + showVenue + ', ' + showCity;
					result[0].album = newShowTitle;
					deferRes.resolve(result);
				}
			});
			return deferRes.promise;
		});
}

// Define a method to clear, add, and play an array of tracks
ControllerPhishin.prototype.clearAddPlayTrack = function(track) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::clearAddPlayTrack');

	var safeUri = track.uri.replace(/"/g,'\\"');

	return self.mpdPlugin.sendMpdCommand('stop',[])
		.then(function()
		{
			return self.mpdPlugin.sendMpdCommand('clear',[]);
		})
		.then(function()
		{
				return self.mpdPlugin.sendMpdCommand('load "'+safeUri+'"',[]);
		})
		.fail(function (e) {
				return self.mpdPlugin.sendMpdCommand('add "'+safeUri+'"',[]);
		})
		.then(function()
		{
				self.commandRouter.stateMachine.setConsumeUpdateService('mpd');
				return self.mpdPlugin.sendMpdCommand('play',[]);
		});
}

ControllerPhishin.prototype.seek = function (timepos) {
	var self = this;
  this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::seek to ' + timepos);

	return self.mpdPlugin.seek(timepos);
}

// Stop
ControllerPhishin.prototype.stop = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::stop');

	return self.mpdPlugin.stop().then(function () {
    return self.mpdPlugin.getState().then(function (state) {
      return self.commandRouter.stateMachine.syncState(state, self.serviceName);
  	});
  });
}

// Pause
ControllerPhishin.prototype.pause = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::pause');

	return self.mpdPlugin.pause().then(function () {
    return self.mpdPlugin.getState().then(function (state) {
      return self.commandRouter.stateMachine.syncState(state, self.serviceName);
    });
  });

}

// Resume
ControllerPhishin.prototype.resume = function() {
	var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::resume');
	//self.commandRouter.stateMachine.setConsumeUpdateService('mpd');
  //return self.mpdPlugin.sendMpdCommand('play',[]);
	return self.mpdPlugin.resume().then(function () {
    return self.mpdPlugin.getState().then(function (state) {
      return self.commandRouter.stateMachine.syncState(state, self.serviceName);
    });
  });

}
/*
// Next
ControllerPhishin.prototype.next = function () {
	var self = this;
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::next');
	return self.mpdPlugin.sendMpdCommand('next', []);
}

// Previous
ControllerPhishin.prototype.previous = function () {
	var self = this;
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::previous');
	return self.mpdPlugin.sendMpdCommand('previous', []);
}

// Random
ControllerPhishin.prototype.random = function () {
	var self = this;
	var string = randomcmd ? 1 : 0;
	self.commandRouter.stateMachine.setConsumeUpdateService('mpd');
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::random toggle');

	return self.mpdPlugin.sendMpdCommand('random', [string]);
}

// Repeat
ControllerPhishin.prototype.repeat = function (repeatcmd) {
	var self = this;
	var string = repeatcmd ? 1 : 0;
	self.commandRouter.stateMachine.setConsumeUpdateService('mpd');
	this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::repead toggle');

	return self.mpdPlugin.sendMpdCommand('repeat', [string]);
}

// Next
ControllerPhishin.prototype.next = function () {
	this.commandRouter.pushConsoleMessage('ControllerPhishin::next');
	return this.sendMpdCommand('next', []);
};

// Previous
ControllerPhishin.prototype.previous = function () {
	this.commandRouter.pushConsoleMessage('ControllerPhishin::previous');
	return this.sendMpdCommand('previous', []);
};

// Random
ControllerPhishin.prototype.random = function (randomcmd) {
	var self = this;
	var string = randomcmd ? 1 : 0;
	self.commandRouter.stateMachine.setConsumeUpdateService('mpd');
	this.commandRouter.pushConsoleMessage('ControllerPhishin::random toggle');

	return this.sendMpdCommand('random', [string])
};

// Repeat
ControllerPhishin.prototype.repeat = function (repeatcmd) {
	var self = this;
	var string = repeatcmd ? 1 : 0;
	self.commandRouter.stateMachine.setConsumeUpdateService('mpd');
	this.commandRouter.pushConsoleMessage('ControllerPhishin::repeat toggle');

	return this.sendMpdCommand('repeat', [string]);
};
*/
// Get state
ControllerPhishin.prototype.getState = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::getState');


};

//Parse state
ControllerPhishin.prototype.parseState = function(sState) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::parseState');

	//Use this method to parse the state and eventually send it with the following function
};

// Announce updated State
ControllerPhishin.prototype.pushState = function(state) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::pushState');

	return self.commandRouter.servicePushState(state, self.servicename);
};


ControllerPhishin.prototype.explodeUri = function(uri) {
	var self = this;
	var defer = libQ.defer();
	var items = [];

	// Need to explode maybe "search"
	if (uri.startsWith('phishin/shows')) {
		var showUri = uri.match(/[^?]*/);
		showUri = showUri[0];
		var uriSplitted = showUri.split('/');
		var showId = uriSplitted[2];

		items = self.getShowTracks(showId, false);
		defer.resolve(items);
	}
	else if (uri.startsWith('phishin/track')) {
		var trackUri = uri.match(/[^?]*/);
		trackUri = trackUri[0];
		var uriSplitted = trackUri.split('/');
		var trackId = uriSplitted[2];
		var showTitle = uri.match(/showTitle=[^&$]*/m);
		showTitle = showTitle[0];
		showTitle = showTitle.substring(showTitle.indexOf('=') +1 ,showTitle.length);

		items = self.getTrack(trackId);
		defer.resolve(items);
	}
	else if (uri.startsWith('phishin/random')) {
		var trackId = "";

		items = self.getShowTracks(showId, false);
		defer.resolve(items);
	}

	return defer.promise;
};

ControllerPhishin.prototype.getAlbumArt = function (data, path) {

	var artist, album;

	if (data != undefined && data.path != undefined) {
		path = data.path;
	}

	var web;

	if (data != undefined && data.artist != undefined) {
		artist = data.artist;
		if (data.album != undefined)
			album = data.album;
		else album = data.artist;

		web = '?web=' + nodetools.urlEncode(artist) + '/' + nodetools.urlEncode(album) + '/large'
	}

	var url = '/albumart';

	if (web != undefined)
		url = url + web;

	if (web != undefined && path != undefined)
		url = url + '&';
	else if (path != undefined)
		url = url + '?';

	if (path != undefined)
		url = url + 'path=' + nodetools.urlEncode(path);

	return url;
};





ControllerPhishin.prototype.search = function (query) {
	var self=this;
	var defer=libQ.defer();

	// Mandatory, search. You can divide the search in sections using following functions

	return defer.promise;
};

ControllerPhishin.prototype._searchArtists = function (results) {

};

ControllerPhishin.prototype._searchAlbums = function (results) {

};

ControllerPhishin.prototype._searchPlaylists = function (results) {


};

ControllerPhishin.prototype._searchTracks = function (results) {

};

ControllerPhishin.prototype.loadPhishinI18nStrings = function () {
  var self=this;

  try {
    var language_code = this.commandRouter.sharedVars.get('language_code');
    self.i18nStrings=fs.readJsonSync(__dirname+'/i18n/strings_'+language_code+".json");
  } catch(e) {
    self.i18nStrings=fs.readJsonSync(__dirname+'/i18n/strings_en.json');
  }

  self.i18nStringsDefaults=fs.readJsonSync(__dirname+'/i18n/strings_en.json');
};

ControllerPhishin.prototype.getPhishinI18nString = function (key) {
  var self=this;

  if (self.i18nStrings[key] !== undefined)
    return self.i18nStrings[key];
  else
    return self.i18nStringsDefaults[key];
};
