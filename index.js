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

	self.resetHistory();
}

ControllerPhishin.prototype.resetHistory = function() {
  var self = this;

  self.uriHistory = [];
  self.historyIndex = -1;
}

ControllerPhishin.prototype.historyAdd = function(uri) {
  var self = this;

  // If the new url is equal to the previous one
  // this means it's a "Back" action
  if (self.uriHistory[self.historyIndex - 1] == uri) {
    self.historyPop();
  } else {
    self.uriHistory.push(uri);
    self.historyIndex++;
  }
}

ControllerPhishin.prototype.historyPop = function(uri) {
  var self = this;

  self.uriHistory.pop();
  self.historyIndex--;
}

ControllerPhishin.prototype.getPrevUri = function() {
  var self = this;
  var uri;

  if (self.historyIndex >= 0) {
    uri = self.uriHistory[self.historyIndex - 1];
  } else {
    uri = 'phishin';
  }

  return uri;
}


ControllerPhishin.prototype.onVolumioStart = function() {
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
				self.resetHistory();
				self.historyAdd(curUri);
				//list root menu
				response = libQ.resolve({
					"navigation": {
					"prev":{
							"uri": self.getPrevUri()//"/"
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
					self.historyAdd(curUri);
					response = self.listYears(curUri);
				}
				else {
					//list shows from year picked
					self.historyAdd(curUri);
					response = self.listYearShows(curUri);
				}
			}

			else if (curUri.startsWith('phishin/tours')) {
				if (curUri == 'phishin/tours') {
					//list tours
					self.historyAdd(curUri);
					response = self.listTours(curUri);
				} else {
					//list shows from year picked
					self.historyAdd(curUri);
					response = self.listTourShows(curUri);
				}
			}

			else if (curUri.startsWith('phishin/thisday')) {
				//get shows from this day
				self.historyAdd(curUri);
				response = self.listTodayShows(curUri);
			}

			else if (curUri.startsWith('phishin/shows')) {
				//get random show tracks
				self.historyAdd(curUri);
				response = self.listShowTracks(curUri);
			}

			else if (curUri.startsWith('phishin/random')) {
				//get random show tracks
				self.historyAdd(curUri);
				//self.resetHistory();
				response = self.listShowTracks(curUri);
			}

			else if (curUri.startsWith('phishin/songs')) {
				//get list of shows with this songs
				self.historyAdd(curUri);
				response = self.listSongShows(curUri);
			}

			else if (curUri.startsWith('phishin/venues')) {
				//get list of shows with this songs
				self.historyAdd(curUri);
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

	var response = {
		"navigation": {
			"lists": [
				{
					"availableListViews":["list"],
					"items":[]
				}
			],
			"prev":{
				"uri":self.getPrevUri()
			}
		}
	};

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error(self.getPhishinI18nString('QUERY_ERROR')));
			self.commandRouter.pushToastMessage('error', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('QUERY_ERROR'));
			self.historyPop();
		}
		else {
			for (var i = 0; i < res.body.data.length; i++){
				var name = res.body.data[i].date + ': ' + res.body.data[i].show_count + ' ' + self.getPhishinI18nString('SHOWS_LWR');
				var yearUri = 'phishin/years/'+ res.body.data[i].date;
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

			defer.resolve(response);
		}
	});

	return defer.promise;
}

//List tours
ControllerPhishin.prototype.listTours = function (curUri) {
	var self = this;
	var defer = libQ.defer();
	var uri = phApiBaseUrl + 'tours.json?per_page=10000&sort_attr=starts_on';

	var response = {
		"navigation": {
			"lists": [
				{
					"availableListViews":["list"],
					"items":[]
				}
			],
			"prev":{
				"uri":self.getPrevUri()
			}
		}
	};

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error(self.getPhishinI18nString('QUERY_ERROR')));
			self.commandRouter.pushToastMessage('error', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('QUERY_ERROR'));
			self.historyPop();
		}
		else {
			for (var i = 0; i < res.body.data.length; i++){
				var name = res.body.data[i].name + ': ' + res.body.data[i].shows_count + ' ' + self.getPhishinI18nString('SHOWS_LWR');
				var tourUri = 'phishin/tours/'+ res.body.data[i].id;
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

			defer.resolve(response);
		}
	});

	return defer.promise;
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
				"uri":self.getPrevUri()
			}
		}
	};

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error(self.getPhishinI18nString('QUERY_ERROR')));
			self.commandRouter.pushToastMessage('error', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('QUERY_ERROR'));
			self.historyPop();
		}
		else {
			var dataLength = res.body.data.length;
			for (var i = 0; i < dataLength; i++){
				var d = res.body.data[i].date.split('-');
				var showDate = months[d[1]-1] + ' ' + parseInt(d[2],10) + ', ' + d[0];
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

	var response = {
		"navigation": {
			"lists": [
				{
					"availableListViews":["list"],
					"items":[]
				}
			],
			"prev":{
				"uri":self.getPrevUri()
			}
		}
	};

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error(self.getPhishinI18nString('QUERY_ERROR')));
			self.commandRouter.pushToastMessage('error', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('QUERY_ERROR'));
			self.historyPop();
		}
		else {
			var dataLength = res.body.data.shows.length;
			for (var i = 0; i < dataLength; i++){
				var d = res.body.data.shows[i].date.split('-');
				var showDate = months[d[1]-1] + ' ' + parseInt(d[2],10) + ', ' + d[0];
				var showVenue = res.body.data.shows[i].venue_name;
				var showCity = res.body.data.shows[i].location;
				var showUri = 'phishin/shows/'+  res.body.data.shows[i].id;
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

	var response = {
		"navigation": {
			"lists": [
				{
					"availableListViews":["list"],
					"items":[]
				}
			],
			"prev":{
				"uri":self.getPrevUri()
			}
		}
	};

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error(self.getPhishinI18nString('QUERY_ERROR')));
			self.commandRouter.pushToastMessage('error', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('QUERY_ERROR'));
			self.historyPop();
		}
		else {
			var dataLength = res.body.data.length;
			if (dataLength > 0) {
				//If shows returned, list them
				for (var i = 0; i < dataLength; i++){
					var d = res.body.data[i].date.split('-');
					var showDate = months[d[1]-1] + ' ' + parseInt(d[2],10) + ', ' + d[0];
					var showVenue = res.body.data[i].venue_name;
					var showCity = res.body.data[i].location;
					var showUri = 'phishin/shows/'+  res.body.data[i].id;

					var showFolder = {
						"service": self.serviceName,
						"type": "folder",
						"title": showDate + ' ' + showVenue + ', ' + showCity,
						"artist": "",
						"album": "",
						"icon": "fa fa-headphones",
						"uri": showUri,
						"sortdate": d
					};
					response.navigation.lists[0].items.push(showFolder);
				}
				response.navigation.lists[0].items.sort(self.compareShowYears);
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

	var songReq = curUri.split('/')[2];

	return libQ.all(self.getSongShows(songReq))
		.then(function(showIdOb){
			var promises = [];
			for (var i in showIdOb[0].showIdList) {
				promises.push(self.getShowInfo(showIdOb[0].showIdList[i]));
			}
			return libQ.all(promises)
				.then(function(items){
					var itemList = [];
					for (var i in items){
						itemList.push(items[i]);
					}
					itemList = itemList.sort(self.compareShowYears);
					var response = {
						"navigation": {
							"lists": [
								{
									'type':'title',
									'title':showIdOb[0].showIdList.length + ' ' + self.getPhishinI18nString('SHOWS_CONTAINING') + ': ' + showIdOb[0].songTitle,
									"availableListViews":["list"],
									"items":itemList
								}
							],
							"prev":{
								"uri":self.getPrevUri()
							}
						}
					};
					return response;
				});
		});
}

ControllerPhishin.prototype.getSongShows = function (songId){
	var self = this;
	var defer = libQ.defer();

	var uri = phApiBaseUrl + 'songs/' + songId + '.json';
	var showIdOb = {
		"showIdList":[]
	}
	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error(self.getPhishinI18nString('QUERY_ERROR')));
			self.commandRouter.pushToastMessage('error', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('QUERY_ERROR'));
			self.historyPop();
		}
		else {
			self.commandRouter.pushToastMessage('info', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('RETREIVING') + ' ' + self.getPhishinI18nString('SHOWS_CONTAINING') + ' ' + res.body.data.title + '. ' + self.getPhishinI18nString('TAKE_AWHILE'));
			showIdOb.songTitle = res.body.data.title;
			var dataLength = res.body.data.tracks.length;
			for (var i = 0; i < dataLength; i++) {
				console.log("res.body.data.tracks[i].show_id: " + res.body.data.tracks[i].show_id);
				showIdOb.showIdList.push(res.body.data.tracks[i].show_id);
			}
			console.log("showIdOb.showIdList: " + showIdOb.showIdList);
			defer.resolve(showIdOb);
		}
	});

	return defer.promise;
}

ControllerPhishin.prototype.getShowInfo = function (showId) {
	var self=this;
	var defer=libQ.defer();

	var showUri = phApiBaseUrl + 'shows/' + showId + '.json';
	console.log(showUri);

	unirest.get(showUri).end( function(resShow){
		var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
		if (resShow.error){
			console.log("error here");
			defer.reject(new Error(self.getPhishinI18nString('QUERY_ERROR')));
			self.commandRouter.pushToastMessage('error', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('QUERY_ERROR'));
		}
		else {
			var d = resShow.body.data.date.split('-');
			var showDate = months[d[1]-1] + ' ' + parseInt(d[2],10) + ', ' + d[0];
			var showVenue = resShow.body.data.venue.name;
			var showCity = resShow.body.data.venue.location;
			var showUri = 'phishin/shows/'+  resShow.body.data.id;
			var showFolder = {
				"service": self.serviceName,
				"type": "folder",
				"title": showDate + ' ' + showVenue + ', ' + showCity,
				"artist": "",
				"album": "",
				"icon": "fa fa-headphones",
				"uri": showUri,
				"sortdate": d
			};
			defer.resolve(showFolder);
		}
	});
	return defer.promise;
}

//list shows with the venue picked in them
ControllerPhishin.prototype.listVenueShows = function(curUri) {
	var self = this;
	var defer = libQ.defer();

	var venueReq = curUri.split('/')[2];

	return libQ.all(self.getVenueShows(venueReq))
		.then(function(showIdOb){
			var promises = [];
			for (var i in showIdOb[0].showIdList) {
				promises.push(self.getShowInfo(showIdOb[0].showIdList[i]));
			}
			return libQ.all(promises)
				.then(function(items){
					var itemList = [];
					for (var i in items){
						itemList.push(items[i]);
					}
					itemList = itemList.sort(self.compareShowYears);
					var response = {
						"navigation": {
							"lists": [
								{
									'type':'title',
									'title':showIdOb[0].showIdList.length + ' ' + self.getPhishinI18nString('SHOWS_PLAYEDAT') + ': ' + showIdOb[0].venueName,
									"availableListViews":["list"],
									"items":itemList
								}
							],
							"prev":{
								"uri":self.getPrevUri()
							}
						}
					};
					return response;
				});
		});
}

ControllerPhishin.prototype.getVenueShows = function (venueId){
	var self = this;
	var defer = libQ.defer();

	var uri = phApiBaseUrl + 'venues/' + venueId + '.json';
	var showIdOb = new Object();

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error(self.getPhishinI18nString('QUERY_ERROR')));
			self.commandRouter.pushToastMessage('error', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('QUERY_ERROR'));
			self.historyPop();
		}
		else {
			self.commandRouter.pushToastMessage('info', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('RETREIVING') + ' ' + self.getPhishinI18nString('SHOWS_PLAYEDAT') + ' ' + res.body.data.name + '. ' + self.getPhishinI18nString('TAKE_AWHILE'));
			showIdOb.venueName = res.body.data.name + ', ' + res.body.data.location;
			showIdOb.showIdList = res.body.data.show_ids;
		}
		defer.resolve(showIdOb);
	});

	return defer.promise;
}


//list tracks when show picked
ControllerPhishin.prototype.listShowTracks = function(curUri) {
	var self = this;
	var defer = libQ.defer();

	var showUri = curUri.match(/[^?]*/);
	showUri = showUri[0];

	var uriSplitted = showUri.split('/');
	if (uriSplitted[1] == 'random') {
		var showId = '';
	}
	else {
		var showId = uriSplitted[2];
	}

	var phishinDefer = self.getShowTracks(showId);
	phishinDefer.then(function(results){
		var response = {
			"navigation": {
				"lists": [
					{
						"availableListViews":["list"],
						"items":[]
					}
				],
				"prev":{
					"uri":self.getPrevUri()
				}
			}
		};
		for (var i = 0; i < results.length; i++) {
			response.navigation.lists[0].items.push(results[i]);
		}

		defer.resolve(response);

	});

	return defer.promise;
}

//return list of tracks based on show id
ControllerPhishin.prototype.getShowTracks = function(id, sendList) {
	var self = this;
	var defer = libQ.defer();
	if (sendList === undefined) sendList = true;

	if (id === ""  || id === undefined) {
		var uri = phApiBaseUrl + 'random-show.json';
	}
	else {
		var uri = phApiBaseUrl + 'shows/' + id + '.json';
	}

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error(self.getPhishinI18nString('QUERY_ERROR')));
			self.commandRouter.pushToastMessage('error', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('QUERY_ERROR'));
			self.historyPop();
		}
		else {
			var response = [];
			var d = res.body.data.date.split('-');
			var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
			var showDate = months[d[1]-1] + ' ' + parseInt(d[2],10) + ', ' + d[0];
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
			defer.reject(new Error(self.getPhishinI18nString('QUERY_ERROR')));
			self.commandRouter.pushToastMessage('error', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('QUERY_ERROR'));
		}
		else {
			//create new promise, resolve then send to new function to add show title
			var d = res.body.data.show_date.split('-');
			var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
			var showDate = months[d[1]-1] + ' ' + parseInt(d[2],10) + ', ' + d[0];
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
					var d = titleRes.body.data.date.split('-');
					var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
					var showDate = months[d[1]-1] + ' ' + parseInt(d[2],10) + ', ' + d[0];
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

	var phListenerCallback = () => {
		self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin: MPD player state update');
		self.mpdPlugin.getState()
			.then(function(state) {
				console.log(state);
				if (state.uri && state.uri.includes("phish.in")) {
					self.mpdPlugin.clientMpd.once('system-player', phListenerCallback);
					//state.trackType = "Phishin track";
					return self.pushState(state);
				} else {
					self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin: Not a Phish.in track, removing listener');
				}
			});
	};
/*
	var phListenerCallback = () => {
		self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin: MPD player state update');
		self.mpdPlugin.getState()
			.then(function(state) {
				state.trackType = "Phishin track";
				return self.pushState(state);
			});
	};
*/
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
			//self.mpdPlugin.clientMpd.removeListener('system-player', phListenerCallback);
			self.mpdPlugin.clientMpd.removeAllListeners('system-player');
			self.mpdPlugin.clientMpd.once('system-player', phListenerCallback);
			//self.mpdPlugin.clientMpd.on('system', phListenerCallback);

			return self.mpdPlugin.sendMpdCommand('play', [])
				.then(function () {
					return self.mpdPlugin.getState()
						.then(function (state) {
							//state.trackType = "Phishin track";
							//self.commandRouter.pushConsoleMessage("ControllerPhishin: " + JSON.stringify(state));
							return self.pushState(state);
						});
				});
		});
}

ControllerPhishin.prototype.clearAddPlayTracks = function(arrayTrackIds) {
	console.log(arrayTrackIds);
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
	return self.mpdPlugin.stop()
		.then(function () {
			return self.mpdPlugin.getState()
				.then(function (state) {
					//state.trackType = "Phishin track";
					return self.pushState(state);
				});
		});
}

// Pause
ControllerPhishin.prototype.pause = function() {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::pause');

	return self.mpdPlugin.pause()
		.then(function () {
			return self.mpdPlugin.getState()
				.then(function (state) {
					//state.trackType = "Phishin track";
					return self.pushState(state);
				});
		});
}

// Resume
ControllerPhishin.prototype.resume = function() {
	var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::resume');
	return self.mpdPlugin.resume()
		.then(function () {
			return self.mpdPlugin.getState()
				.then(function (state) {
					//state.trackType = "Phishin track";
					return self.pushState(state);
				});
		});
}

// Next
ControllerPhishin.prototype.next = function() {
	var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::next');
	return self.mpdPlugin.sendMpdCommand('next', [])
		.then(function () {
    	return self.mpdPlugin.getState()
				.then(function (state) {
					return self.pushState(state);
    		});
  	});
}

// Previous
ControllerPhishin.prototype.previous = function() {
	var self = this;
  self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::previous');
	return self.mpdPlugin.sendMpdCommand('previous', [])
		.then(function () {
    	return self.mpdPlugin.getState()
				.then(function (state) {
					return self.pushState(state);
				});
  	});
}

// prefetch for gapless Playback
ControllerPhishin.prototype.prefetch = function(nextTrack) {
	var self = this;
	self.commandRouter.pushConsoleMessage('[' + Date.now() + '] ' + 'ControllerPhishin::prefetch');

	console.log("[DEBUG_PHISHIN]ControllerPhishin: prefetch nextTrack = " + JSON.stringify(nextTrack));
	var safeUri = nextTrack.uri.replace(/"/g,'\\"');
	return self.mpdPlugin.sendMpdCommand('add "' + safeUri + '"', [])
		.then(function() {
			return self.mpdPlugin.sendMpdCommand('consume 1',[]);
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

	return self.commandRouter.servicePushState(state, self.serviceName);
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
//TODO: How to make this gracefully fail -- when Phish.in server was down,
//search would fail and no results from other plugins would show
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

	self.resetHistory();

	//self.logger.info("query.value: " + query.value);
	//self.logger.info("searchCrit: " + searchCrit);
	var searchUri = phApiBaseUrl + 'search/' + encodeURIComponent(searchCrit) + '.json';

	unirest.get(searchUri).end( function(res){
		if (res.error){
			defer.reject(new Error(self.getPhishinI18nString('QUERY_ERROR')));
			self.commandRouter.pushToastMessage('error', self.getPhishinI18nString('PHISHIN_QUERY'), self.getPhishinI18nString('QUERY_ERROR'));
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
					var d = res.body.data.show.date.split('-');
					var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
					var showDate = months[d[1]-1] + ' ' + parseInt(d[2],10) + ', ' + d[0];
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
		var d = res.body.data.other_shows[i].date.split('-');
		var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
		var showDate = months[d[1]-1] + ' ' + parseInt(d[2],10) + ', ' + d[0];
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
			"uri": "phishin/songs/" + songId
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

ControllerPhishin.prototype.compareShowYears = function (a, b) {
	const dateA = a.sortdate;
	const dateB = b.sortdate;

	let comparison = 0;
	if (dateA > dateB) {
		comparison = 1;
	}
	else if (dateA < dateB) {
		comparison = -1;
	}
	return comparison;
}
