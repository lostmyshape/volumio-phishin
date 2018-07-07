# Phish.in Plugin for Volumio

Plugin to play over 1,500 live Phish audience recordings from [Phish.in](http://phish.in).  Plugin uses the [Phish.in API v1](http://phish.in/api-docs).

---

Plugin not yet complete.

TODO (in no particular order):
- ~~fix mpd playback:~~ (used technique in YouTube plugin to add listener and manage all controls)
  * ~~previous~~
  * ~~random~~
  * ~~repeat~~
  * ~~timer when mute~~
- ~~impliment prevUri like TuneIn Radio~~
- ~~fix prefetch (plays correct track but displays 1 track ahead)~~ (need patch in statemachine increasePlaybackTimer method to fix bugs)
- add art (and figure out how to get it to display)
- add links to phish.net
- gracefully fail search (currently when search fails due to no response from Phish.in, no results return from any music service)
