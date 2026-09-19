// Local fixture preview; does not connect to the database.
const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const {employeePages,finish} = require('../controllers/reportController');
const output=path.resolve(__dirname,'../../output/pdf/sample-daily-attendance.pdf');
const records=[];
for(let day=1;day<=30;day++) {
 const date=`2026-08-${String(day).padStart(2,'0')}`;
 if([5,12,26].includes(day))continue;
 const status=[3,18,24].includes(day)?'absent':day===10?'on-leave':day===14?'half-day':day===21?'late':'present';
 const worked=['present','late','half-day'].includes(status);
 records.push({date,status,total_hours:worked?(status==='half-day'?4:8.5):0,
 check_in:worked?{time:date+'T03:30:00Z',office_name:'Expert Solutions Warehouse'}:null,
 check_out:worked?{time:date+(status==='half-day'?'T07:30:00Z':'T12:00:00Z')}:null,
 reason:status==='on-leave'?'Approved personal leave':''});
}
const stream=fs.createWriteStream(output);
const doc=new PDFDocument({margin:40,size:'A4',bufferPages:true});doc.pipe(stream);
employeePages(doc,{employee_name:'Aarav Sharma',employee_id:'DEMO-001 / Sample data'},records,{start:'2026-08-01',end:'2026-08-31'});finish(doc);
stream.on('finish',()=>console.log(output));
