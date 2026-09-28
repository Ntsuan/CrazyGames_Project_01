// CrazyGames SDK v3 adapter. The Data module is the only progress authority on CrazyGames.
(function(){
  "use strict";
  const DATA_KEY="neonHunter.progress.v1", IMPORT_KEY="neonHunter.cloudImported.v1";
  const KEYS=["neonHunter","neonHunter.build","neonHunterModes"];
  const LIMIT=900000; // Leave headroom below the Data module's 1 MiB per-item limit.
  const host=location.hostname.toLowerCase();
  const onPlatform=host==="crazygames.com"||host.endsWith(".crazygames.com");
  const localPreview=host==="localhost"||host==="127.0.0.1";
  let sdk=null, storage=localStorage, envelope=null, gameplay=false, ready=false, switching=false;
  let dataOpened=false;
  const empty=()=>({schema:1,revision:0,slots:{"neonHunter":null,"neonHunter.build":null,"neonHunterModes":null}});
  function parse(raw){
    if(raw==null)return null;
    const value=JSON.parse(raw);
    if(!value||value.schema!==1||!Number.isSafeInteger(value.revision)||value.revision<0||
      !value.slots||typeof value.slots!=="object"||KEYS.some(k=>value.slots[k]!==null&&typeof value.slots[k]!=="string"))
      throw Error("Invalid cloud save envelope");
    return value;
  }
  function encode(value){
    const raw=JSON.stringify(value);
    if(new TextEncoder().encode(raw).length>LIMIT)throw Error("Cloud save is too large");
    return raw;
  }
  function loadScript(){return new Promise((resolve,reject)=>{
    if(window.CrazyGames?.SDK){resolve();return;}
    const script=document.createElement("script");script.src="https://sdk.crazygames.com/crazygames-sdk-v3.js";
    script.onload=resolve;script.onerror=()=>reject(Error("CrazyGames SDK script failed"));document.head.appendChild(script);
  });}
  const dataStore={
    getItem(key){return KEYS.includes(key)?envelope.slots[key]:localStorage.getItem(key);},
    setItem(key,value){
      if(!KEYS.includes(key)){localStorage.setItem(key,value);return;}
      if(!ready||switching)throw Error("Cloud save is not ready");
      const latest=parse(sdk.data.getItem(DATA_KEY));
      if(latest&&latest.revision!==envelope.revision)throw Error("Cloud save changed in another session");
      const next={schema:1,revision:envelope.revision+1,slots:{...envelope.slots,[key]:String(value)}};
      sdk.data.setItem(DATA_KEY,encode(next));envelope=next;
    }
  };
  async function init(validate){
    if(!onPlatform&&!localPreview){ready=true;return {storage,cloud:false};}
    try{
      await loadScript();sdk=window.CrazyGames?.SDK;
      if(!sdk)throw Error("CrazyGames SDK unavailable");
      await sdk.init();
      if(sdk.environment==="disabled"||!sdk.data?.getItem||!sdk.data?.setItem)throw Error("CrazyGames Data unavailable");
      dataOpened=true;
      let current=parse(sdk.data.getItem(DATA_KEY));
      if(current){for(const key of KEYS)if(current.slots[key]!=null)validate(key,current.slots[key]);}
      else{
        current=empty();
        if(!localStorage.getItem(IMPORT_KEY)){
          for(const key of KEYS){const raw=localStorage.getItem(key);if(raw!=null){validate(key,raw);current.slots[key]=raw;}}
          if(KEYS.some(key=>current.slots[key]!=null)){
            current.revision=1;sdk.data.setItem(DATA_KEY,encode(current));
          }
          // Mark even empty imports so a later account switch cannot import stale local progress.
          try{localStorage.setItem(IMPORT_KEY,"1");}catch(e){}
        }
      }
      envelope=current;storage=dataStore;ready=true;
      // Data changes authority during sign-in; the SDK reloads to read the new account.
      try{sdk.user?.addAuthListener?.(()=>{switching=true;});}catch(error){console.warn("CrazyGames auth listener unavailable",error);}
      return {storage,cloud:true};
    }catch(error){
      // Local preview can still be used offline. The published platform must fail closed.
      if(localPreview&&!onPlatform&&!dataOpened){sdk=null;storage=localStorage;ready=true;return {storage,cloud:false,previewFallback:true};}
      throw error;
    }
  }
  function syncGameplay(active){
    if(!ready||!sdk||active===gameplay)return;
    try{if(active)sdk.game.gameplayStart();else sdk.game.gameplayStop();gameplay=active;}
    catch(error){console.error("CrazyGames gameplay event failed",error);}
  }
  function backup(){
    let cloud=null,cloudError=null;
    try{cloud=sdk?.data?.getItem?.(DATA_KEY)??null;}catch(error){cloudError=String(error);}
    return JSON.stringify({cloud,cloudError,local:Object.fromEntries(KEYS.map(k=>[k,localStorage.getItem(k)]))},null,2);
  }
  window.NeonPlatform={init,syncGameplay,backup,get cloud(){return ready&&storage===dataStore;},get onPlatform(){return onPlatform;}};
})();
