#!/usr/bin/env node
// scripts/collect-holdout.js
// ADR-0015 D3: builds a labeled holdout from jiahao own Codex session rollouts.
// No network beyond this file. Reads ~/.codex/sessions/**/*.jsonl.

const fs = require("fs");
const path = require("path");
const os = require("os");
const { detectFull } = require(path.join(__dirname, "..", "src", "detector.js"));

function* walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) yield* walk(p);
    else if(e.isFile() && p.endsWith(".jsonl")) yield p;
  }
}

function safeParse(line){ try{ return JSON.parse(line);}catch(e){return null;} }

function* turns(file){
  const lines = fs.readFileSync(file,"utf8").split(/\r?\n/).filter(Boolean);
  let cur = { tool_results:[], closing_text:"" };
  for(const raw of lines){
    const e = safeParse(raw); if(!e) continue;
    const t = e.type || e.record_type;
    if(t==="response_item" && e.payload && e.payload.type==="function_call"){
      cur.tool_results.push({name:e.payload.name, output:String(e.payload.arguments||"")});
    } else if(t==="response_item" && e.payload && e.payload.type==="function_call_output"){
      cur.tool_results.push({name:"out", output:String(e.payload.output||"")});
    } else if(t==="response_item" && e.payload && e.payload.type==="message" && e.payload.role==="assistant"){
      const pieces=(e.payload.content||[]).map(c=>c.text||"").join("");
      if(pieces) cur.closing_text += pieces;
    } else if(e.type==="user_input"){
      if(cur.tool_results.length>0 || cur.closing_text) yield cur;
      cur={tool_results:[],closing_text:""};
    }
  }
  if(cur.tool_results.length>0 || cur.closing_text) yield cur;
}

function* iter(root){
  for(const file of walk(root)){
    const sid = path.basename(file,".jsonl");
    for(const t of turns(file)){
      const r=detectFull({toolResults:t.tool_results, closingText:t.closing_text, evidenceRecords:[], turn:undefined});
      yield {
        id: sid + "::" + Math.random().toString(36).slice(2,10),
        session_id: sid,
        closing_text: t.closing_text.slice(0,2000),
        tool_results: t.tool_results.slice(0,20),
        prelabel: (r.structural_any || r.suspicious) ? "suspect" : "clean",
        structural_hits: r.structural_hits,
        matched_phrases: r.matched_phrases,
      };
    }
  }
}

function main(){
  const root = path.join(os.homedir(), ".codex", "sessions");
  const out  = path.join(os.tmpdir(), "jiahao-holdout.jsonl");
  const outCsv = path.join(os.tmpdir(), "jiahao-holdout.csv");
  const ws = fs.createWriteStream(out, {encoding:"utf8"});
  const csv = fs.createWriteStream(outCsv, {encoding:"utf8"});
  csv.write("id,session_id,prelabel,structural_any,L1,L2,L3,phrases,closing_preview\n");
  let n=0;
  for(const it of iter(root)){
    ws.write(JSON.stringify(it)+"\n");
    const esc = s => ("\""+String(s).replace(/"/g,"\"\"")+"\"");
    csv.write([
      it.id, it.session_id, it.prelabel, it.structural_hits ? Object.values(it.structural_hits).some(Boolean) : false,
      it.structural_hits.L1_error_concealment, it.structural_hits.L2_completion_vs_evidence, it.structural_hits.L3_narrative_vs_assertion,
      (it.matched_phrases||[]).length, esc((it.closing_text||"").slice(0,120).replace(/\s+/g," "))
    ].join(",") + "\n");
    n++; if(n>=200) break;
  }
  ws.end();
  csv.end();
  console.log("holdout:", out, "items:", n);
  console.log("csv:   ", outCsv);
}
main();
