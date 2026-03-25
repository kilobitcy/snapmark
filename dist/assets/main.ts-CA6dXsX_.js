var at=Object.defineProperty;var lt=(e,t,n)=>t in e?at(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n;var s=(e,t,n)=>lt(e,typeof t!="symbol"?t+"":t,n);import{A as F}from"./messaging-BsnyCUR5.js";const ct=`
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
`;let w=null;function dt(){if(w)return w;const e=document.querySelector("agentation-root");e&&e.remove();const t=document.createElement("agentation-root");t.setAttribute("data-agentation",""),w=t.attachShadow({mode:"closed"});const n=document.createElement("style");n.textContent=ct,w.appendChild(n);for(const o of["agentation-toolbar","agentation-highlights","agentation-markers","agentation-popups"]){const i=document.createElement("div");i.id=o,w.appendChild(i)}return document.body.appendChild(t),w}const ut=[{action:"markersToggle",label:"⦿",title:"Toggle markers"},{action:"freeze",label:"⏸",title:"Freeze/unfreeze"},{action:"areaMode",label:"▢",title:"Area select mode"},{action:"settings",label:"⚙",title:"Settings"},{action:"copy",label:"📋",title:"Copy annotations"},{action:"send",label:"➤",title:"Send"},{action:"clear",label:"🗑",title:"Clear annotations"}],j={connected:"#22c55e",connecting:"#f59e0b",disconnected:"#ef4444"};class pt{constructor(t){s(this,"isActive",!1);s(this,"container");s(this,"listeners",new Map);s(this,"annotationCount",0);s(this,"connectionStatus","disconnected");s(this,"activeButtons",new Set);s(this,"dragging",!1);s(this,"dragOffsetX",0);s(this,"dragOffsetY",0);s(this,"posX",-1);s(this,"posY",-1);s(this,"_onMouseMove");s(this,"_onMouseUp");this.container=t,this._onMouseMove=n=>{if(!this.dragging)return;const o=20,i=this.container.firstElementChild;if(!i)return;const r=i.offsetWidth||0,d=i.offsetHeight||0;this.posX=Math.min(Math.max(o,n.clientX-this.dragOffsetX),window.innerWidth-r-o),this.posY=Math.min(Math.max(o,n.clientY-this.dragOffsetY),window.innerHeight-d-o),i.style.left=`${this.posX}px`,i.style.top=`${this.posY}px`,i.style.right="auto",i.style.bottom="auto"},this._onMouseUp=()=>{this.dragging=!1},document.addEventListener("mousemove",this._onMouseMove),document.addEventListener("mouseup",this._onMouseUp),this.render()}activate(){this.isActive=!0,this.render()}deactivate(){this.isActive=!1,this.activeButtons.clear(),this.render()}toggle(){this.isActive?this.deactivate():this.activate()}setAnnotationCount(t){this.annotationCount=t;const n=this.container.querySelector(".ag-count");n&&(n.textContent=String(t))}setConnectionStatus(t){this.connectionStatus=t;const n=this.container.querySelector(".ag-status");n&&(n.style.backgroundColor=j[t],n.title=t)}setButtonActive(t,n){n?this.activeButtons.add(t):this.activeButtons.delete(t);const o=this.container.querySelector(`[data-action="${t}"]`);o&&this.applyButtonStyle(o,n)}flashButton(t){t.style.background="#dbeafe",t.style.transform="scale(0.92)",setTimeout(()=>{this.activeButtons.has(t.dataset.action)||(t.style.background="#f9fafb"),t.style.transform=""},150)}applyButtonStyle(t,n){n?(t.style.background="#3b82f6",t.style.color="#ffffff",t.style.borderColor="#3b82f6"):(t.style.background="#f9fafb",t.style.color="",t.style.borderColor="#e5e5e5")}destroy(){document.removeEventListener("mousemove",this._onMouseMove),document.removeEventListener("mouseup",this._onMouseUp),this.container.innerHTML="",this.listeners.clear()}on(t,n){this.listeners.has(t)||this.listeners.set(t,new Set),this.listeners.get(t).add(n)}off(t,n){var o;(o=this.listeners.get(t))==null||o.delete(n)}emit(t){var n;(n=this.listeners.get(t))==null||n.forEach(o=>o())}render(){this.container.innerHTML="",this.isActive?this.container.appendChild(this.buildPanel()):this.container.appendChild(this.buildBadge())}applyBasePosition(t,n,o){t.style.cssText=`
      position: fixed;
      z-index: 2147483647;
      box-sizing: border-box;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: grab;
      user-select: none;
    `,this.posX>=0&&this.posY>=0?(t.style.left=`${this.posX}px`,t.style.top=`${this.posY}px`):(t.style.right="20px",t.style.bottom="20px"),t.style.width=n,t.style.height=o}attachDragHandler(t){t.addEventListener("mousedown",n=>{if(n.target.classList.contains("ag-btn"))return;this.dragging=!0;const o=t.getBoundingClientRect();this.dragOffsetX=n.clientX-o.left,this.dragOffsetY=n.clientY-o.top,n.preventDefault()})}buildBadge(){const t=document.createElement("div");return t.className="ag-badge",this.applyBasePosition(t,"44px","44px"),t.style.borderRadius="50%",t.style.backgroundColor="#3b82f6",t.style.color="#ffffff",t.style.display="flex",t.style.alignItems="center",t.style.justifyContent="center",t.style.fontSize="18px",t.style.fontWeight="bold",t.style.boxShadow="0 2px 8px rgba(0,0,0,0.25)",t.style.cursor="pointer",t.textContent="A",t.title="Agentation",t.addEventListener("click",()=>{this.emit("toggle")}),this.attachDragHandler(t),t}buildPanel(){const t=document.createElement("div");t.className="ag-panel",this.applyBasePosition(t,"auto","auto"),t.style.borderRadius="10px",t.style.backgroundColor="#ffffff",t.style.border="1px solid #e5e5e5",t.style.boxShadow="0 2px 12px rgba(0,0,0,0.18)",t.style.display="flex",t.style.flexDirection="column",t.style.minWidth="280px",t.style.overflow="hidden";const n=document.createElement("div");n.style.cssText=`
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
    `;const d=document.createElement("button");d.textContent="✕",d.style.cssText=`
      background: none;
      border: none;
      color: #ffffff;
      cursor: pointer;
      font-size: 13px;
      padding: 0 0 0 4px;
      line-height: 1;
    `,d.addEventListener("click",()=>{this.emit("toggle")}),n.appendChild(o),n.appendChild(i),n.appendChild(r),n.appendChild(d);const p=document.createElement("div");p.style.cssText=`
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 10px;
    `;for(const u of ut){const c=document.createElement("button");c.className="ag-btn",c.dataset.action=u.action,c.textContent=u.label,c.title=u.title,c.style.cssText=`
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
        transition: background 0.15s, transform 0.1s;
        flex-shrink: 0;
      `,this.activeButtons.has(u.action)&&this.applyButtonStyle(c,!0),c.addEventListener("mouseenter",()=>{this.activeButtons.has(u.action)||(c.style.background="#e0e7ff")}),c.addEventListener("mouseleave",()=>{this.activeButtons.has(u.action)||(c.style.background="#f9fafb")}),c.addEventListener("click",m=>{m.stopPropagation(),this.activeButtons.has(u.action)||this.flashButton(c),this.emit(u.action)}),p.appendChild(c)}return t.appendChild(n),t.appendChild(p),this.attachDragHandler(t),t}}class ht{constructor(t,n){s(this,"highlightContainer");s(this,"markerContainer");s(this,"hoverEl",null);s(this,"tooltipEl",null);s(this,"markers",new Map);s(this,"markersVisible",!0);this.highlightContainer=t,this.markerContainer=n}showHoverHighlight(t,n){this.clearHoverHighlight();const o=t.getBoundingClientRect();this.hoverEl=document.createElement("div"),this.hoverEl.className="ag-hover-highlight",Object.assign(this.hoverEl.style,{position:"fixed",top:`${o.top}px`,left:`${o.left}px`,width:`${o.width}px`,height:`${o.height}px`,border:"2px solid var(--ag-accent, #3b82f6)",backgroundColor:"rgba(59, 130, 246, 0.1)",pointerEvents:"none",zIndex:"2147483646",borderRadius:"2px",boxSizing:"border-box"}),this.highlightContainer.appendChild(this.hoverEl),n&&(this.tooltipEl=document.createElement("div"),this.tooltipEl.className="ag-hover-tooltip",this.tooltipEl.textContent=n,Object.assign(this.tooltipEl.style,{position:"fixed",top:`${o.top-24}px`,left:`${o.left}px`,backgroundColor:"var(--ag-accent, #3b82f6)",color:"#fff",padding:"2px 6px",borderRadius:"3px",fontSize:"11px",fontFamily:"monospace",pointerEvents:"none",zIndex:"2147483646",whiteSpace:"nowrap"}),this.highlightContainer.appendChild(this.tooltipEl))}clearHoverHighlight(){var t,n;(t=this.hoverEl)==null||t.remove(),this.hoverEl=null,(n=this.tooltipEl)==null||n.remove(),this.tooltipEl=null}addMarker(t,n,o){const i=document.createElement("div");i.className="ag-marker",i.dataset.markerId=t,i.textContent=String(o),Object.assign(i.style,{position:"fixed",left:`${n.x}px`,top:`${n.y}px`,width:"20px",height:"20px",borderRadius:"50%",backgroundColor:"var(--ag-accent, #3b82f6)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"bold",pointerEvents:"auto",cursor:"pointer",zIndex:"2147483646",transform:"translate(-50%, -50%)"}),this.markers.set(t,i),this.markerContainer.appendChild(i)}removeMarker(t){const n=this.markers.get(t);n&&(n.remove(),this.markers.delete(t))}clearAllMarkers(){for(const t of this.markers.values())t.remove();this.markers.clear()}toggleMarkers(){return this.markersVisible=!this.markersVisible,this.markerContainer.style.display=this.markersVisible?"":"none",this.markersVisible}destroy(){this.clearHoverHighlight(),this.clearAllMarkers()}}class ft{constructor(t){s(this,"container");s(this,"listeners",new Map);s(this,"popupEl",null);this.container=t}show(t,n){this.hide(),this.popupEl=document.createElement("div"),this.popupEl.className="ag-popup",Object.assign(this.popupEl.style,{position:"fixed",left:`${t.x}px`,top:`${t.y+10}px`,zIndex:"2147483647",background:"#ffffff",borderRadius:"8px",boxShadow:"0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.10)",padding:"14px 16px 12px",minWidth:"280px",maxWidth:"360px",fontFamily:"system-ui, -apple-system, sans-serif",fontSize:"13px",color:"#1a1a1a",border:"1px solid #e5e7eb",pointerEvents:"auto"});for(const o of["click","mousedown","mouseup","pointerdown","pointerup","keydown","keyup"])this.popupEl.addEventListener(o,i=>i.stopPropagation());this.popupEl.innerHTML=`
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
    `,this.popupEl.querySelector(".ag-popup-submit").addEventListener("click",()=>{const o=this.popupEl.querySelector("textarea").value.trim();if(!o)return;const i=this.popupEl.querySelector('[data-field="intent"]').value,r=this.popupEl.querySelector('[data-field="severity"]').value;this.emit("submit",{comment:o,intent:i,severity:r}),this.hide()}),this.popupEl.querySelector(".ag-popup-cancel").addEventListener("click",()=>{this.emit("cancel"),this.hide()}),this.container.appendChild(this.popupEl),this.popupEl.querySelector("textarea").focus()}hide(){var t;(t=this.popupEl)==null||t.remove(),this.popupEl=null}on(t,n){this.listeners.has(t)||this.listeners.set(t,new Set),this.listeners.get(t).add(n)}off(t,n){var o;(o=this.listeners.get(t))==null||o.delete(n)}emit(t,...n){var o;(o=this.listeners.get(t))==null||o.forEach(i=>i(...n))}destroy(){this.hide(),this.listeners.clear()}}class gt{constructor(t){s(this,"annotations",[]);s(this,"storageKey");s(this,"RETENTION_DAYS",7);this.storageKey=`agentation-annotations-${t}`,this.load()}getAll(){return[...this.annotations]}add(t){const n={...t,id:crypto.randomUUID(),timestamp:Date.now()};return this.annotations.push(n),this.save(),n}update(t,n){const o=this.annotations.findIndex(i=>i.id===t);o!==-1&&(this.annotations[o]={...this.annotations[o],...n},this.save())}delete(t){this.annotations=this.annotations.filter(n=>n.id!==t),this.save()}clearAll(){this.annotations=[],this.save()}save(){try{localStorage.setItem(this.storageKey,JSON.stringify(this.annotations))}catch{}}load(){try{const t=localStorage.getItem(this.storageKey);if(t){const n=JSON.parse(t),o=Date.now()-this.RETENTION_DAYS*24*60*60*1e3;this.annotations=n.filter(i=>i.timestamp>o)}}catch{}}}function O(e){return typeof CSS<"u"&&CSS.escape?CSS.escape(e):e.replace(/([^\w-])/g,"\\$1")}function K(e){return!!(/^[a-zA-Z][\w-]*_[a-zA-Z0-9]{5,}$/.test(e)||/^sc-[a-zA-Z0-9]+$/.test(e)||/^css-[a-zA-Z0-9]+$/.test(e))}function G(e){return Array.from(e.classList).filter(t=>!K(t))}function mt(e){if(e.id)return`${e.tagName.toLowerCase()}#${e.id}`;const t=G(e);return t.length>0?`${e.tagName.toLowerCase()}.${t.join(".")}`:e.tagName.toLowerCase()}function L(e,t=4){const n=[];let o=e;for(;o&&o!==document.body&&o!==document.documentElement&&n.length<t;){const i=o.getRootNode();if(i instanceof ShadowRoot){n.push("⟨shadow⟩"),o=i.host;continue}n.push(mt(o)),o=o.parentElement}return n.reverse().join(" > ")}function N(e){try{return document.querySelectorAll(e).length===1}catch{return!1}}function xt(e){if(e.id){const o=`#${O(e.id)}`;if(N(o))return o}const t=e.getAttribute("data-testid");if(t){const o=`[data-testid="${O(t)}"]`;if(N(o))return o}for(const o of Array.from(e.attributes))if(o.name.startsWith("data-")&&o.name!=="data-testid"){const i=`[${o.name}="${O(o.value)}"]`;if(N(i))return i}const n=G(e);if(n.length>0){const o=`${e.tagName.toLowerCase()}.${n.map(i=>O(i)).join(".")}`;if(N(o))return o}return yt(e)}function yt(e){const t=[];let n=e;for(;n&&n!==document.body&&n!==document.documentElement;){const o=n.parentElement;if(!o)break;const r=Array.from(o.children).indexOf(n)+1,d=n.tagName.toLowerCase();t.unshift(`${d}:nth-child(${r})`);const p=t.join(" > ");if(N(p))return p;n=o}return t.join(" > ")}function V(e,t){let n=document.elementFromPoint(e,t);if(!n)return null;for(;n.shadowRoot;){const o=n.shadowRoot.elementFromPoint(e,t);if(!o||o===n)break;n=o}return n}const bt=new Set(["a","button","input","select","textarea","details","summary"]),vt=new Set(["button","a","input"]),wt=25,Et=40,St=["data-","aria-"],Tt=new Set(["id","role","href","name","type","placeholder"]),Ct=new Set(["class","style"]),At=["color","backgroundColor","fontSize","fontWeight","padding","margin","display","position","borderRadius"];function $t(e,t){return e.length<=t?e:e.slice(0,t)+"..."}function J(e){return Array.from(e.classList).filter(t=>!K(t))}function kt(e){const t={};for(const n of Array.from(e.attributes))if(!Ct.has(n.name)){if(Tt.has(n.name)){t[n.name]=n.value;continue}St.some(o=>n.name.startsWith(o))&&(t[n.name]=n.value)}return t}function Mt(e){const t=(e.textContent??"").trim(),n=e.tagName.toLowerCase(),o=vt.has(n)?wt:Et;return $t(t,o)}function Nt(e){const t=e.parentElement;if(!t)return{nearbyText:[],nearbyElements:[]};const o=Array.from(t.children).filter(d=>d!==e).slice(0,4),i=[],r=[];for(const d of o){const p=(d.textContent??"").trim();p&&i.push(p),r.push({tag:d.tagName.toLowerCase(),text:p,classes:J(d)})}return{nearbyText:i,nearbyElements:r}}function Bt(e){const t=window.getComputedStyle(e),n={};for(const o of At)n[o]=t[o]??"";return n}function Ot(e){const t=e.tagName.toLowerCase(),n=e.tabIndex??-1,o=bt.has(t)||n>=0;return{role:e.getAttribute("role")??void 0,ariaLabel:e.getAttribute("aria-label")??void 0,focusable:o}}function Lt(e){const t=e.getBoundingClientRect(),{nearbyText:n,nearbyElements:o}=Nt(e);return{elementTag:e.tagName.toLowerCase(),cssClasses:J(e),attributes:kt(e),textContent:Mt(e),boundingBox:{x:t.x,y:t.y,width:t.width,height:t.height},viewport:{scrollX:window.scrollX,scrollY:window.scrollY,width:window.innerWidth,height:window.innerHeight},nearbyText:n,nearbyElements:o,computedStyles:Bt(e),accessibility:Ot(e),isFixed:window.getComputedStyle(e).position==="fixed",elementPath:L(e),selector:xt(e)}}function It(){const e=window.getSelection();if(!e||e.isCollapsed||!e.toString().trim())return null;const t=e.toString().trim();let o=e.getRangeAt(0).commonAncestorContainer;return o.nodeType===Node.TEXT_NODE&&(o=o.parentElement),o?{text:t,element:o}:null}function zt(e,t){return e.map((n,o)=>_t(n,o+1,t)).join(`

`)}function _t(e,t,n){switch(n){case"compact":return Rt(e,t);case"standard":return Xt(e,t);case"detailed":return Z(e,t);case"forensic":return Yt(e,t)}}function Pt(e){const t=e.cssClasses.length>0?`.${e.cssClasses[0]}`:"";return`${e.elementTag}${t}`}function Rt(e,t){const n=[`#${t}`];return n.push(`[${Pt(e)}]`),n.push(`"${e.textContent}"`),e.source&&n.push(`(${e.source.file}:${e.source.line})`),e.selectedText&&n.push(`[selected: "${e.selectedText}"]`),n.push(`— "${e.comment}"`),n.join(" ")}function Xt(e,t){const n=[];if(n.push(`## Annotation #${t} — "${e.comment}"`),n.push(`**Element:** \`<${e.elementTag} class="${e.cssClasses.join(" ")}">\` "${e.textContent}"`),e.selectedText&&n.push(`**Selected text:** "${e.selectedText}"`),n.push(`**Path:** \`${e.elementPath}\``),e.framework){const o=e.framework.name.charAt(0).toUpperCase()+e.framework.name.slice(1);n.push(`**Component:** \`<${e.framework.componentName}>\` (${o})`)}return e.source&&n.push(`**Source:** \`${e.source.file}:${e.source.line}:${e.source.column}\``),n.push(`**Location:** x=${e.boundingBox.x}, y=${e.boundingBox.y}`),n.join(`
`)}function Z(e,t){const n=[];if(n.push(`## Annotation #${t} — "${e.comment}"`),n.push(`**Element:** \`<${e.elementTag} class="${e.cssClasses.join(" ")}">\``),n.push(`**Selector:** \`${e.selector}\``),n.push(`**Text:** "${e.textContent}"`),e.selectedText&&n.push(`**Selected text:** "${e.selectedText}"`),n.push(""),e.framework){const o=e.framework.name.charAt(0).toUpperCase()+e.framework.name.slice(1);n.push(`**Framework:** ${o}`),n.push(`**Component:** \`${e.framework.componentName}\` (path: \`${e.framework.componentPath||e.framework.componentName}\`)`),e.framework.props&&n.push(`**Props:** \`${JSON.stringify(e.framework.props)}\``)}return e.source&&n.push(`**Source:** \`${e.source.file}:${e.source.line}:${e.source.column}\``),n.push(""),n.push(`**Nearby text:** ${JSON.stringify(e.nearbyText)}`),n.push(`**Styles:** \`${JSON.stringify(e.computedStyles)}\``),n.push(`**Bounding Box:** x=${e.boundingBox.x}, y=${e.boundingBox.y}, w=${e.boundingBox.width}, h=${e.boundingBox.height}`),n.join(`
`)}function Yt(e,t){const n=[Z(e,t)];return e.url&&n.push(`**URL:** ${e.url}`),n.push(`**Viewport:** ${e.viewport.width}x${e.viewport.height}, scrollX=${e.viewport.scrollX}, scrollY=${e.viewport.scrollY}`),n.push(`**Timestamp:** ${new Date(e.timestamp).toISOString()}`),e.fullPath&&n.push(`**Full DOM Path:** \`${e.fullPath}\``),e.accessibility&&n.push(`**Accessibility:** role=${e.accessibility.role||"none"}, focusable=${e.accessibility.focusable}${e.accessibility.ariaLabel?`, aria-label="${e.accessibility.ariaLabel}"`:""}`),e.nearbyElements&&n.push(`**Nearby Elements:** ${JSON.stringify(e.nearbyElements)}`),n.join(`
`)}let B=!1,_,Q,P,tt,et,nt,R=[],ot=[],X=[],Y=[],H=[];function U(){return B}function Ht(){if(B)return;if(B=!0,document.querySelectorAll("*").forEach(n=>{const o=n;if(o.hasAttribute("data-agentation")||o.closest("[data-agentation]")||o.tagName==="AGENTATION-ROOT")return;const i=getComputedStyle(o);(i.animationName!=="none"||i.transitionDuration!=="0s")&&(H.push({el:o,origAnimation:o.style.animationPlayState,origTransition:o.style.transitionDuration}),o.style.animationPlayState="paused",o.style.transitionDuration="0s")}),typeof document.getAnimations=="function")try{document.getAnimations().forEach(n=>{try{n.pause()}catch{}})}catch{}document.querySelectorAll("video, audio").forEach(n=>{const o=n;if(o.closest("[data-agentation]"))return;const i=!o.paused;o.pause(),i&&Y.push(o)}),_=globalThis.setTimeout,Q=globalThis.setInterval,P=globalThis.requestAnimationFrame,tt=globalThis.clearTimeout,et=globalThis.clearInterval,nt=globalThis.cancelAnimationFrame;let t=1e5;globalThis.setTimeout=(n,o,...i)=>(R.push({fn:()=>n(...i),delay:o||0}),++t),globalThis.setInterval=(n,o,...i)=>{const r=++t;return ot.push({fn:()=>n(...i),delay:o||0,id:r}),r},globalThis.requestAnimationFrame=n=>(X.push(n),++t)}function Dt(){if(!B)return;if(B=!1,typeof document.getAnimations=="function")try{document.getAnimations().forEach(n=>{try{n.play()}catch{}})}catch{}H.forEach(({el:n,origAnimation:o,origTransition:i})=>{n.style.animationPlayState=o,n.style.transitionDuration=i}),H=[],Y.forEach(n=>{try{n.play()}catch{}}),Y=[],globalThis.setTimeout=_,globalThis.setInterval=Q,globalThis.requestAnimationFrame=P,globalThis.clearTimeout=tt,globalThis.clearInterval=et,globalThis.cancelAnimationFrame=nt;const e=R,t=X;R=[],ot=[],X=[],e.forEach(({fn:n,delay:o})=>_(n,o)),t.forEach(n=>P(n))}let D=[],E=null,S=null;window.addEventListener("message",e=>{if(e.source!==window)return;const t=e.data;if(!(!t||t.source!==F))switch(t.type){case"AG_FRAMEWORK_DETECT_RESULT":D=t.payload.frameworks;break;case"AG_COMPONENT_INFO":E==null||E(t.payload),E=null;break;case"AG_SOURCE_INFO":S==null||S(t.payload),S=null;break}});function Ft(e){return new Promise(t=>{E=t,window.postMessage({source:F,type:"AG_COMPONENT_INFO_REQUEST",payload:{elementSelector:e}},"*"),setTimeout(()=>{E=null,t(null)},2e3)})}function qt(e){return new Promise(t=>{S=t,window.postMessage({source:F,type:"AG_PROBE_SOURCE",payload:{elementSelector:e}},"*"),setTimeout(()=>{S=null,t(null)},2e3)})}const I=dt(),C=new gt(window.location.pathname),a=new pt(I.getElementById("agentation-toolbar")),b=new ht(I.getElementById("agentation-highlights"),I.getElementById("agentation-markers")),v=new ft(I.getElementById("agentation-popups"));let x=null,jt="standard",h=[];const A=new Map;function W(e){if(A.has(e))return;const t=e.getBoundingClientRect(),n=document.createElement("div");n.setAttribute("data-agentation","multi-select-highlight"),n.style.cssText=`
    position: fixed;
    z-index: 2147483640;
    pointer-events: none;
    left: ${t.left}px;
    top: ${t.top}px;
    width: ${t.width}px;
    height: ${t.height}px;
    background: rgba(99, 102, 241, 0.25);
    border: 2px solid #6366f1;
    box-sizing: border-box;
  `,document.body.appendChild(n),A.set(e,n)}function Ut(e){const t=A.get(e);t&&(t.remove(),A.delete(e))}function it(){A.forEach(e=>e.remove()),A.clear()}let f=!1,$=!1,k=0,M=0,l=null,T=null;function z(){b.clearAllMarkers(),C.getAll().forEach((e,t)=>{b.addMarker(e.id,{x:e.boundingBox.x,y:e.boundingBox.y},t+1)}),a.setAnnotationCount(C.getAll().length)}z();a.on("toggle",()=>{a.toggle(),a.isActive||(b.clearHoverHighlight(),v.hide(),document.body.style.cursor="",it(),h=[],f=!1,$=!1,l&&(l.remove(),l=null),T=null)});a.on("copy",()=>{var t;const e=zt(C.getAll(),jt);if((t=navigator.clipboard)!=null&&t.writeText)navigator.clipboard.writeText(e).catch(()=>{});else{const n=document.createElement("textarea");n.value=e,n.style.cssText="position:fixed;left:-9999px;top:-9999px",document.body.appendChild(n),n.select(),document.execCommand("copy"),n.remove()}});a.on("clear",()=>{C.clearAll(),z()});a.on("freeze",()=>{U()?Dt():Ht(),a.setButtonActive("freeze",U())});a.on("markersToggle",()=>{const e=b.toggleMarkers();a.setButtonActive("markersToggle",!e)});a.on("areaMode",()=>{f=!f,f||(l&&(l.remove(),l=null),$=!1),document.body.style.cursor=f?"crosshair":"",a.setButtonActive("areaMode",f)});a.on("settings",()=>{chrome.runtime.sendMessage({type:"OPEN_SETTINGS"})});document.body.addEventListener("mousemove",e=>{if(!a.isActive)return;if(f&&$&&l){const n=Math.min(e.clientX,k),o=Math.min(e.clientY,M),i=Math.abs(e.clientX-k),r=Math.abs(e.clientY-M);l.style.left=`${n}px`,l.style.top=`${o}px`,l.style.width=`${i}px`,l.style.height=`${r}px`;return}if(f)return;const t=V(e.clientX,e.clientY);if(t&&!q(t)){const n=L(t,2);b.showHoverHighlight(t,n),document.body.style.cursor=Wt(t)?"text":"crosshair"}else b.clearHoverHighlight(),document.body.style.cursor=""});document.body.addEventListener("mousedown",e=>{if(!a.isActive||!f)return;const t=e.target;q(t)||(e.preventDefault(),e.stopPropagation(),$=!0,k=e.clientX,M=e.clientY,l=document.createElement("div"),l.setAttribute("data-agentation","area-overlay"),l.style.cssText=`
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
  `,document.body.appendChild(l))},!0);document.body.addEventListener("mouseup",e=>{if(!a.isActive||!f||!$)return;e.preventDefault(),e.stopPropagation(),$=!1;const t=Math.min(e.clientX,k),n=Math.min(e.clientY,M),o=Math.abs(e.clientX-k),i=Math.abs(e.clientY-M);if(l&&(l.remove(),l=null),o<5||i<5)return;const r={x:t+window.scrollX,y:n+window.scrollY,width:o,height:i};v.show({x:e.clientX,y:e.clientY},`Area (${o}x${i})`),T=r,x=null},!0);document.body.addEventListener("click",e=>{if(!a.isActive||f)return;const t=V(e.clientX,e.clientY);if(!t||q(t))return;if(e.preventDefault(),e.stopPropagation(),(e.metaKey||e.ctrlKey)&&e.shiftKey){const o=h.indexOf(t);o>=0?(h.splice(o,1),Ut(t)):(h.push(t),W(t));return}if(h.length>0){h.includes(t)||(h.push(t),W(t)),x=t;const o=L(t,2);v.show({x:e.clientX,y:e.clientY},`Multi-select (${h.length} elements): ${o}`);return}x=t;const n=L(t,2);v.show({x:e.clientX,y:e.clientY},n)},!0);v.on("submit",async e=>{if(T){const m=T;T=null,C.add({elementPath:"area",selector:"",elementTag:"area",cssClasses:[],attributes:{},textContent:"",comment:e.comment,intent:e.intent,severity:e.severity,boundingBox:m,viewport:{scrollX:window.scrollX,scrollY:window.scrollY,width:window.innerWidth,height:window.innerHeight},nearbyText:[],computedStyles:{}}),z();return}if(!x)return;const t=h.length>1,n=t?[...h]:[x],o=Lt(x),i=It(),r=o.selector,[d,p]=await Promise.all([D.length>0?Ft(r):Promise.resolve(null),D.length>0?qt(r):Promise.resolve(null)]),u=t?n.map(m=>{const y=m.getBoundingClientRect();return{x:y.left+window.scrollX,y:y.top+window.scrollY,width:y.width,height:y.height}}):void 0;let c;if(t&&u&&u.length>0){const m=Math.min(...u.map(g=>g.x)),y=Math.min(...u.map(g=>g.y)),st=Math.max(...u.map(g=>g.x+g.width)),rt=Math.max(...u.map(g=>g.y+g.height));c={x:m,y,width:st-m,height:rt-y}}C.add({...o,...c?{boundingBox:c}:{},comment:e.comment,intent:e.intent,severity:e.severity,selectedText:i==null?void 0:i.text,framework:d||void 0,source:p||void 0,...t?{isMultiSelect:!0,elementBoundingBoxes:u}:{}}),t&&(it(),h=[]),z(),x=null});v.on("cancel",()=>{x=null,T=null});document.addEventListener("keydown",e=>{(e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key==="F"&&(e.preventDefault(),a.toggle(),a.isActive||(b.clearHoverHighlight(),v.hide(),document.body.style.cursor=""))});function q(e){return!!e.closest("agentation-root")||e.hasAttribute("data-agentation")}function Wt(e){const t=Array.from(e.childNodes);return t.length>0&&t.every(n=>n.nodeType===Node.TEXT_NODE)}
