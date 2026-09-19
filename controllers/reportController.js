const PDFDocument = require('pdfkit');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { monthRange, rangeQuery, dailyRows, formatHours, businessDate, dateKey, reportSummary } = require('../utils/attendanceTime');
const clock = value => value ? new Date(value).toLocaleTimeString('en-IN', { timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',hour12:true }) : '-';
const label = status => ({'on-leave':'On leave','half-day':'Half day','no-record':'No record','upcoming':'Upcoming'}[status] || (status ? status[0].toUpperCase()+status.slice(1) : 'No record'));
function periodFor(query) {
  const period = query.startDate && query.endDate ? {start:dateKey(query.startDate),end:dateKey(query.endDate)} : monthRange(query.month,query.year);
  rangeQuery(period.start,period.end);
  return period;
}
const palette = { ink:'#122F32', teal:'#087F73', muted:'#627875', rule:'#DFE9E5', pale:'#F3F7F5' };
function header(doc,title,subtitle) {
  doc.rect(0,0,doc.page.width,124).fill(palette.ink);
  doc.rect(40,26,24,3).fill('#D6F28C');
  doc.fillColor('#D6F28C').font('Helvetica-Bold').fontSize(9).text('EXPERT / EMPLOYEE ATTENDANCE',74,23);
  let titleSize=22;doc.fontSize(titleSize);
  while(doc.widthOfString(title)>510 && titleSize>12) doc.fontSize(--titleSize);
  doc.fillColor('#FFFFFF').text(title,40,49,{width:515,height:30,ellipsis:true});
  doc.font('Helvetica').fontSize(9).fillColor('#D3E4DC').text(subtitle,40,91,{width:515});
}
function metric(doc,x,y,title,value,color=palette.ink) {
  doc.roundedRect(x,y,163,59,8).fill(palette.pale);
  doc.font('Helvetica').fontSize(8).fillColor(palette.muted).text(title.toUpperCase(),x+12,y+11,{width:139});
  doc.font('Helvetica-Bold').fontSize(19).fillColor(color).text(String(value),x+12,y+28,{width:139});
}
const columns=[40,127,221,296,371,447];
const widths=[81,88,69,69,70,108];
function tableHeader(doc,y) {
  doc.roundedRect(36,y-8,523,26,4).fill(palette.ink);
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
  ['DATE','STATUS','CHECK IN','CHECK OUT','WORKED','OFFICE / NOTE'].forEach((v,i)=>doc.text(v,columns[i]+4,y,{width:widths[i]-8,lineBreak:false}));
}
function attendanceRow(doc,r,y,index) {
  const absent=r.status==='absent', missing=r.status==='no-record';
  const tint=absent?'#FFF1EE':missing?'#FFF8E7':index%2===0?'#F5F8F6':'#FFFFFF';
  const color=absent?'#AA3E31':missing?'#896113':palette.ink;
  doc.rect(36,y-5,523,28).fill(tint);
  if(absent||missing)doc.rect(36,y-5,3,28).fill(color);
  const inProgress=r.check_in?.time&&!r.check_out?.time;
  const worked=inProgress?'In progress':r.check_out?.time?formatHours(r.total_hours):'-';
  const note=missing?'No attendance recorded':r.status==='upcoming'?'Future date':r.reason||r.check_in?.office_name||'-';
  const day=new Date(r.date+'T00:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',timeZone:'UTC'});
  const values=[day,label(r.status),clock(r.check_in?.time),clock(r.check_out?.time),worked,note];
  values.forEach((value,i)=>{
    doc.font(i===1?'Helvetica-Bold':'Helvetica').fontSize(i===5?7.5:8).fillColor(i===1?color:palette.ink)
      .text(String(value),columns[i]+4,y,{width:widths[i]-8,height:24,ellipsis:true});
  });
}
function begin(res,filename) {
  const doc=new PDFDocument({margin:40,size:'A4',bufferPages:true});
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
  doc.pipe(res);return doc;
}
function employeePages(doc,employee,records,period) {
  const subtitle=`${employee.employee_id || 'Employee'}  |  ${period.start} to ${period.end}  |  All times IST`;
  header(doc,employee.employee_name,subtitle);
  const {totalHours,presentDays,averageHours}=reportSummary(records);
  const rows=dailyRows(records,period.start,period.end);
  const count=status=>new Set(rows.filter(r=>r.status===status).map(r=>r.date)).size;
  metric(doc,40,143,'Total hours worked',formatHours(totalHours),palette.teal);
  metric(doc,216,143,'Days marked present',presentDays);
  metric(doc,392,143,'Avg / present day',formatHours(averageHours),palette.teal);
  metric(doc,40,213,'Absent days',count('absent'),'#AA3E31');
  metric(doc,216,213,'Days with no record',count('no-record'),'#896113');
  metric(doc,392,213,'Leave days',count('on-leave'));
  doc.font('Helvetica').fontSize(8.5).fillColor(palette.muted)
    .text(`Average = ${formatHours(totalHours)} total worked / ${presentDays} present days.`,40,286,{width:515});
  doc.fontSize(8).text('Only dates marked Present count in the average denominator. No record is not an absence.',40,302,{width:515});
  doc.font('Helvetica-Bold').fontSize(12).fillColor(palette.ink).text('Daily attendance',40,327);
  doc.font('Helvetica').fontSize(8).fillColor(palette.muted).text('Every date in your selected period',350,330,{width:205,align:'right'});
  let y=362;tableHeader(doc,y);y+=28;
  rows.forEach((r,index)=>{
    if(y+23>766){
      doc.addPage();header(doc,employee.employee_name,subtitle);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(palette.ink).text('Daily attendance / continued',40,145);
      y=177;tableHeader(doc,y);y+=28;
    }
    attendanceRow(doc,r,y,index);y+=28;
  });
}
function finish(doc) {
  const pages=doc.bufferedPageRange();
  for(let i=pages.start;i<pages.start+pages.count;i++) {
    doc.switchToPage(i);
    const bottom=doc.page.margins.bottom;doc.page.margins.bottom=0;
    doc.moveTo(40,784).lineTo(555,784).lineWidth(0.5).stroke(palette.rule);
    doc.font('Helvetica').fontSize(7.5).fillColor(palette.muted)
      .text(`Generated ${businessDate()} | Employee attendance report`,40,794,{width:400,lineBreak:false});
    doc.text(`${i+1} / ${pages.count}`,475,794,{width:80,align:'right',lineBreak:false});
    doc.page.margins.bottom=bottom;
  }
  doc.end();
}
async function generateEmployeeReport(req,res) {
  try {
    let period;try{period=periodFor(req.query);}catch(e){return res.status(400).json({success:false,message:e.message});}
    const employee=await Employee.findById(req.params.id).select('employee_name employee_id');
    if(!employee)return res.status(404).json({success:false,message:'Employee not found.'});
    const records=await Attendance.find({employee_id:employee._id,date:rangeQuery(period.start,period.end)}).sort({date:1});
    const doc=begin(res,`attendance_${employee.employee_id || 'employee'}_${period.start}.pdf`);
    employeePages(doc,employee,records,period);finish(doc);
  }catch(error){if(!res.headersSent)res.status(500).json({success:false,message:'Unable to generate report.'});else res.end();}
}
async function generateAllEmployeesReport(req,res) {
  try {
    let period;try{period=periodFor(req.query);}catch(e){return res.status(400).json({success:false,message:e.message});}
    const employees=await Employee.find({status:'approved',role:'employee'}).select('employee_id employee_name').sort({employee_name:1});
    const records=await Attendance.find({employee_id:{$in:employees.map(e=>e._id)},date:rangeQuery(period.start,period.end)}).sort({date:1}).lean();
    const doc=begin(res,`team_attendance_${period.start}_${period.end}.pdf`);
    if(!employees.length)header(doc,'Team attendance','No approved employees in this report.');
    employees.forEach((employee,index)=>{if(index)doc.addPage();employeePages(doc,employee,records.filter(r=>String(r.employee_id)===String(employee._id)),period);});
    finish(doc);
  }catch(error){if(!res.headersSent)res.status(500).json({success:false,message:'Unable to generate report.'});else res.end();}
}
module.exports={generateEmployeeReport,generateAllEmployeesReport,employeePages,periodFor,finish};
