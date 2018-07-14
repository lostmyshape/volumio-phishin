# Phish.in Plugin for Volumio

Plugin to play over 1,500 live Phish audience recordings from [Phish.in](http://phish.in).  Plugin uses the [Phish.in API v1](http://phish.in/api-docs).

---

KNOWN BUGS:
- Seek may cause timer overruns that will cause UI to advance 1 track too far (fixed submitted in [PR #1583](https://github.com/volumio/Volumio2/pull/1583))
- 2 consecutive tracks from Phish.in and another service may stop the player  (fixed submitted in [PR #1583](https://github.com/volumio/Volumio2/pull/1583))
- gracefully fail search (currently when search fails due to no response from Phish.in, no results return from any music service)
 
TODO (in no particular order):
- add official art
- add links to phish.net if possible
