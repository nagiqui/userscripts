// ==UserScript==
// @name         Blocca AnimeClick video-intro
// @namespace    Skip-Animeclick-Video-Intro
// @version      1.02
// @description  Salta automaticamente la pagina "video-intro" di AnimeClick.it portando direttamente alla homepage.
// @match        https://www.animeclick.it/*
// @run-at       document-start
// @grant        none
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/nagiqui/userscripts/main/animeclick-skip-video-intro/Blocca-AnimeClick-video-intro.user.js
// ==/UserScript==

(function() {
    'use strict';
    if (/video[-_]intro/i.test(location.href)) {
        location.replace('https://www.animeclick.it/');
    }
})();




