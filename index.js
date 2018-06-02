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
										"service": "phishin",
										"type": "item-no-menu",
										"title": self.getPhishinI18nString('YEARS'),
										"artist": "",
										"album": "",
										"icon": "fa fa-calendar-check-o",
										"uri": "phishin/years"
									},
									{
										"service": "phishin",
										"type": "item-no-menu",
										"title": self.getPhishinI18nString('TOURS'),
										"artist": "",
										"album": "",
										"icon": "fa fa-globe",
										"uri": "phishin/tours"
									},
									{
										"service": "phishin",
										"type": "item-no-menu",
										"title": self.getPhishinI18nString('ON_THIS_DAY'),
										"artist": "",
										"album": "",
										"icon": "fa fa-calendar-times-o",
										"uri": "phishin/thisday"
									},
									{
										"service": "phishin",
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
					response = self.listYearsTours(curUri);
				}
				else {
					//list shows from year picked
					response = self.listShows(curUri);
				}
			}

			else if (curUri.startsWith('phishin/tours')) {
				if (curUri == 'phishin/tours') {
					//list tours
					response = self.listYearsTours(curUri);
				} else {
					//list shows from year picked
					response = self.listShows(curUri);
				}
			}

			else if (curUri.startsWith('phishin/thisday')) {
				//get shows from this day
				response = self.listShows(curUri);
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

//List years or tours
ControllerPhishin.prototype.listYearsTours = function (curUri) {
	var self = this;
	var defer = libQ.defer();
	var uri;

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

	if (curUri == 'phishin/years') {
		uri = phApiBaseUrl + 'years.json?include_show_counts=true';
	}
	else if (curUri == 'phishin/tours') {
		uri = phApiBaseUrl + 'tours.json?per_page=10000&sort_attr=starts_on';
	}
	//self.logger.info("phURI: "+uri);

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error('An error occurred while querying Phish.in.'));
		}
		else {
			for (var i = 0; i < res.body.data.length; i++){
				if (curUri == 'phishin/years') {
					var name = res.body.data[i].date + ': ' + res.body.data[i].show_count + ' ' + self.getPhishinI18nString('SHOWS_LWR');
					var yearTourUri = 'phishin/years/'+ res.body.data[i].date;
				}
				else if (curUri == 'phishin/tours') {
					var name = res.body.data[i].name + ': ' + res.body.data[i].shows_count + ' ' + self.getPhishinI18nString('SHOWS_LWR');
					var yearTourUri = 'phishin/tours/'+ res.body.data[i].id;
				}
				//self.logger.info('name: '+name+', yearTourUri: '+yearTourUri);
				var yearTourFolder = {
					"service": "phishin",
					"type": "item-no-menu",
					"title": name,
					"artist": "",
					"album": "",
					"icon": "fa fa-calendar",
					"uri": yearTourUri
				};
				response.navigation.lists[0].items.push(yearTourFolder);
			}
//			self.logger.info("1st item name: "+response.navigation.lists[0].items[0].title);

			defer.resolve(response);
		}
	});

	return defer.promise;
//	return response;
}

//List shows by years, tours, or show of day
ControllerPhishin.prototype.listShows = function(curUri) {
	var self = this;
	var defer = libQ.defer();

	var today = new Date();
	var mm = today.getMonth()+1;
	var dd = today.getDate();
	var todayMonthDay = mm + '-' + dd;
	var whichCat = curUri.split('/')[1];
	var whichFolder = curUri.split('/')[2];
	var prevUri = 'phishin';
	var uri;
	var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
	//self.logger.info("whichCat: "+whichCat+", whichFolder: "+whichFolder);

	if (whichCat == 'years') {
		prevUri = 'phishin/years';
		uri = phApiBaseUrl + 'years/' + whichFolder + '.json';
	}
	else if (whichCat == 'tours') {
		prevUri = 'phishin/tours'
		uri = phApiBaseUrl + 'tours/' + whichFolder + '.json';
	} else if (whichCat == 'thisday') {
		uri = phApiBaseUrl + 'shows-on-day-of-year/' + todayMonthDay + '.json';
	}
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
				"uri":prevUri
			}
		}
	};

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error('An error occurred while querying Phish.in.'));
		}
		else {
			var dataLength = (whichCat == 'tours') ? res.body.data.shows.length : res.body.data.length;
			if (dataLength > 0) {
				//If shows returned, list them
				for (var i = 0; i < dataLength; i++){
					if (whichCat == 'tours') {
						var d = new Date(res.body.data.shows[i].date);
						var showDate = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
						var showVenue = res.body.data.shows[i].venue_name;
						var showCity = res.body.data.shows[i].location;
						var showUri = 'phishin/shows/'+  res.body.data.shows[i].id + '?prevUri=' + curUri;
					}
					else {
						var d = new Date(res.body.data[i].date);
						var showDate = months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
						var showVenue = res.body.data[i].venue_name;
						var showCity = res.body.data[i].location;
						var showUri = 'phishin/shows/'+  res.body.data[i].id + '?prevUri=' + curUri;
					}
					//self.logger.info(showDate+' '+showVenue+' '+showCity+', showUri: '+ showUri);
					var showFolder = {
						"service": "phishin",
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
					"service": "phishin",
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
	self.logger.info('ShowId: ' + showId);

	var phishinDefer = self.getShowTracks(showId);
	phishinDefer.then(function(results){
		self.logger.info("results[0] title: " + results[0].title);
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
			self.logger.info("track: " + results[i].title);
			response.navigation.lists[0].items.push(results[i]);
		}
		self.logger.info("1st item name: "+response.navigation.lists[0].items[0].title);

		defer.resolve(response);

	});

	return defer.promise;
}

//return list of tracks based on show id
ControllerPhishin.prototype.getShowTracks = function(id) {
	var self = this;
	var defer = libQ.defer();

	if (id === "") {
		var uri = phApiBaseUrl + 'random-show.json';
	}
	else {
		var uri = phApiBaseUrl + 'shows/' + id + '.json';
	}

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
					"service": "phishin",
					"type": "song",
					"title": track.title + " (" + trackTime + ")",
					"name": track.title + " (" + trackTime + ")",
					"artist": "Phish",
					"album": showTitle,
					"icon": "fa fa-music",
					"uri": track.mp3,
					"duration": Math.trunc(track.duration / 1000)
				});
			}
			defer.resolve(response);
		}
	});

	return defer.promise;
}

// Define a method to clear, add, and play an array of tracks
ControllerPhishin.prototype.clearAddPlayTrack = function(track) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::clearAddPlayTrack');

	self.commandRouter.logger.info(JSON.stringify(track));

	return self.sendSpopCommand('uplay', [track.uri]);
};

ControllerPhishin.prototype.seek = function (timepos) {
    this.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::seek to ' + timepos);

    return this.sendSpopCommand('seek '+timepos, []);
};

// Stop
ControllerPhishin.prototype.stop = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::stop');


};

// Spop pause
ControllerPhishin.prototype.pause = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::pause');


};

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
	var defer=libQ.defer();

	// Mandatory: retrieve all info for a given URI

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
