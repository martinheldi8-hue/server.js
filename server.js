// server.js
const express = require('express');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(express.json());


let reservations = [];
let nextId = 1;


function timeToMinutes(t){
const [h,m] = String(t).split(':').map(Number);
return (h*60)+m;
}


function hasConflict(candidate, excludeId=null){
const sMin = timeToMinutes(candidate.start);
const eMin = timeToMinutes(candidate.end);


for(const r of reservations){
if(excludeId != null && String(r.id) === String(excludeId)) continue;
if(r.date !== candidate.date) continue;
const rs = timeToMinutes(r.start);
const re = timeToMinutes(r.end);
const timeOverlaps = (sMin < re && rs < eMin);
if(!timeOverlaps) continue;
for(const f of candidate.fields){
if(r.fields.includes(f)){
return { ok:false, field:f, other:r };
}
}
}
return { ok:true };
}


app.get('/reservations', (req,res)=>{
const date = req.query.date;
if(date){
return res.json(reservations.filter(r=>r.date===date));
}
res.json(reservations);
});


app.post('/reservations', (req,res)=>{
const {date,start,end,fields,group} = req.body;


if(!date || !start || !end || !Array.isArray(fields) || fields.length===0){
return res.status(400).json({error:'Neúplné dáta'});
}


const sMin = timeToMinutes(start);
const eMin = timeToMinutes(end);
if(sMin >= eMin) return res.status(400).json({error:'Neplatný čas'});


const candidate = { date, start, end, fields, group };
const check = hasConflict(candidate);
if(!check.ok){
return res.status(400).json({error:`Kolízia s rezerváciou na ${check.field} (${check.other.start}-${check.other.end})`});
}


const newRes = { id: nextId++, ...candidate };
reservations.push(newRes);
res.json(newRes);
});


// Admin: update reservation
app.put('/reservations/:id', (req,res)=>{
const id = req.params.id;
const idx = reservations.findIndex(r=>String(r.id)===String(id));
if(idx < 0) return res.status(404).json({error:'Rezervácia nenájdená'});


const current = reservations[idx];
const patch = req.body || {};


const updated = {
...current,
date: patch.date ?? current.date,
start: patch.start ?? current.start,
end: patch.end ?? current.end,
group: patch.group ?? current.group,
