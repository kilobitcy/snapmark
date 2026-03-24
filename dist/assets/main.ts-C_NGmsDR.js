var K=Object.defineProperty;var G=(t,e,n)=>e in t?K(t,e,{enumerable:!0,configurable:!0,writable:!0,value:n}):t[e]=n;var s=(t,e,n)=>G(t,typeof e!="symbol"?e+"":e,n);import{A as X}from"./messaging-BsnyCUR5.js";const J=`
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

#agentation-toolbar {
  pointer-events: auto;
}
`;let w=null;function Z(){if(w)return w;const t=document.querySelector("agentation-root");t&&t.remove();const e=document.createElement("agentation-root");e.setAttribute("data-agentation",""),w=e.attachShadow({mode:"closed"});const n=document.createElement("style");n.textContent=J,w.appendChild(n);for(const o of["agentation-toolbar","agentation-highlights","agentation-markers","agentation-popups"]){const i=document.createElement("div");i.id=o,w.appendChild(i)}return document.body.appendChild(e),w}const Q=[{action:"markersToggle",label:"⦿",title:"Toggle markers"},{action:"freeze",label:"⏸",title:"Freeze/unfreeze"},{action:"settings",label:"⚙",title:"Settings"},{action:"copy",label:"📋",title:"Copy annotations"},{action:"send",label:"➤",title:"Send"},{action:"clear",label:"🗑",title:"Clear annotations"}],R={connected:"#22c55e",connecting:"#f59e0b",disconnected:"#ef4444"};class V{constructor(e){s(this,"isActive",!1);s(this,"container");s(this,"listeners",new Map);s(this,"annotationCount",0);s(this,"connectionStatus","disconnected");s(this,"dragging",!1);s(this,"dragOffsetX",0);s(this,"dragOffsetY",0);s(this,"posX",-1);s(this,"posY",-1);s(this,"_onMouseMove");s(this,"_onMouseUp");this.container=e,this._onMouseMove=n=>{if(!this.dragging)return;const o=20,i=this.container.firstElementChild;if(!i)return;const r=i.offsetWidth||0,l=i.offsetHeight||0;this.posX=Math.min(Math.max(o,n.clientX-this.dragOffsetX),window.innerWidth-r-o),this.posY=Math.min(Math.max(o,n.clientY-this.dragOffsetY),window.innerHeight-l-o),i.style.left=`${this.posX}px`,i.style.top=`${this.posY}px`,i.style.right="auto",i.style.bottom="auto"},this._onMouseUp=()=>{this.dragging=!1},document.addEventListener("mousemove",this._onMouseMove),document.addEventListener("mouseup",this._onMouseUp),this.render()}activate(){this.isActive=!0,this.render()}deactivate(){this.isActive=!1,this.render()}toggle(){this.isActive?this.deactivate():this.activate()}setAnnotationCount(e){this.annotationCount=e;const n=this.container.querySelector(".ag-count");n&&(n.textContent=String(e))}setConnectionStatus(e){this.connectionStatus=e;const n=this.container.querySelector(".ag-status");n&&(n.style.backgroundColor=R[e],n.title=e)}destroy(){document.removeEventListener("mousemove",this._onMouseMove),document.removeEventListener("mouseup",this._onMouseUp),this.container.innerHTML="",this.listeners.clear()}on(e,n){this.listeners.has(e)||this.listeners.set(e,new Set),this.listeners.get(e).add(n)}off(e,n){var o;(o=this.listeners.get(e))==null||o.delete(n)}emit(e){var n;(n=this.listeners.get(e))==null||n.forEach(o=>o())}render(){this.container.innerHTML="",this.isActive?this.container.appendChild(this.buildPanel()):this.container.appendChild(this.buildBadge())}applyBasePosition(e,n,o){e.style.cssText=`
      position: fixed;
      z-index: 2147483647;
      box-sizing: border-box;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: grab;
      user-select: none;
    `,this.posX>=0&&this.posY>=0?(e.style.left=`${this.posX}px`,e.style.top=`${this.posY}px`):(e.style.right="20px",e.style.bottom="20px"),e.style.width=n,e.style.height=o}attachDragHandler(e){e.addEventListener("mousedown",n=>{if(n.target.classList.contains("ag-btn"))return;this.dragging=!0;const o=e.getBoundingClientRect();this.dragOffsetX=n.clientX-o.left,this.dragOffsetY=n.clientY-o.top,n.preventDefault()})}buildBadge(){const e=document.createElement("div");return e.className="ag-badge",this.applyBasePosition(e,"44px","44px"),e.style.borderRadius="50%",e.style.backgroundColor="#3b82f6",e.style.color="#ffffff",e.style.display="flex",e.style.alignItems="center",e.style.justifyContent="center",e.style.fontSize="18px",e.style.fontWeight="bold",e.style.boxShadow="0 2px 8px rgba(0,0,0,0.25)",e.style.cursor="pointer",e.textContent="A",e.title="Agentation",e.addEventListener("click",()=>{this.emit("toggle"),this.toggle()}),this.attachDragHandler(e),e}buildPanel(){const e=document.createElement("div");e.className="ag-panel",this.applyBasePosition(e,"auto","auto"),e.style.borderRadius="10px",e.style.backgroundColor="#ffffff",e.style.border="1px solid #e5e5e5",e.style.boxShadow="0 2px 12px rgba(0,0,0,0.18)",e.style.display="flex",e.style.flexDirection="column",e.style.minWidth="280px",e.style.overflow="hidden";const n=document.createElement("div");n.style.cssText=`
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
      background-color: ${R[this.connectionStatus]};
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
    `,l.addEventListener("click",()=>{this.emit("toggle"),this.deactivate()}),n.appendChild(o),n.appendChild(i),n.appendChild(r),n.appendChild(l);const u=document.createElement("div");u.style.cssText=`
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 10px;
    `;for(const p of Q){const c=document.createElement("button");c.className="ag-btn",c.dataset.action=p.action,c.textContent=p.label,c.title=p.title,c.style.cssText=`
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
      `,c.addEventListener("mouseenter",()=>{c.style.background="#e0e7ff"}),c.addEventListener("mouseleave",()=>{c.style.background="#f9fafb"}),c.addEventListener("click",m=>{m.stopPropagation(),this.emit(p.action)}),u.appendChild(c)}return e.appendChild(n),e.appendChild(u),this.attachDragHandler(e),e}}class tt{constructor(e,n){s(this,"highlightContainer");s(this,"markerContainer");s(this,"hoverEl",null);s(this,"tooltipEl",null);s(this,"markers",new Map);this.highlightContainer=e,this.markerContainer=n}showHoverHighlight(e,n){this.clearHoverHighlight();const o=e.getBoundingClientRect();this.hoverEl=document.createElement("div"),this.hoverEl.className="ag-hover-highlight",Object.assign(this.hoverEl.style,{position:"fixed",top:`${o.top}px`,left:`${o.left}px`,width:`${o.width}px`,height:`${o.height}px`,border:"2px solid var(--ag-accent, #3b82f6)",backgroundColor:"rgba(59, 130, 246, 0.1)",pointerEvents:"none",zIndex:"2147483646",borderRadius:"2px",boxSizing:"border-box"}),this.highlightContainer.appendChild(this.hoverEl),n&&(this.tooltipEl=document.createElement("div"),this.tooltipEl.className="ag-hover-tooltip",this.tooltipEl.textContent=n,Object.assign(this.tooltipEl.style,{position:"fixed",top:`${o.top-24}px`,left:`${o.left}px`,backgroundColor:"var(--ag-accent, #3b82f6)",color:"#fff",padding:"2px 6px",borderRadius:"3px",fontSize:"11px",fontFamily:"monospace",pointerEvents:"none",zIndex:"2147483646",whiteSpace:"nowrap"}),this.highlightContainer.appendChild(this.tooltipEl))}clearHoverHighlight(){var e,n;(e=this.hoverEl)==null||e.remove(),this.hoverEl=null,(n=this.tooltipEl)==null||n.remove(),this.tooltipEl=null}addMarker(e,n,o){const i=document.createElement("div");i.className="ag-marker",i.dataset.markerId=e,i.textContent=String(o),Object.assign(i.style,{position:"fixed",left:`${n.x}px`,top:`${n.y}px`,width:"20px",height:"20px",borderRadius:"50%",backgroundColor:"var(--ag-accent, #3b82f6)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"bold",pointerEvents:"auto",cursor:"pointer",zIndex:"2147483646",transform:"translate(-50%, -50%)"}),this.markers.set(e,i),this.markerContainer.appendChild(i)}removeMarker(e){const n=this.markers.get(e);n&&(n.remove(),this.markers.delete(e))}clearAllMarkers(){for(const e of this.markers.values())e.remove();this.markers.clear()}destroy(){this.clearHoverHighlight(),this.clearAllMarkers()}}class et{constructor(e){s(this,"container");s(this,"listeners",new Map);s(this,"popupEl",null);this.container=e}show(e,n){this.hide(),this.popupEl=document.createElement("div"),this.popupEl.className="ag-popup",Object.assign(this.popupEl.style,{position:"fixed",left:`${e.x}px`,top:`${e.y+10}px`,zIndex:"2147483647",background:"#ffffff",borderRadius:"8px",boxShadow:"0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.10)",padding:"14px 16px 12px",minWidth:"280px",maxWidth:"360px",fontFamily:"system-ui, -apple-system, sans-serif",fontSize:"13px",color:"#1a1a1a",border:"1px solid #e5e7eb"}),this.popupEl.innerHTML=`
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
    `,this.popupEl.querySelector(".ag-popup-submit").addEventListener("click",()=>{const o=this.popupEl.querySelector("textarea").value.trim();if(!o)return;const i=this.popupEl.querySelector('[data-field="intent"]').value,r=this.popupEl.querySelector('[data-field="severity"]').value;this.emit("submit",{comment:o,intent:i,severity:r}),this.hide()}),this.popupEl.querySelector(".ag-popup-cancel").addEventListener("click",()=>{this.emit("cancel"),this.hide()}),this.container.appendChild(this.popupEl),this.popupEl.querySelector("textarea").focus()}hide(){var e;(e=this.popupEl)==null||e.remove(),this.popupEl=null}on(e,n){this.listeners.has(e)||this.listeners.set(e,new Set),this.listeners.get(e).add(n)}off(e,n){var o;(o=this.listeners.get(e))==null||o.delete(n)}emit(e,...n){var o;(o=this.listeners.get(e))==null||o.forEach(i=>i(...n))}destroy(){this.hide(),this.listeners.clear()}}class nt{constructor(e){s(this,"annotations",[]);s(this,"storageKey");s(this,"RETENTION_DAYS",7);this.storageKey=`agentation-annotations-${e}`,this.load()}getAll(){return[...this.annotations]}add(e){const n={...e,id:crypto.randomUUID(),timestamp:Date.now()};return this.annotations.push(n),this.save(),n}update(e,n){const o=this.annotations.findIndex(i=>i.id===e);o!==-1&&(this.annotations[o]={...this.annotations[o],...n},this.save())}delete(e){this.annotations=this.annotations.filter(n=>n.id!==e),this.save()}clearAll(){this.annotations=[],this.save()}save(){try{localStorage.setItem(this.storageKey,JSON.stringify(this.annotations))}catch{}}load(){try{const e=localStorage.getItem(this.storageKey);if(e){const n=JSON.parse(e),o=Date.now()-this.RETENTION_DAYS*24*60*60*1e3;this.annotations=n.filter(i=>i.timestamp>o)}}catch{}}}function L(t){return typeof CSS<"u"&&CSS.escape?CSS.escape(t):t.replace(/([^\w-])/g,"\\$1")}function H(t){return!!(/^[a-zA-Z][\w-]*_[a-zA-Z0-9]{5,}$/.test(t)||/^sc-[a-zA-Z0-9]+$/.test(t)||/^css-[a-zA-Z0-9]+$/.test(t))}function P(t){return Array.from(t.classList).filter(e=>!H(e))}function ot(t){if(t.id)return`${t.tagName.toLowerCase()}#${t.id}`;const e=P(t);return e.length>0?`${t.tagName.toLowerCase()}.${e.join(".")}`:t.tagName.toLowerCase()}function O(t,e=4){const n=[];let o=t;for(;o&&o!==document.body&&o!==document.documentElement&&n.length<e;){const i=o.getRootNode();if(i instanceof ShadowRoot){n.push("⟨shadow⟩"),o=i.host;continue}n.push(ot(o)),o=o.parentElement}return n.reverse().join(" > ")}function N(t){try{return document.querySelectorAll(t).length===1}catch{return!1}}function it(t){if(t.id){const o=`#${L(t.id)}`;if(N(o))return o}const e=t.getAttribute("data-testid");if(e){const o=`[data-testid="${L(e)}"]`;if(N(o))return o}for(const o of Array.from(t.attributes))if(o.name.startsWith("data-")&&o.name!=="data-testid"){const i=`[${o.name}="${L(o.value)}"]`;if(N(i))return i}const n=P(t);if(n.length>0){const o=`${t.tagName.toLowerCase()}.${n.map(i=>L(i)).join(".")}`;if(N(o))return o}return st(t)}function st(t){const e=[];let n=t;for(;n&&n!==document.body&&n!==document.documentElement;){const o=n.parentElement;if(!o)break;const r=Array.from(o.children).indexOf(n)+1,l=n.tagName.toLowerCase();e.unshift(`${l}:nth-child(${r})`);const u=e.join(" > ");if(N(u))return u;n=o}return e.join(" > ")}function D(t,e){let n=document.elementFromPoint(t,e);if(!n)return null;for(;n.shadowRoot;){const o=n.shadowRoot.elementFromPoint(t,e);if(!o||o===n)break;n=o}return n}const rt=new Set(["a","button","input","select","textarea","details","summary"]),at=new Set(["button","a","input"]),lt=25,ct=40,dt=["data-","aria-"],ut=new Set(["id","role","href","name","type","placeholder"]),pt=new Set(["class","style"]),ht=["color","backgroundColor","fontSize","fontWeight","padding","margin","display","position","borderRadius"];function ft(t,e){return t.length<=e?t:t.slice(0,e)+"..."}function j(t){return Array.from(t.classList).filter(e=>!H(e))}function gt(t){const e={};for(const n of Array.from(t.attributes))if(!pt.has(n.name)){if(ut.has(n.name)){e[n.name]=n.value;continue}dt.some(o=>n.name.startsWith(o))&&(e[n.name]=n.value)}return e}function mt(t){const e=(t.textContent??"").trim(),n=t.tagName.toLowerCase(),o=at.has(n)?lt:ct;return ft(e,o)}function xt(t){const e=t.parentElement;if(!e)return{nearbyText:[],nearbyElements:[]};const o=Array.from(e.children).filter(l=>l!==t).slice(0,4),i=[],r=[];for(const l of o){const u=(l.textContent??"").trim();u&&i.push(u),r.push({tag:l.tagName.toLowerCase(),text:u,classes:j(l)})}return{nearbyText:i,nearbyElements:r}}function bt(t){const e=window.getComputedStyle(t),n={};for(const o of ht)n[o]=e[o]??"";return n}function yt(t){const e=t.tagName.toLowerCase(),n=t.tabIndex??-1,o=rt.has(e)||n>=0;return{role:t.getAttribute("role")??void 0,ariaLabel:t.getAttribute("aria-label")??void 0,focusable:o}}function wt(t){const e=t.getBoundingClientRect(),{nearbyText:n,nearbyElements:o}=xt(t);return{elementTag:t.tagName.toLowerCase(),cssClasses:j(t),attributes:gt(t),textContent:mt(t),boundingBox:{x:e.x,y:e.y,width:e.width,height:e.height},viewport:{scrollX:window.scrollX,scrollY:window.scrollY,width:window.innerWidth,height:window.innerHeight},nearbyText:n,nearbyElements:o,computedStyles:bt(t),accessibility:yt(t),isFixed:window.getComputedStyle(t).position==="fixed",elementPath:O(t),selector:it(t)}}function vt(){const t=window.getSelection();if(!t||t.isCollapsed||!t.toString().trim())return null;const e=t.toString().trim();let o=t.getRangeAt(0).commonAncestorContainer;return o.nodeType===Node.TEXT_NODE&&(o=o.parentElement),o?{text:e,element:o}:null}function Et(t,e){return t.map((n,o)=>Ct(n,o+1,e)).join(`

`)}function Ct(t,e,n){switch(n){case"compact":return $t(t,e);case"standard":return Tt(t,e);case"detailed":return U(t,e);case"forensic":return kt(t,e)}}function St(t){const e=t.cssClasses.length>0?`.${t.cssClasses[0]}`:"";return`${t.elementTag}${e}`}function $t(t,e){const n=[`#${e}`];return n.push(`[${St(t)}]`),n.push(`"${t.textContent}"`),t.source&&n.push(`(${t.source.file}:${t.source.line})`),t.selectedText&&n.push(`[selected: "${t.selectedText}"]`),n.push(`— "${t.comment}"`),n.join(" ")}function Tt(t,e){const n=[];if(n.push(`## Annotation #${e} — "${t.comment}"`),n.push(`**Element:** \`<${t.elementTag} class="${t.cssClasses.join(" ")}">\` "${t.textContent}"`),t.selectedText&&n.push(`**Selected text:** "${t.selectedText}"`),n.push(`**Path:** \`${t.elementPath}\``),t.framework){const o=t.framework.name.charAt(0).toUpperCase()+t.framework.name.slice(1);n.push(`**Component:** \`<${t.framework.componentName}>\` (${o})`)}return t.source&&n.push(`**Source:** \`${t.source.file}:${t.source.line}:${t.source.column}\``),n.push(`**Location:** x=${t.boundingBox.x}, y=${t.boundingBox.y}`),n.join(`
`)}function U(t,e){const n=[];if(n.push(`## Annotation #${e} — "${t.comment}"`),n.push(`**Element:** \`<${t.elementTag} class="${t.cssClasses.join(" ")}">\``),n.push(`**Selector:** \`${t.selector}\``),n.push(`**Text:** "${t.textContent}"`),t.selectedText&&n.push(`**Selected text:** "${t.selectedText}"`),n.push(""),t.framework){const o=t.framework.name.charAt(0).toUpperCase()+t.framework.name.slice(1);n.push(`**Framework:** ${o}`),n.push(`**Component:** \`${t.framework.componentName}\` (path: \`${t.framework.componentPath||t.framework.componentName}\`)`),t.framework.props&&n.push(`**Props:** \`${JSON.stringify(t.framework.props)}\``)}return t.source&&n.push(`**Source:** \`${t.source.file}:${t.source.line}:${t.source.column}\``),n.push(""),n.push(`**Nearby text:** ${JSON.stringify(t.nearbyText)}`),n.push(`**Styles:** \`${JSON.stringify(t.computedStyles)}\``),n.push(`**Bounding Box:** x=${t.boundingBox.x}, y=${t.boundingBox.y}, w=${t.boundingBox.width}, h=${t.boundingBox.height}`),n.join(`
`)}function kt(t,e){const n=[U(t,e)];return t.url&&n.push(`**URL:** ${t.url}`),n.push(`**Viewport:** ${t.viewport.width}x${t.viewport.height}, scrollX=${t.viewport.scrollX}, scrollY=${t.viewport.scrollY}`),n.push(`**Timestamp:** ${new Date(t.timestamp).toISOString()}`),t.fullPath&&n.push(`**Full DOM Path:** \`${t.fullPath}\``),t.accessibility&&n.push(`**Accessibility:** role=${t.accessibility.role||"none"}, focusable=${t.accessibility.focusable}${t.accessibility.ariaLabel?`, aria-label="${t.accessibility.ariaLabel}"`:""}`),t.nearbyElements&&n.push(`**Nearby Elements:** ${JSON.stringify(t.nearbyElements)}`),n.join(`
`)}let I=[],v=null,E=null;window.addEventListener("message",t=>{if(t.source!==window)return;const e=t.data;if(!(!e||e.source!==X))switch(e.type){case"AG_FRAMEWORK_DETECT_RESULT":I=e.payload.frameworks;break;case"AG_COMPONENT_INFO":v==null||v(e.payload),v=null;break;case"AG_SOURCE_INFO":E==null||E(e.payload),E=null;break}});function At(t){return new Promise(e=>{v=e,window.postMessage({source:X,type:"AG_COMPONENT_INFO_REQUEST",payload:{elementSelector:t}},"*"),setTimeout(()=>{v=null,e(null)},2e3)})}function Mt(t){return new Promise(e=>{E=e,window.postMessage({source:X,type:"AG_PROBE_SOURCE",payload:{elementSelector:t}},"*"),setTimeout(()=>{E=null,e(null)},2e3)})}const _=Z(),S=new nt(window.location.pathname),d=new V(_.getElementById("agentation-toolbar")),$=new tt(_.getElementById("agentation-highlights"),_.getElementById("agentation-markers")),y=new et(_.getElementById("agentation-popups"));let x=null,Nt="standard",h=[];const T=new Map;function Y(t){if(T.has(t))return;const e=t.getBoundingClientRect(),n=document.createElement("div");n.setAttribute("data-agentation","multi-select-highlight"),n.style.cssText=`
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
  `,document.body.appendChild(n),T.set(t,n)}function Lt(t){const e=T.get(t);e&&(e.remove(),T.delete(t))}function F(){T.forEach(t=>t.remove()),T.clear()}let f=!1,k=!1,A=0,M=0,a=null,C=null;function B(){$.clearAllMarkers(),S.getAll().forEach((t,e)=>{$.addMarker(t.id,{x:t.boundingBox.x,y:t.boundingBox.y},e+1)}),d.setAnnotationCount(S.getAll().length)}B();d.on("toggle",()=>{d.toggle(),d.isActive||($.clearHoverHighlight(),y.hide(),document.body.style.cursor="",F(),h=[],f=!1,k=!1,a&&(a.remove(),a=null),C=null)});d.on("copy",()=>{const t=Et(S.getAll(),Nt);navigator.clipboard.writeText(t).catch(()=>{})});d.on("clear",()=>{S.clearAll(),B()});d.on("freeze",()=>{});d.on("settings",()=>{f=!f,f||(a&&(a.remove(),a=null),k=!1),document.body.style.cursor=f?"crosshair":""});document.body.addEventListener("mousemove",t=>{if(!d.isActive)return;if(f&&k&&a){const n=Math.min(t.clientX,A),o=Math.min(t.clientY,M),i=Math.abs(t.clientX-A),r=Math.abs(t.clientY-M);a.style.left=`${n}px`,a.style.top=`${o}px`,a.style.width=`${i}px`,a.style.height=`${r}px`;return}if(f)return;const e=D(t.clientX,t.clientY);if(e&&!z(e)){const n=O(e,2);$.showHoverHighlight(e,n),document.body.style.cursor=Ot(e)?"text":"crosshair"}else $.clearHoverHighlight(),document.body.style.cursor=""});document.body.addEventListener("mousedown",t=>{if(!d.isActive||!f)return;const e=t.target;z(e)||(t.preventDefault(),t.stopPropagation(),k=!0,A=t.clientX,M=t.clientY,a=document.createElement("div"),a.setAttribute("data-agentation","area-overlay"),a.style.cssText=`
    position: fixed;
    z-index: 2147483641;
    pointer-events: none;
    left: ${A}px;
    top: ${M}px;
    width: 0px;
    height: 0px;
    background: rgba(251, 191, 36, 0.2);
    border: 2px dashed #f59e0b;
    box-sizing: border-box;
  `,document.body.appendChild(a))},!0);document.body.addEventListener("mouseup",t=>{if(!d.isActive||!f||!k)return;t.preventDefault(),t.stopPropagation(),k=!1;const e=Math.min(t.clientX,A),n=Math.min(t.clientY,M),o=Math.abs(t.clientX-A),i=Math.abs(t.clientY-M);if(a&&(a.remove(),a=null),o<5||i<5)return;const r={x:e+window.scrollX,y:n+window.scrollY,width:o,height:i};y.show({x:t.clientX,y:t.clientY},`Area (${o}x${i})`),C=r,x=null},!0);document.body.addEventListener("click",t=>{if(!d.isActive||f)return;const e=D(t.clientX,t.clientY);if(!e||z(e))return;if(t.preventDefault(),t.stopPropagation(),(t.metaKey||t.ctrlKey)&&t.shiftKey){const o=h.indexOf(e);o>=0?(h.splice(o,1),Lt(e)):(h.push(e),Y(e));return}if(h.length>0){h.includes(e)||(h.push(e),Y(e)),x=e;const o=O(e,2);y.show({x:t.clientX,y:t.clientY},`Multi-select (${h.length} elements): ${o}`);return}x=e;const n=O(e,2);y.show({x:t.clientX,y:t.clientY},n)},!0);y.on("submit",async t=>{if(C){const m=C;C=null,S.add({elementPath:"area",selector:"",elementTag:"area",cssClasses:[],attributes:{},textContent:"",comment:t.comment,intent:t.intent,severity:t.severity,boundingBox:m,viewport:{scrollX:window.scrollX,scrollY:window.scrollY,width:window.innerWidth,height:window.innerHeight},nearbyText:[],computedStyles:{}}),B();return}if(!x)return;const e=h.length>1,n=e?[...h]:[x],o=wt(x),i=vt(),r=o.selector,[l,u]=await Promise.all([I.length>0?At(r):Promise.resolve(null),I.length>0?Mt(r):Promise.resolve(null)]),p=e?n.map(m=>{const b=m.getBoundingClientRect();return{x:b.left+window.scrollX,y:b.top+window.scrollY,width:b.width,height:b.height}}):void 0;let c;if(e&&p&&p.length>0){const m=Math.min(...p.map(g=>g.x)),b=Math.min(...p.map(g=>g.y)),q=Math.max(...p.map(g=>g.x+g.width)),W=Math.max(...p.map(g=>g.y+g.height));c={x:m,y:b,width:q-m,height:W-b}}S.add({...o,...c?{boundingBox:c}:{},comment:t.comment,intent:t.intent,severity:t.severity,selectedText:i==null?void 0:i.text,framework:l||void 0,source:u||void 0,...e?{isMultiSelect:!0,elementBoundingBoxes:p}:{}}),e&&(F(),h=[]),B(),x=null});y.on("cancel",()=>{x=null,C=null});document.addEventListener("keydown",t=>{(t.metaKey||t.ctrlKey)&&t.shiftKey&&t.key==="F"&&(t.preventDefault(),d.toggle(),d.isActive||($.clearHoverHighlight(),y.hide(),document.body.style.cursor=""))});function z(t){return!!t.closest("agentation-root")||t.hasAttribute("data-agentation")}function Ot(t){const e=Array.from(t.childNodes);return e.length>0&&e.every(n=>n.nodeType===Node.TEXT_NODE)}
