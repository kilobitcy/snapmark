var rt=Object.defineProperty;var at=(t,e,n)=>e in t?rt(t,e,{enumerable:!0,configurable:!0,writable:!0,value:n}):t[e]=n;var s=(t,e,n)=>at(t,typeof e!="symbol"?e+"":e,n);import{A as F}from"./messaging-BsnyCUR5.js";const lt=`
:host {
  all: initial;
  font-family: system-ui, -apple-system, sans-serif;
  --ag-bg: #ffffff;
  --ag-text: #1a1a1a;
  --ag-accent: #3b82f6;
  --ag-border: #e5e5e5;
  --ag-radius: 8px;
  --ag-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@media (prefers-color-scheme: dark) {
  :host {
    --ag-bg: #1e1e1e;
    --ag-text: #e5e5e5;
    --ag-accent: #60a5fa;
    --ag-border: #404040;
  }
}

:host(.dark) {
  --ag-bg: #1e1e1e;
  --ag-text: #e5e5e5;
  --ag-accent: #60a5fa;
  --ag-border: #404040;
}

#agentation-toolbar,
#agentation-highlights,
#agentation-markers,
#agentation-popups {
  position: fixed;
  z-index: 2147483647;
  pointer-events: none;
}

#agentation-toolbar,
#agentation-popups {
  pointer-events: auto;
}
`;let v=null;function ct(){if(v)return v;const t=document.querySelector("agentation-root");t&&t.remove();const e=document.createElement("agentation-root");e.setAttribute("data-agentation",""),v=e.attachShadow({mode:"closed"});const n=document.createElement("style");n.textContent=lt,v.appendChild(n);for(const o of["agentation-toolbar","agentation-highlights","agentation-markers","agentation-popups"]){const i=document.createElement("div");i.id=o,v.appendChild(i)}return document.body.appendChild(e),v}const dt=[{action:"markersToggle",label:"⦿",title:"Toggle markers"},{action:"freeze",label:"⏸",title:"Freeze/unfreeze"},{action:"areaMode",label:"▢",title:"Area select mode"},{action:"settings",label:"⚙",title:"Settings"},{action:"copy",label:"📋",title:"Copy annotations"},{action:"send",label:"➤",title:"Send"},{action:"clear",label:"🗑",title:"Clear annotations"}],j={connected:"#22c55e",connecting:"#f59e0b",disconnected:"#ef4444"};class ut{constructor(e){s(this,"isActive",!1);s(this,"container");s(this,"listeners",new Map);s(this,"annotationCount",0);s(this,"connectionStatus","disconnected");s(this,"dragging",!1);s(this,"dragOffsetX",0);s(this,"dragOffsetY",0);s(this,"posX",-1);s(this,"posY",-1);s(this,"_onMouseMove");s(this,"_onMouseUp");this.container=e,this._onMouseMove=n=>{if(!this.dragging)return;const o=20,i=this.container.firstElementChild;if(!i)return;const r=i.offsetWidth||0,l=i.offsetHeight||0;this.posX=Math.min(Math.max(o,n.clientX-this.dragOffsetX),window.innerWidth-r-o),this.posY=Math.min(Math.max(o,n.clientY-this.dragOffsetY),window.innerHeight-l-o),i.style.left=`${this.posX}px`,i.style.top=`${this.posY}px`,i.style.right="auto",i.style.bottom="auto"},this._onMouseUp=()=>{this.dragging=!1},document.addEventListener("mousemove",this._onMouseMove),document.addEventListener("mouseup",this._onMouseUp),this.render()}activate(){this.isActive=!0,this.render()}deactivate(){this.isActive=!1,this.render()}toggle(){this.isActive?this.deactivate():this.activate()}setAnnotationCount(e){this.annotationCount=e;const n=this.container.querySelector(".ag-count");n&&(n.textContent=String(e))}setConnectionStatus(e){this.connectionStatus=e;const n=this.container.querySelector(".ag-status");n&&(n.style.backgroundColor=j[e],n.title=e)}destroy(){document.removeEventListener("mousemove",this._onMouseMove),document.removeEventListener("mouseup",this._onMouseUp),this.container.innerHTML="",this.listeners.clear()}on(e,n){this.listeners.has(e)||this.listeners.set(e,new Set),this.listeners.get(e).add(n)}off(e,n){var o;(o=this.listeners.get(e))==null||o.delete(n)}emit(e){var n;(n=this.listeners.get(e))==null||n.forEach(o=>o())}render(){this.container.innerHTML="",this.isActive?this.container.appendChild(this.buildPanel()):this.container.appendChild(this.buildBadge())}applyBasePosition(e,n,o){e.style.cssText=`
      position: fixed;
      z-index: 2147483647;
      box-sizing: border-box;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: grab;
      user-select: none;
    `,this.posX>=0&&this.posY>=0?(e.style.left=`${this.posX}px`,e.style.top=`${this.posY}px`):(e.style.right="20px",e.style.bottom="20px"),e.style.width=n,e.style.height=o}attachDragHandler(e){e.addEventListener("mousedown",n=>{if(n.target.classList.contains("ag-btn"))return;this.dragging=!0;const o=e.getBoundingClientRect();this.dragOffsetX=n.clientX-o.left,this.dragOffsetY=n.clientY-o.top,n.preventDefault()})}buildBadge(){const e=document.createElement("div");return e.className="ag-badge",this.applyBasePosition(e,"44px","44px"),e.style.borderRadius="50%",e.style.backgroundColor="#3b82f6",e.style.color="#ffffff",e.style.display="flex",e.style.alignItems="center",e.style.justifyContent="center",e.style.fontSize="18px",e.style.fontWeight="bold",e.style.boxShadow="0 2px 8px rgba(0,0,0,0.25)",e.style.cursor="pointer",e.textContent="A",e.title="Agentation",e.addEventListener("click",()=>{this.emit("toggle")}),this.attachDragHandler(e),e}buildPanel(){const e=document.createElement("div");e.className="ag-panel",this.applyBasePosition(e,"auto","auto"),e.style.borderRadius="10px",e.style.backgroundColor="#ffffff",e.style.border="1px solid #e5e5e5",e.style.boxShadow="0 2px 12px rgba(0,0,0,0.18)",e.style.display="flex",e.style.flexDirection="column",e.style.minWidth="280px",e.style.overflow="hidden";const n=document.createElement("div");n.style.cssText=`
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #3b82f6;
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      cursor: grab;
    `;const o=document.createElement("span");o.className="ag-status",o.style.cssText=`
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: ${j[this.connectionStatus]};
      flex-shrink: 0;
    `,o.title=this.connectionStatus;const i=document.createElement("span");i.textContent="Agentation",i.style.flexGrow="1";const r=document.createElement("span");r.className="ag-count",r.textContent=String(this.annotationCount),r.style.cssText=`
      background: rgba(255,255,255,0.25);
      border-radius: 10px;
      padding: 1px 7px;
      font-size: 11px;
      min-width: 20px;
      text-align: center;
    `;const l=document.createElement("button");l.textContent="✕",l.style.cssText=`
      background: none;
      border: none;
      color: #ffffff;
      cursor: pointer;
      font-size: 13px;
      padding: 0 0 0 4px;
      line-height: 1;
    `,l.addEventListener("click",()=>{this.emit("toggle")}),n.appendChild(o),n.appendChild(i),n.appendChild(r),n.appendChild(l);const u=document.createElement("div");u.style.cssText=`
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 10px;
    `;for(const p of dt){const d=document.createElement("button");d.className="ag-btn",d.dataset.action=p.action,d.textContent=p.label,d.title=p.title,d.style.cssText=`
        width: 36px;
        height: 36px;
        border: 1px solid #e5e5e5;
        border-radius: 6px;
        background: #f9fafb;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
        flex-shrink: 0;
      `,d.addEventListener("mouseenter",()=>{d.style.background="#e0e7ff"}),d.addEventListener("mouseleave",()=>{d.style.background="#f9fafb"}),d.addEventListener("click",m=>{m.stopPropagation(),this.emit(p.action)}),u.appendChild(d)}return e.appendChild(n),e.appendChild(u),this.attachDragHandler(e),e}}class pt{constructor(e,n){s(this,"highlightContainer");s(this,"markerContainer");s(this,"hoverEl",null);s(this,"tooltipEl",null);s(this,"markers",new Map);s(this,"markersVisible",!0);this.highlightContainer=e,this.markerContainer=n}showHoverHighlight(e,n){this.clearHoverHighlight();const o=e.getBoundingClientRect();this.hoverEl=document.createElement("div"),this.hoverEl.className="ag-hover-highlight",Object.assign(this.hoverEl.style,{position:"fixed",top:`${o.top}px`,left:`${o.left}px`,width:`${o.width}px`,height:`${o.height}px`,border:"2px solid var(--ag-accent, #3b82f6)",backgroundColor:"rgba(59, 130, 246, 0.1)",pointerEvents:"none",zIndex:"2147483646",borderRadius:"2px",boxSizing:"border-box"}),this.highlightContainer.appendChild(this.hoverEl),n&&(this.tooltipEl=document.createElement("div"),this.tooltipEl.className="ag-hover-tooltip",this.tooltipEl.textContent=n,Object.assign(this.tooltipEl.style,{position:"fixed",top:`${o.top-24}px`,left:`${o.left}px`,backgroundColor:"var(--ag-accent, #3b82f6)",color:"#fff",padding:"2px 6px",borderRadius:"3px",fontSize:"11px",fontFamily:"monospace",pointerEvents:"none",zIndex:"2147483646",whiteSpace:"nowrap"}),this.highlightContainer.appendChild(this.tooltipEl))}clearHoverHighlight(){var e,n;(e=this.hoverEl)==null||e.remove(),this.hoverEl=null,(n=this.tooltipEl)==null||n.remove(),this.tooltipEl=null}addMarker(e,n,o){const i=document.createElement("div");i.className="ag-marker",i.dataset.markerId=e,i.textContent=String(o),Object.assign(i.style,{position:"fixed",left:`${n.x}px`,top:`${n.y}px`,width:"20px",height:"20px",borderRadius:"50%",backgroundColor:"var(--ag-accent, #3b82f6)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"bold",pointerEvents:"auto",cursor:"pointer",zIndex:"2147483646",transform:"translate(-50%, -50%)"}),this.markers.set(e,i),this.markerContainer.appendChild(i)}removeMarker(e){const n=this.markers.get(e);n&&(n.remove(),this.markers.delete(e))}clearAllMarkers(){for(const e of this.markers.values())e.remove();this.markers.clear()}toggleMarkers(){this.markersVisible=!this.markersVisible,this.markerContainer.style.display=this.markersVisible?"":"none"}destroy(){this.clearHoverHighlight(),this.clearAllMarkers()}}class ht{constructor(e){s(this,"container");s(this,"listeners",new Map);s(this,"popupEl",null);this.container=e}show(e,n){this.hide(),this.popupEl=document.createElement("div"),this.popupEl.className="ag-popup",Object.assign(this.popupEl.style,{position:"fixed",left:`${e.x}px`,top:`${e.y+10}px`,zIndex:"2147483647",background:"#ffffff",borderRadius:"8px",boxShadow:"0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.10)",padding:"14px 16px 12px",minWidth:"280px",maxWidth:"360px",fontFamily:"system-ui, -apple-system, sans-serif",fontSize:"13px",color:"#1a1a1a",border:"1px solid #e5e7eb",pointerEvents:"auto"});for(const o of["click","mousedown","mouseup","pointerdown","pointerup","keydown","keyup"])this.popupEl.addEventListener(o,i=>i.stopPropagation());this.popupEl.innerHTML=`
      <div class="ag-popup-header" style="margin-bottom:8px;font-weight:600;font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        <span class="ag-popup-element" title="${n}">${n}</span>
      </div>
      <textarea class="ag-popup-comment" placeholder="Add your comment..." rows="3" style="width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px;padding:7px 9px;font-size:13px;font-family:inherit;resize:vertical;outline:none;color:#1a1a1a;background:#f9fafb;"></textarea>
      <div class="ag-popup-fields" style="display:flex;gap:8px;margin-top:8px;">
        <select data-field="intent" style="flex:1;border:1px solid #d1d5db;border-radius:6px;padding:5px 8px;font-size:12px;font-family:inherit;background:#f9fafb;color:#1a1a1a;outline:none;cursor:pointer;">
          <option value="fix">Fix</option>
          <option value="change">Change</option>
          <option value="question">Question</option>
          <option value="approve">Approve</option>
        </select>
        <select data-field="severity" style="flex:1;border:1px solid #d1d5db;border-radius:6px;padding:5px 8px;font-size:12px;font-family:inherit;background:#f9fafb;color:#1a1a1a;outline:none;cursor:pointer;">
          <option value="suggestion">Suggestion</option>
          <option value="important">Important</option>
          <option value="blocking">Blocking</option>
        </select>
      </div>
      <div class="ag-popup-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
        <button class="ag-popup-cancel" style="padding:5px 14px;border:1px solid #d1d5db;border-radius:6px;background:#ffffff;color:#374151;font-size:13px;font-family:inherit;cursor:pointer;">Cancel</button>
        <button class="ag-popup-submit" style="padding:5px 14px;border:none;border-radius:6px;background:#2563eb;color:#ffffff;font-size:13px;font-family:inherit;cursor:pointer;font-weight:500;">Submit</button>
      </div>
    `,this.popupEl.querySelector(".ag-popup-submit").addEventListener("click",()=>{const o=this.popupEl.querySelector("textarea").value.trim();if(!o)return;const i=this.popupEl.querySelector('[data-field="intent"]').value,r=this.popupEl.querySelector('[data-field="severity"]').value;this.emit("submit",{comment:o,intent:i,severity:r}),this.hide()}),this.popupEl.querySelector(".ag-popup-cancel").addEventListener("click",()=>{this.emit("cancel"),this.hide()}),this.container.appendChild(this.popupEl),this.popupEl.querySelector("textarea").focus()}hide(){var e;(e=this.popupEl)==null||e.remove(),this.popupEl=null}on(e,n){this.listeners.has(e)||this.listeners.set(e,new Set),this.listeners.get(e).add(n)}off(e,n){var o;(o=this.listeners.get(e))==null||o.delete(n)}emit(e,...n){var o;(o=this.listeners.get(e))==null||o.forEach(i=>i(...n))}destroy(){this.hide(),this.listeners.clear()}}class ft{constructor(e){s(this,"annotations",[]);s(this,"storageKey");s(this,"RETENTION_DAYS",7);this.storageKey=`agentation-annotations-${e}`,this.load()}getAll(){return[...this.annotations]}add(e){const n={...e,id:crypto.randomUUID(),timestamp:Date.now()};return this.annotations.push(n),this.save(),n}update(e,n){const o=this.annotations.findIndex(i=>i.id===e);o!==-1&&(this.annotations[o]={...this.annotations[o],...n},this.save())}delete(e){this.annotations=this.annotations.filter(n=>n.id!==e),this.save()}clearAll(){this.annotations=[],this.save()}save(){try{localStorage.setItem(this.storageKey,JSON.stringify(this.annotations))}catch{}}load(){try{const e=localStorage.getItem(this.storageKey);if(e){const n=JSON.parse(e),o=Date.now()-this.RETENTION_DAYS*24*60*60*1e3;this.annotations=n.filter(i=>i.timestamp>o)}}catch{}}}function L(t){return typeof CSS<"u"&&CSS.escape?CSS.escape(t):t.replace(/([^\w-])/g,"\\$1")}function W(t){return!!(/^[a-zA-Z][\w-]*_[a-zA-Z0-9]{5,}$/.test(t)||/^sc-[a-zA-Z0-9]+$/.test(t)||/^css-[a-zA-Z0-9]+$/.test(t))}function K(t){return Array.from(t.classList).filter(e=>!W(e))}function gt(t){if(t.id)return`${t.tagName.toLowerCase()}#${t.id}`;const e=K(t);return e.length>0?`${t.tagName.toLowerCase()}.${e.join(".")}`:t.tagName.toLowerCase()}function I(t,e=4){const n=[];let o=t;for(;o&&o!==document.body&&o!==document.documentElement&&n.length<e;){const i=o.getRootNode();if(i instanceof ShadowRoot){n.push("⟨shadow⟩"),o=i.host;continue}n.push(gt(o)),o=o.parentElement}return n.reverse().join(" > ")}function N(t){try{return document.querySelectorAll(t).length===1}catch{return!1}}function mt(t){if(t.id){const o=`#${L(t.id)}`;if(N(o))return o}const e=t.getAttribute("data-testid");if(e){const o=`[data-testid="${L(e)}"]`;if(N(o))return o}for(const o of Array.from(t.attributes))if(o.name.startsWith("data-")&&o.name!=="data-testid"){const i=`[${o.name}="${L(o.value)}"]`;if(N(i))return i}const n=K(t);if(n.length>0){const o=`${t.tagName.toLowerCase()}.${n.map(i=>L(i)).join(".")}`;if(N(o))return o}return xt(t)}function xt(t){const e=[];let n=t;for(;n&&n!==document.body&&n!==document.documentElement;){const o=n.parentElement;if(!o)break;const r=Array.from(o.children).indexOf(n)+1,l=n.tagName.toLowerCase();e.unshift(`${l}:nth-child(${r})`);const u=e.join(" > ");if(N(u))return u;n=o}return e.join(" > ")}function G(t,e){let n=document.elementFromPoint(t,e);if(!n)return null;for(;n.shadowRoot;){const o=n.shadowRoot.elementFromPoint(t,e);if(!o||o===n)break;n=o}return n}const yt=new Set(["a","button","input","select","textarea","details","summary"]),bt=new Set(["button","a","input"]),wt=25,vt=40,Et=["data-","aria-"],St=new Set(["id","role","href","name","type","placeholder"]),Tt=new Set(["class","style"]),Ct=["color","backgroundColor","fontSize","fontWeight","padding","margin","display","position","borderRadius"];function $t(t,e){return t.length<=e?t:t.slice(0,e)+"..."}function J(t){return Array.from(t.classList).filter(e=>!W(e))}function At(t){const e={};for(const n of Array.from(t.attributes))if(!Tt.has(n.name)){if(St.has(n.name)){e[n.name]=n.value;continue}Et.some(o=>n.name.startsWith(o))&&(e[n.name]=n.value)}return e}function kt(t){const e=(t.textContent??"").trim(),n=t.tagName.toLowerCase(),o=bt.has(n)?wt:vt;return $t(e,o)}function Mt(t){const e=t.parentElement;if(!e)return{nearbyText:[],nearbyElements:[]};const o=Array.from(e.children).filter(l=>l!==t).slice(0,4),i=[],r=[];for(const l of o){const u=(l.textContent??"").trim();u&&i.push(u),r.push({tag:l.tagName.toLowerCase(),text:u,classes:J(l)})}return{nearbyText:i,nearbyElements:r}}function Nt(t){const e=window.getComputedStyle(t),n={};for(const o of Ct)n[o]=e[o]??"";return n}function Ot(t){const e=t.tagName.toLowerCase(),n=t.tabIndex??-1,o=yt.has(e)||n>=0;return{role:t.getAttribute("role")??void 0,ariaLabel:t.getAttribute("aria-label")??void 0,focusable:o}}function Lt(t){const e=t.getBoundingClientRect(),{nearbyText:n,nearbyElements:o}=Mt(t);return{elementTag:t.tagName.toLowerCase(),cssClasses:J(t),attributes:At(t),textContent:kt(t),boundingBox:{x:e.x,y:e.y,width:e.width,height:e.height},viewport:{scrollX:window.scrollX,scrollY:window.scrollY,width:window.innerWidth,height:window.innerHeight},nearbyText:n,nearbyElements:o,computedStyles:Nt(t),accessibility:Ot(t),isFixed:window.getComputedStyle(t).position==="fixed",elementPath:I(t),selector:mt(t)}}function It(){const t=window.getSelection();if(!t||t.isCollapsed||!t.toString().trim())return null;const e=t.toString().trim();let o=t.getRangeAt(0).commonAncestorContainer;return o.nodeType===Node.TEXT_NODE&&(o=o.parentElement),o?{text:e,element:o}:null}function _t(t,e){return t.map((n,o)=>zt(n,o+1,e)).join(`

`)}function zt(t,e,n){switch(n){case"compact":return Rt(t,e);case"standard":return Bt(t,e);case"detailed":return V(t,e);case"forensic":return Xt(t,e)}}function Pt(t){const e=t.cssClasses.length>0?`.${t.cssClasses[0]}`:"";return`${t.elementTag}${e}`}function Rt(t,e){const n=[`#${e}`];return n.push(`[${Pt(t)}]`),n.push(`"${t.textContent}"`),t.source&&n.push(`(${t.source.file}:${t.source.line})`),t.selectedText&&n.push(`[selected: "${t.selectedText}"]`),n.push(`— "${t.comment}"`),n.join(" ")}function Bt(t,e){const n=[];if(n.push(`## Annotation #${e} — "${t.comment}"`),n.push(`**Element:** \`<${t.elementTag} class="${t.cssClasses.join(" ")}">\` "${t.textContent}"`),t.selectedText&&n.push(`**Selected text:** "${t.selectedText}"`),n.push(`**Path:** \`${t.elementPath}\``),t.framework){const o=t.framework.name.charAt(0).toUpperCase()+t.framework.name.slice(1);n.push(`**Component:** \`<${t.framework.componentName}>\` (${o})`)}return t.source&&n.push(`**Source:** \`${t.source.file}:${t.source.line}:${t.source.column}\``),n.push(`**Location:** x=${t.boundingBox.x}, y=${t.boundingBox.y}`),n.join(`
`)}function V(t,e){const n=[];if(n.push(`## Annotation #${e} — "${t.comment}"`),n.push(`**Element:** \`<${t.elementTag} class="${t.cssClasses.join(" ")}">\``),n.push(`**Selector:** \`${t.selector}\``),n.push(`**Text:** "${t.textContent}"`),t.selectedText&&n.push(`**Selected text:** "${t.selectedText}"`),n.push(""),t.framework){const o=t.framework.name.charAt(0).toUpperCase()+t.framework.name.slice(1);n.push(`**Framework:** ${o}`),n.push(`**Component:** \`${t.framework.componentName}\` (path: \`${t.framework.componentPath||t.framework.componentName}\`)`),t.framework.props&&n.push(`**Props:** \`${JSON.stringify(t.framework.props)}\``)}return t.source&&n.push(`**Source:** \`${t.source.file}:${t.source.line}:${t.source.column}\``),n.push(""),n.push(`**Nearby text:** ${JSON.stringify(t.nearbyText)}`),n.push(`**Styles:** \`${JSON.stringify(t.computedStyles)}\``),n.push(`**Bounding Box:** x=${t.boundingBox.x}, y=${t.boundingBox.y}, w=${t.boundingBox.width}, h=${t.boundingBox.height}`),n.join(`
`)}function Xt(t,e){const n=[V(t,e)];return t.url&&n.push(`**URL:** ${t.url}`),n.push(`**Viewport:** ${t.viewport.width}x${t.viewport.height}, scrollX=${t.viewport.scrollX}, scrollY=${t.viewport.scrollY}`),n.push(`**Timestamp:** ${new Date(t.timestamp).toISOString()}`),t.fullPath&&n.push(`**Full DOM Path:** \`${t.fullPath}\``),t.accessibility&&n.push(`**Accessibility:** role=${t.accessibility.role||"none"}, focusable=${t.accessibility.focusable}${t.accessibility.ariaLabel?`, aria-label="${t.accessibility.ariaLabel}"`:""}`),t.nearbyElements&&n.push(`**Nearby Elements:** ${JSON.stringify(t.nearbyElements)}`),n.join(`
`)}let O=!1,P,Z,R,Q,tt,et,B=[],nt=[],X=[],Y=[],H=[];function Yt(){return O}function Ht(){if(O)return;if(O=!0,document.querySelectorAll("*").forEach(n=>{const o=n;if(o.hasAttribute("data-agentation")||o.closest("[data-agentation]")||o.tagName==="AGENTATION-ROOT")return;const i=getComputedStyle(o);(i.animationName!=="none"||i.transitionDuration!=="0s")&&(H.push({el:o,origAnimation:o.style.animationPlayState,origTransition:o.style.transitionDuration}),o.style.animationPlayState="paused",o.style.transitionDuration="0s")}),typeof document.getAnimations=="function")try{document.getAnimations().forEach(n=>{try{n.pause()}catch{}})}catch{}document.querySelectorAll("video, audio").forEach(n=>{const o=n;if(o.closest("[data-agentation]"))return;const i=!o.paused;o.pause(),i&&Y.push(o)}),P=globalThis.setTimeout,Z=globalThis.setInterval,R=globalThis.requestAnimationFrame,Q=globalThis.clearTimeout,tt=globalThis.clearInterval,et=globalThis.cancelAnimationFrame;let e=1e5;globalThis.setTimeout=(n,o,...i)=>(B.push({fn:()=>n(...i),delay:o||0}),++e),globalThis.setInterval=(n,o,...i)=>{const r=++e;return nt.push({fn:()=>n(...i),delay:o||0,id:r}),r},globalThis.requestAnimationFrame=n=>(X.push(n),++e)}function Dt(){if(!O)return;if(O=!1,typeof document.getAnimations=="function")try{document.getAnimations().forEach(n=>{try{n.play()}catch{}})}catch{}H.forEach(({el:n,origAnimation:o,origTransition:i})=>{n.style.animationPlayState=o,n.style.transitionDuration=i}),H=[],Y.forEach(n=>{try{n.play()}catch{}}),Y=[],globalThis.setTimeout=P,globalThis.setInterval=Z,globalThis.requestAnimationFrame=R,globalThis.clearTimeout=Q,globalThis.clearInterval=tt,globalThis.cancelAnimationFrame=et;const t=B,e=X;B=[],nt=[],X=[],t.forEach(({fn:n,delay:o})=>P(n,o)),e.forEach(n=>R(n))}let D=[],E=null,S=null;window.addEventListener("message",t=>{if(t.source!==window)return;const e=t.data;if(!(!e||e.source!==F))switch(e.type){case"AG_FRAMEWORK_DETECT_RESULT":D=e.payload.frameworks;break;case"AG_COMPONENT_INFO":E==null||E(e.payload),E=null;break;case"AG_SOURCE_INFO":S==null||S(e.payload),S=null;break}});function Ft(t){return new Promise(e=>{E=e,window.postMessage({source:F,type:"AG_COMPONENT_INFO_REQUEST",payload:{elementSelector:t}},"*"),setTimeout(()=>{E=null,e(null)},2e3)})}function qt(t){return new Promise(e=>{S=e,window.postMessage({source:F,type:"AG_PROBE_SOURCE",payload:{elementSelector:t}},"*"),setTimeout(()=>{S=null,e(null)},2e3)})}const _=ct(),C=new ft(window.location.pathname),c=new ut(_.getElementById("agentation-toolbar")),b=new pt(_.getElementById("agentation-highlights"),_.getElementById("agentation-markers")),w=new ht(_.getElementById("agentation-popups"));let x=null,jt="standard",h=[];const $=new Map;function U(t){if($.has(t))return;const e=t.getBoundingClientRect(),n=document.createElement("div");n.setAttribute("data-agentation","multi-select-highlight"),n.style.cssText=`
    position: fixed;
    z-index: 2147483640;
    pointer-events: none;
    left: ${e.left}px;
    top: ${e.top}px;
    width: ${e.width}px;
    height: ${e.height}px;
    background: rgba(99, 102, 241, 0.25);
    border: 2px solid #6366f1;
    box-sizing: border-box;
  `,document.body.appendChild(n),$.set(t,n)}function Ut(t){const e=$.get(t);e&&(e.remove(),$.delete(t))}function ot(){$.forEach(t=>t.remove()),$.clear()}let f=!1,A=!1,k=0,M=0,a=null,T=null;function z(){b.clearAllMarkers(),C.getAll().forEach((t,e)=>{b.addMarker(t.id,{x:t.boundingBox.x,y:t.boundingBox.y},e+1)}),c.setAnnotationCount(C.getAll().length)}z();c.on("toggle",()=>{c.toggle(),c.isActive||(b.clearHoverHighlight(),w.hide(),document.body.style.cursor="",ot(),h=[],f=!1,A=!1,a&&(a.remove(),a=null),T=null)});c.on("copy",()=>{var e;const t=_t(C.getAll(),jt);if((e=navigator.clipboard)!=null&&e.writeText)navigator.clipboard.writeText(t).catch(()=>{});else{const n=document.createElement("textarea");n.value=t,n.style.cssText="position:fixed;left:-9999px;top:-9999px",document.body.appendChild(n),n.select(),document.execCommand("copy"),n.remove()}});c.on("clear",()=>{C.clearAll(),z()});c.on("freeze",()=>{Yt()?Dt():Ht()});c.on("markersToggle",()=>{b.toggleMarkers()});c.on("areaMode",()=>{f=!f,f||(a&&(a.remove(),a=null),A=!1),document.body.style.cursor=f?"crosshair":""});c.on("settings",()=>{chrome.runtime.sendMessage({type:"OPEN_SETTINGS"})});document.body.addEventListener("mousemove",t=>{if(!c.isActive)return;if(f&&A&&a){const n=Math.min(t.clientX,k),o=Math.min(t.clientY,M),i=Math.abs(t.clientX-k),r=Math.abs(t.clientY-M);a.style.left=`${n}px`,a.style.top=`${o}px`,a.style.width=`${i}px`,a.style.height=`${r}px`;return}if(f)return;const e=G(t.clientX,t.clientY);if(e&&!q(e)){const n=I(e,2);b.showHoverHighlight(e,n),document.body.style.cursor=Wt(e)?"text":"crosshair"}else b.clearHoverHighlight(),document.body.style.cursor=""});document.body.addEventListener("mousedown",t=>{if(!c.isActive||!f)return;const e=t.target;q(e)||(t.preventDefault(),t.stopPropagation(),A=!0,k=t.clientX,M=t.clientY,a=document.createElement("div"),a.setAttribute("data-agentation","area-overlay"),a.style.cssText=`
    position: fixed;
    z-index: 2147483641;
    pointer-events: none;
    left: ${k}px;
    top: ${M}px;
    width: 0px;
    height: 0px;
    background: rgba(251, 191, 36, 0.2);
    border: 2px dashed #f59e0b;
    box-sizing: border-box;
  `,document.body.appendChild(a))},!0);document.body.addEventListener("mouseup",t=>{if(!c.isActive||!f||!A)return;t.preventDefault(),t.stopPropagation(),A=!1;const e=Math.min(t.clientX,k),n=Math.min(t.clientY,M),o=Math.abs(t.clientX-k),i=Math.abs(t.clientY-M);if(a&&(a.remove(),a=null),o<5||i<5)return;const r={x:e+window.scrollX,y:n+window.scrollY,width:o,height:i};w.show({x:t.clientX,y:t.clientY},`Area (${o}x${i})`),T=r,x=null},!0);document.body.addEventListener("click",t=>{if(!c.isActive||f)return;const e=G(t.clientX,t.clientY);if(!e||q(e))return;if(t.preventDefault(),t.stopPropagation(),(t.metaKey||t.ctrlKey)&&t.shiftKey){const o=h.indexOf(e);o>=0?(h.splice(o,1),Ut(e)):(h.push(e),U(e));return}if(h.length>0){h.includes(e)||(h.push(e),U(e)),x=e;const o=I(e,2);w.show({x:t.clientX,y:t.clientY},`Multi-select (${h.length} elements): ${o}`);return}x=e;const n=I(e,2);w.show({x:t.clientX,y:t.clientY},n)},!0);w.on("submit",async t=>{if(T){const m=T;T=null,C.add({elementPath:"area",selector:"",elementTag:"area",cssClasses:[],attributes:{},textContent:"",comment:t.comment,intent:t.intent,severity:t.severity,boundingBox:m,viewport:{scrollX:window.scrollX,scrollY:window.scrollY,width:window.innerWidth,height:window.innerHeight},nearbyText:[],computedStyles:{}}),z();return}if(!x)return;const e=h.length>1,n=e?[...h]:[x],o=Lt(x),i=It(),r=o.selector,[l,u]=await Promise.all([D.length>0?Ft(r):Promise.resolve(null),D.length>0?qt(r):Promise.resolve(null)]),p=e?n.map(m=>{const y=m.getBoundingClientRect();return{x:y.left+window.scrollX,y:y.top+window.scrollY,width:y.width,height:y.height}}):void 0;let d;if(e&&p&&p.length>0){const m=Math.min(...p.map(g=>g.x)),y=Math.min(...p.map(g=>g.y)),it=Math.max(...p.map(g=>g.x+g.width)),st=Math.max(...p.map(g=>g.y+g.height));d={x:m,y,width:it-m,height:st-y}}C.add({...o,...d?{boundingBox:d}:{},comment:t.comment,intent:t.intent,severity:t.severity,selectedText:i==null?void 0:i.text,framework:l||void 0,source:u||void 0,...e?{isMultiSelect:!0,elementBoundingBoxes:p}:{}}),e&&(ot(),h=[]),z(),x=null});w.on("cancel",()=>{x=null,T=null});document.addEventListener("keydown",t=>{(t.metaKey||t.ctrlKey)&&t.shiftKey&&t.key==="F"&&(t.preventDefault(),c.toggle(),c.isActive||(b.clearHoverHighlight(),w.hide(),document.body.style.cursor=""))});function q(t){return!!t.closest("agentation-root")||t.hasAttribute("data-agentation")}function Wt(t){const e=Array.from(t.childNodes);return e.length>0&&e.every(n=>n.nodeType===Node.TEXT_NODE)}
