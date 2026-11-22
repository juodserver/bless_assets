// Local bootstrap. Both mirrors must contain the exact SRI-pinned release.
(function () {
 'use strict';
 var config=window.TempleResourceConfig||{},manifest=config.integrity||{},inflight={},serial=0,cdnHealthy=true;
 function managed(script){return script&&script.getAttribute&&script.getAttribute('data-temple-managed')==='1';}
 function attempt(path,remote,record){
  return new Promise(function(resolve,reject){
   var script=document.createElement('script'),finished=false,id=String(++serial),timer;
   record.id=id;script.setAttribute('data-temple-managed','1');script.setAttribute('data-temple-attempt',id);script.setAttribute('data-temple-path',path);
   script.crossOrigin='anonymous';script.integrity=manifest[path];script.async=true;
   script.src=remote?config.cdnBase+path:path;
   function finish(error){if(finished)return;finished=true;clearTimeout(timer);script.onload=script.onerror=null;script.remove();if(error){record.id='';reject(error);}else resolve();}
   script.onload=function(){finish();};
   script.onerror=function(){finish(new Error('Resource unavailable: '+path));};
   timer=setTimeout(function(){finish(new Error('Resource timeout: '+path));},remote?6000:90000);
   document.head.appendChild(script);
  });
 }
 function loadScript(path){
  if(!/^(?:portable\/)?[A-Za-z0-9_.-]+\.js$/.test(path)||!manifest[path])return Promise.reject(new Error('Resource is not in this release: '+path));
  if(inflight[path])return inflight[path].promise;
  var record={id:'',promise:null};inflight[path]=record;
  var remote=cdnHealthy&&/^https:\/\/cdn\.jsdelivr\.net\/gh\/juodserver\/bless_assets@[A-Za-z0-9._-]+\/$/.test(config.cdnBase||'');
  record.promise=(remote?attempt(path,true,record).catch(function(){cdnHealthy=false;return attempt(path,false,record);}):attempt(path,false,record)).then(function(){delete inflight[path];},function(error){delete inflight[path];throw error;});
  return record.promise;
 }
 window.TempleResources={loadScript:loadScript,isManaged:managed,isCurrent:function(script){if(!managed(script))return true;var record=inflight[script.getAttribute('data-temple-path')];return !!record&&record.id===script.getAttribute('data-temple-attempt');}};
 // Scene bundles have an execution guard, so a late CDN response cannot start a second renderer.
 void loadScript('scene.bundle.js').catch(function(error){if(window.TempleBoot)window.TempleBoot.fail('script-load',error.message);});
}());
