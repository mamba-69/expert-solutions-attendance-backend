const test = require('node:test');
const assert = require('node:assert/strict');
const { businessDate, dateBucket, dayQuery, rangeQuery, formatHours, hoursBetween, dailyRows } = require('../utils/attendanceTime');
const { offices, officeAt, distanceMetres } = require('../utils/offices');
const Attendance = require('../models/Attendance');

test('IST date rolls over at 18:30 UTC, including year and leap-day boundaries',()=>{
 assert.equal(businessDate('2026-09-18T18:29:59Z'),'2026-09-18');
 assert.equal(businessDate('2026-09-18T18:30:00Z'),'2026-09-19');
 assert.equal(businessDate('2025-12-31T18:30:00Z'),'2026-01-01');
 assert.equal(businessDate('2024-02-28T18:30:00Z'),'2024-02-29');
});
test('new buckets retain UTC date convention; old IST-midnight records remain readable',()=>{
 assert.equal(dateBucket('2026-09-18').toISOString(),'2026-09-18T00:00:00.000Z');
 assert.deepEqual(dayQuery('2026-09-18').$in.map(String),[new Date('2026-09-18T00:00Z'),new Date('2026-09-17T18:30Z')].map(String));
 const q=rangeQuery('2026-09-01','2026-09-30');
 assert.equal(q.$gte.toISOString(),'2026-08-31T18:30:00.000Z');
 assert.equal(q.$lt.toISOString(),'2026-09-30T18:30:00.000Z');
 assert.throws(()=>rangeQuery('2026-09-30','2026-09-01'));
});
test('duration formatting carries rounded minutes and rejects reversed times',()=>{
 assert.equal(formatHours(8.5),'8h 30m');assert.equal(formatHours(1.999),'2h 00m');
 assert.equal(formatHours(-1),'0h 00m');assert.equal(formatHours(NaN),'0h 00m');
 assert.equal(hoursBetween('2026-09-18T03:30Z','2026-09-18T12:05Z'),8+35/60);
 assert.throws(()=>hoursBetween('2026-09-18T12:00Z','2026-09-18T09:00Z'));
});
test('daily report includes every day and does not invent absences',()=>{
 const rows=dailyRows([{date:new Date('2024-02-28T18:30Z'),status:'present',total_hours:8}], '2024-02-28','2024-03-01');
 assert.equal(rows.length,3);assert.equal(rows[0].status,'no-record');assert.equal(rows[1].date,'2024-02-29');assert.equal(rows[1].status,'present');
});
test('strict geofence accepts 49m and rejects 51m at both real offices',()=>{
 assert.equal(offices.length,2);
 for(const o of offices){const offset=m=>m/6371000*180/Math.PI;
 assert.equal(officeAt(o.latitude,o.longitude).name,o.name);
 assert.ok(officeAt(o.latitude+offset(49),o.longitude));assert.equal(officeAt(o.latitude+offset(51),o.longitude),null);
 assert.ok(distanceMetres(o.latitude,o.longitude,o.latitude+offset(50),o.longitude)>49.999);
 }
 assert.equal(officeAt(NaN,75),null);assert.equal(officeAt('24.4',75),null);assert.equal(officeAt(91,181),null);
});
test('model never retains old hours when times are cleared',()=>{
 const doc=new Attendance({employee_id:'507f1f77bcf86cd799439011',date:new Date(),check_in:null,check_out:null,total_hours:10});
 assert.equal(doc.calculateTotalHours(),0);
});
test('report period uses provided date range instead of end-date month',()=>{
 const {periodFor}=require('../controllers/reportController');
 assert.deepEqual(periodFor({startDate:'2026-08-05',endDate:'2026-09-04'}),{start:'2026-08-05',end:'2026-09-04'});
});
test('check-in and checkout reject outside office before touching database',async()=>{
 const {checkIn,checkOut}=require('../controllers/attendanceController');
 for(const handler of [checkIn,checkOut]){let status,body;await handler({body:{latitude:24,longitude:75,biometric_verified:true}}, {status(s){status=s;return this;},json(value){body=value;}});assert.equal(status,400);assert.match(body.message,/50 metres/);}
});
test('public report routes now require authentication middleware',()=>{
 const router=require('../routes/adminRoutes');
 const reportIndex=router.stack.findIndex(layer=>layer.route?.path==='/reports/all-employees/pdf');
 const authIndex=router.stack.findIndex(layer=>layer.name==='authenticate');
 const adminIndex=router.stack.findIndex(layer=>layer.name==='isAdmin');
 assert.ok(authIndex>=0&&authIndex<reportIndex);assert.ok(adminIndex>=0&&adminIndex<reportIndex);
});
test('cron fails closed without a secret and does not trust spoofable headers',()=>{
 const router=require('../routes/cronRoutes');
 const route=router.stack.find(layer=>layer.route?.path==='/auto-absent');
 let status,next=false;const previous=process.env.CRON_SECRET;delete process.env.CRON_SECRET;
 route.route.stack[0].handle({headers:{'x-vercel-cron':'1'}},{status(s){status=s;return this;},json(){}},()=>next=true);
 if(previous!==undefined)process.env.CRON_SECRET=previous;
 assert.equal(status,401);assert.equal(next,false);
});

test('average denominator counts unique working days, excluding absence and leave', () => {
 const { workingDayCount } = require('../utils/attendanceTime');
 const records = [
  {date:'2026-09-01',check_in:{time:'2026-09-01T03:30Z'},total_hours:4},
  {date:'2026-09-01',check_in:{time:'2026-09-01T08:30Z'},total_hours:4},
  {date:'2026-09-02',check_in:{time:'2026-09-02T03:30Z'},total_hours:6},
  {date:'2026-09-03',status:'absent',total_hours:0},
  {date:'2026-09-04',status:'on-leave',total_hours:0},
 ];
 assert.equal(workingDayCount(records),2);
 assert.equal(records.reduce((sum,r)=>sum+r.total_hours,0)/workingDayCount(records),7);
 assert.equal(workingDayCount([]),0);
});


test('report average is total worked hours divided by distinct dates marked present', () => {
 const {reportSummary} = require('../utils/attendanceTime');
 const records = [
  {date:'2026-09-01',status:'present',total_hours:4},
  {date:'2026-08-31T18:30:00Z',status:'present',total_hours:4},
  {date:'2026-09-02',status:'present',total_hours:8},
  {date:'2026-09-03',status:'late',check_in:{time:'2026-09-03T04:00Z'},total_hours:2},
  {date:'2026-09-04',status:'absent',total_hours:0},
  {date:'2026-09-05',status:'on-leave',total_hours:0},
 ];
 assert.deepEqual(reportSummary(records),{totalHours:18,presentDays:2,averageHours:9});
 assert.deepEqual(reportSummary([]),{totalHours:0,presentDays:0,averageHours:0});
 assert.equal(reportSummary([{date:'2026-09-01',status:'half-day',total_hours:4}]).averageHours,0);
});

test('monthly PDF pagination keeps all 31 dates and does not create footer-only pages', async () => {
 const PDFDocument=require('pdfkit');
 const {Writable}=require('node:stream');
 const {finished}=require('node:stream/promises');
 const {employeePages,finish}=require('../controllers/reportController');
 const doc=new PDFDocument({margin:40,size:'A4',bufferPages:true});
 const sink=new Writable({write(chunk,encoding,callback){callback();}});
 doc.pipe(sink);let pages=1;doc.on('pageAdded',()=>pages++);
 employeePages(doc,{employee_name:'Example Employee',employee_id:'TEST'},[],{start:'2024-01-01',end:'2024-01-31'});
 assert.equal(pages,2);
 finish(doc);await finished(sink);
 assert.equal(pages,2);
});
