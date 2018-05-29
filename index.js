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
										"title": "Years",
										"artist": "",
										"album": "",
										"icon": "fa fa-calendar-check-o",
										"uri": "phishin/years"
									},
									{
										"service": "phishin",
										"type": "item-no-menu",
										"title": "Tours",
										"artist": "",
										"album": "",
										"icon": "fa fa-globe",
										"uri": "phishin/tours"
									}
								]
							}
						]
					}
				});
			}

			else if (curUri.startsWith('phishin/years')){
				//list years
				if (curUri == 'phishin/years') {
					response = self.listYears(curUri);
				}
				else {
					//list shows from year picked
				}
			}

			else if (curUri.startsWith('phishin/tours')) {
				//list tours
			}
		}
    return response;
};

ControllerPhishin.prototype.listYears = function () {
	var self = this;

	var defer = libQ.defer();

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

	var uri = phApiBaseUrl + 'years.json?include_show_counts=true';
	self.logger.info("phURI: "+uri);

	unirest.get(uri).end( function(res){
		if (res.error){
			defer.reject(new Error('An error occurred while querying Phish.in.'));
		}
		else {
			for (var i = 0; i < res.body.data.length; i++){
				var name = res.body.data[i].date + ': ' + res.body.data[i].show_count + ' shows';
				var yearUri = 'phishin/years/'+ res.body.data[i].date;
				self.logger.info('name: '+name+', yearUri: '+yearUri);
				var yearFolder = {
					"service": "phishin",
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
