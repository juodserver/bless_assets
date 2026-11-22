// Small ES5 bootstrap: it must still report a failed/unsupported scene bundle.
(function () {
  'use strict';
  var session = '', handler = null, initial = null, failure = null, disposed = false, lastProgress = null;
  var bridgeReady = !!window.UniAppJSBridge, queue = [];
  function flush() {
    if (!bridgeReady || !window.uni || !window.uni.webView || !window.uni.webView.postMessage) return;
    while (queue.length) window.uni.webView.postMessage({ data: queue.shift() });
  }
  function post(type, payload) {
    if (!session || disposed) return;
    queue.push({ version: 1, session: session, type: type, payload: payload || {} });
    flush();
  }
  function fail(code, detail) {
    if (disposed || failure) return;
    failure = { code: code, detail: String(detail || '').slice(0, 500) };
    post('failed', failure);
  }
  function receive(message) {
    if (disposed || !message || message.version !== 1 || typeof message.session !== 'string' || !/^[\w-]{16,100}$/.test(message.session)) return;
    if (message.type === 'init') {
      if (session && session !== message.session) return;
      session = message.session; initial = message;
      if (failure) post('failed', failure);
      else { if (lastProgress) post('progress', lastProgress); if (handler) handler(message); }
      return;
    }
    if (message.session !== session) return;
    if (handler) handler(message);
    if (message.type === 'dispose') { disposed = true; queue.length = 0; }
  }
  document.addEventListener('UniAppJSBridgeReady', function () { bridgeReady = true; flush(); });
  window.addEventListener('error', function (event) {
    if (event.target && event.target.tagName === 'SCRIPT') { if(event.target.getAttribute('data-temple-managed')==='1')return;fail('script-load', event.target.src); }
    else if (event.message) fail('script-error', event.message);
  }, true);
  window.addEventListener('unhandledrejection', function (event) { fail('script-error', event.reason && event.reason.message || 'Scene promise rejected'); });
  window.TempleScene = { receive: receive };
  window.TempleBoot = {
    post: post,
    fail: fail,
    progress: function (percent, step) {
      if (disposed || failure || typeof percent !== 'number' || !isFinite(percent)) return;
      lastProgress = {percent:Math.max(lastProgress ? lastProgress.percent : 0,Math.min(100,Math.max(0,Math.floor(percent)))),step:step};
      // Only the latest progress is useful if the native bridge is delayed.
      for(var i=queue.length-1;i>=0;i--)if(queue[i].type==='progress')queue.splice(i,1);
      post('progress',lastProgress);
    },
    attach: function (receiver) {
      handler = receiver;
      if (disposed && initial) { handler({version:1,session:session,type:'dispose',payload:{}}); return; }
      if (initial && !failure) handler(initial);
    }
  };
}());
