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

			else if (curUri.startsWith('phishin/songs')) {
				//get list of shows with this songs
				response = self.listSongShows(curUri);
			}

			else if (curUri.startsWith('phishin/venues')) {
				//get list of shows with this songs
				response = self.listVenueShows(curUri);
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

//list shows with the song picked in them
ControllerPhishin.prototype.listSongShows = function(curUri) {
	var self = this;
	var defer = libQ.defer();

	return defer.promise;
}

//list shows with the venue picked in them
ControllerPhishin.prototype.listVenueShows = function(curUri) {
	var self = this;
	var defer = libQ.defer();

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
					"albumart": "/albumart?sourceicon=music_service/volumio_phishin/ph-cover.png",
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
				"albumart": "/albumart?sourceicon=music_service/volumio_phishin/ph-cover.png",
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
	var dateMatch =/^(0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])[\/\-](((19)?[89][0-9])|((20)?[0-5][0-9]))$/;
	var searchCrit = query.value;
	var matchArray = dateMatch.exec(searchCrit);

	var year = '';
	if (matchArray != null){
  	if(matchArray[4] && matchArray[4] < 100){
    	year = "19" + matchArray[3];
  	}
  	else if(matchArray[6] && matchArray[6] < 100) {
    	year = "20" + matchArray[3];
  	}
  	else {
    	year = matchArray[3];
  	}
  	searchCrit = year + '-' + matchArray[1] + '-' + matchArray[2];
	}

	self.logger.info("query.value: " + query.value);
	self.logger.info("searchCrit: " + searchCrit);
	var searchUri = phApiBaseUrl + 'search/' + encodeURIComponent(searchCrit) + '.json';

	unirest.get(searchUri).end( function(res){
		if (res.error){
			defer.reject(new Error('An error occurred while querying Phish.in.'));
		}
		else {
			// Get shows, songs, venues, and tours
			var list = [];
			// Get shows
			if((res.body.data.hasOwnProperty('show') && res.body.data.show) || (res.body.data.hasOwnProperty('other_shows') && res.body.data.other_shows)) {
				var showlist = [];
				if(res.body.data.hasOwnProperty('show') && res.body.data.show) {
					var showVenue = res.body.data.show.venue_name;
					var showCity = res.body.data.show.location;
					var d = new Date(res.body.data.show.date);
					var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
					var showDate = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
					var showUri = 'phishin/shows/'+  res.body.data.show.id;

					var exactShow = {
						"service": self.serviceName,
						"type": "folder",
						"title": showDate + ' ' + showVenue + ', ' + showCity,
						"artist": "",
						"album": "",
						"icon": "fa fa-headphones",
						"uri": showUri
					};
					showlist.push(exactShow);
				}
				if(res.body.data.hasOwnProperty('other_shows') && res.body.data.other_shows) {
					if(res.body.data.other_shows.length > 0) {
						var otherShows = self._searchShows(res);
						for (var i in otherShows) {
							showlist.push(otherShows[i]);
						}
					}
				}
				list.push({
					'type':'title',
					'title':'Phish.in Shows',
					'availableListViews': ["list"],
					'items': showlist
				});
			}
			// Get songs
			if(res.body.data.hasOwnProperty('songs') && res.body.data.songs) {
					if(res.body.data.songs.length > 0) {
					var songlist = [];
					var songs =	self._searchSongs(res);
					console.log(songs);
					for (var i in songs) {
						songlist.push(songs[i]);
					}
					list.push({
						'type':'title',
						'title':'Phish.in Songs',
						'availableListViews': ["list"],
						'items': songlist
					});
				}
			}
			// Get venues
			if(res.body.data.hasOwnProperty('venues') && res.body.data.venues) {
				if(res.body.data.venues.length > 0){
					var venuelist = [];
					var venues = self._searchVenues(res);
					for (var i in venues) {
						venuelist.push(venues[i]);
					}
					list.push({
						'type':'title',
						'title':'Phish.in Venues',
						'availableListViews': ["list"],
						'items': venuelist
					});
				}
			}
			// Get tours
			if(res.body.data.hasOwnProperty('tours') && res.body.data.tours) {
				if(res.body.data.tours.length > 0) {
					var tourlist = [];
					var tours = self._searchTours(res);
					for (var i in tours) {
						tourlist.push(tours[i]);
					}
					list.push({
						'type':'title',
						'title':'Phish.in Tours',
						'availableListViews': ["list"],
						'items': tourlist
					});
				}
			}
			defer.resolve(list);
		}
	});

	return defer.promise;
};

ControllerPhishin.prototype._searchShows = function (res) {
	var self=this;
	var list = [];
	for (var i in res.body.data.other_shows){
		var showVenue = res.body.data.other_shows[i].venue_name;
		var showCity = res.body.data.other_shows[i].location;
		var d = new Date(res.body.data.other_shows[i].date);
		var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
		var showDate = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
		var showUri = 'phishin/shows/'+  res.body.data.other_shows[i].id;

		var item = {
			"service": self.serviceName,
			"type": "folder",
			"title": showDate + ' ' + showVenue + ', ' + showCity,
			"artist": "",
			"album": "",
			"icon": "fa fa-headphones",
			"uri": showUri
		};
		list.push(item);
	}
	return list;
};
/*
ControllerPhishin.prototype._searchSongs = function (res) {
	var self=this;
	var songIdList = [];
	var promises = [];
	for (var i in res.body.data.songs) {
		if (res.body.data.songs[i].alias_for) {
			songIdList.push(res.body.data.songs[i].alias_for);
		}
		else {
			songIdList.push(res.body.data.songs[i].id);
		}
	}
	for (var i in songIdList) {
		promises.push(self.getSongInfo(songIdList[i]));
	}
	var test = libQ.all(promises)
		.then(function(items){
			var list = [];
			for (var i in items){
				list.push(items[i]);
			}
			return list;
		});
	console.log(test);
	console.log(test._data);
	console.log(test._child);
}

ControllerPhishin.prototype.getSongInfo = function (songId) {
	var self=this;
	var defer=libQ.defer();

	var songUri = phApiBaseUrl + 'songs/' + songId + '.json';

	unirest.get(songUri).end( function(resSong){
		if (resSong.error){
			defer.reject(new Error('An error occurred while querying Phish.in.'));
		}
		else {
			var item = {
				"service": self.serviceName,
				"type": "item-no-menu",
				"title": resSong.body.data.title,
				"artist": "",
				"album": "",
				"icon": "fa fa-headphones",
				"uri": "phishin/song/" + songId
			};
			defer.resolve(item);
		}
	});
	return defer.promise;
}
*/
ControllerPhishin.prototype._searchSongs = function (res) {
	//maybe instead query for song id list, then push new item for each query?
	var self=this;
	var list = [];
	var songId;
	for (var i in res.body.data.songs) {
		if (res.body.data.songs[i].alias_for) {
			songId = res.body.data.songs[i].alias_for;
		}
		else {
			songId = res.body.data.songs[i].id;
		}

		var item = {
			"service": self.serviceName,
			"type": "item-no-menu",
			"title": res.body.data.songs[i].title,
			"artist": "",
			"album": "",
			"icon": "fa fa-headphones",
			"uri": "phishin/song/" + songId
		};
		list.push(item);
	}
	return list;
};

ControllerPhishin.prototype._searchVenues = function (res) {
	var self=this;
	var list = [];

	for (var i in res.body.data.venues) {

		var item = {
			"service": self.serviceName,
			"type": "item-no-menu",
			"title": res.body.data.venues[i].name + ", " + res.body.data.venues[i].location,
			"artist": "",
			"album": "",
			"icon": "fa fa-headphones",
			"uri": "phishin/venues/" + res.body.data.venues[i].id
		}
		list.push(item);
	}

	return list;
};

ControllerPhishin.prototype._searchTours = function (res) {
	var self=this;
	var list = [];

	for (var i in res.body.data.tours) {
		var item = {
			"service": self.serviceName,
			"type": "item-no-menu",
			"title": res.body.data.tours[i].name,
			"artist": "",
			"album": "",
			"icon": "fa fa-headphones",
			"uri": "phishin/tours/" + res.body.data.tours[i].id
		}
		list.push(item);
	}

	return list;
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
