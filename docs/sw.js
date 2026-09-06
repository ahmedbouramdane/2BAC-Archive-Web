/* 2BAC Archive — Service Worker
 * Caches the app shell so the app still opens offline (instead of the
 * browser's "Webpage not available" screen) and shows a friendly message.
 */
'use strict';

var CACHE_NAME = '2bac-archive-v2';
var APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/templates.js',
  './js/app.js',
  './static/index-data.js',
  './vendor/pdfjs/pdf.min.js',
  './vendor/pdfjs/pdf.worker.min.js',
  './manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);

  // Only handle same-origin GET requests.
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // Never cache references to remote resources (e.g. some others).
  if (request.url.indexOf('__offline__') !== -1) return;

  event.respondWith(
    fetch(request).then(function (response) {
      // Cache successful responses on the fly (static files, etc).
      if (response && response.status === 200 && response.type === 'basic') {
        var cacheResponse = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, cacheResponse);
        });
      }
      return response;
    }).catch(function () {
      // Offline: fall back to the cached copy, then the app shell.
      return caches.match(request).then(function (cached) {
        if (cached) return cached;
        // For navigation requests, serve the cached index (app shell).
        if (request.mode === 'navigate') {
          return caches.match('./index.html').then(function (shell) {
            if (shell) return shell;
            // Last resort: a minimal offline message.
            return new Response(
              '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">' +
              '<meta name="viewport" content="width=device-width, initial-scale=1">' +
              '<title>Hors ligne</title></head><body>' +
              '<div style="font-family:sans-serif;text-align:center;padding:60px 20px">' +
              '<h1>Hors ligne</h1><p>Vous êtes hors ligne. ' +
              'Reconnectez-vous à internet pour consulter l\'archive.</p>' +
              '</div></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
        }
        return Response.error();
      });
    })
  );
});
