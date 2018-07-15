# Phish.in Plugin for Volumio

Plugin to play over 1,500 live Phish audience recordings from [Phish.in](http://phish.in).  Plugin uses the [Phish.in API v1](http://phish.in/api-docs).

Phish.in and the Volumio Phish.in music service plugin complies with Phish's official taping policy as described at [http://phish.com/#/faq/taping-guidelines](http://phish.com/#/faq/taping-guidelines).



---

KNOWN BUGS:
- Seek may cause timer overruns that will cause UI to advance 1 track too far (fixed submitted in [PR #1583](https://github.com/volumio/Volumio2/pull/1583))
- 2 consecutive tracks from Phish.in and another service may stop the player  (fixed submitted in [PR #1583](https://github.com/volumio/Volumio2/pull/1583))
- gracefully fail search (currently when search fails due to no response from Phish.in, results from other music services might not return)
 
TODO (in no particular order):
- add higher res art?
- add links to phish.net if possible
