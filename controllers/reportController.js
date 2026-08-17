const PDFDocument = require('pdfkit');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');

// @desc    Generate PDF report for employee attendance
// @route   GET /api/admin/reports/employee/:id/pdf
// @access  Private/Admin
const generateEmployeeReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, month, year } = req.query;

    // Get employee
    const employee = await Employee.findById(id).select('-password');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    // Determine date range
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (month && year) {
      start = new Date(parseInt(year), parseInt(month) - 1, 1);
      end = new Date(parseInt(year), parseInt(month), 0);
    } else {
      // Default: current month
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    end.setHours(23, 59, 59, 999);

    // Get attendance records
    const attendance = await Attendance.find({
      employee_id: id,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    // Calculate statistics
    const stats = {
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      leave: attendance.filter(a => a.status === 'on-leave').length,
      halfDay: attendance.filter(a => a.status === 'half-day').length,
      late: attendance.filter(a => a.status === 'late').length,
      totalHours: attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0),
    };

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=attendance_report_${employee.employee_id}_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.pdf`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Header with company info
    doc.fontSize(24).fillColor('#3B82F6').text('Expert Attendance', { align: 'center' });
    doc.fontSize(12).fillColor('#666').text('Attendance Report', { align: 'center' });
    doc.moveDown();

    // Employee details box
    doc.fillColor('#000').fontSize(16).text('Employee Information', { underline: true });
    doc.moveDown(0.5);
    
    const detailsStartY = doc.y;
    doc.fontSize(11)
      .text(`Name: ${employee.employee_name}`, 50, detailsStartY)
      .text(`Employee ID: ${employee.employee_id || 'N/A'}`, 50)
      .text(`Mobile: ${employee.mobile_no}`, 50)
      .text(`Email: ${employee.email || 'N/A'}`, 50);
    
    doc.text(`Role: ${employee.role || 'employee'}`, 350, detailsStartY)
      .text(`Status: ${employee.status}`, 350)
      .text(`Report Period:`, 350)
      .text(`${start.toLocaleDateString()} to ${end.toLocaleDateString()}`, 350);
    
    doc.moveDown(2);

    // Statistics section
    doc.fontSize(16).fillColor('#000').text('Attendance Statistics', { underline: true });
    doc.moveDown(0.5);

    const statsY = doc.y;
    doc.fontSize(11)
      .text(`Present Days: ${stats.present}`, 50, statsY)
      .text(`Absent Days: ${stats.absent}`, 50)
      .text(`Leave Days: ${stats.leave}`, 50);
    
    doc.text(`Half Days: ${stats.halfDay}`, 250, statsY)
      .text(`Late Days: ${stats.late}`, 250)
      .text(`Total Hours: ${stats.totalHours.toFixed(2)}`, 250);
    
    doc.text(`Total Records: ${attendance.length}`, 450, statsY)
      .text(`Avg Hours/Day: ${attendance.length > 0 ? (stats.totalHours / attendance.length).toFixed(2) : '0.00'}`, 450);
    
    doc.moveDown(2);

    // Attendance records table
    doc.fontSize(16).fillColor('#000').text('Attendance Records', { underline: true });
    doc.moveDown(0.5);

    if (attendance.length === 0) {
      doc.fontSize(11).fillColor('#666').text('No attendance records found for this period.');
    } else {
      // Table headers
      const tableTop = doc.y;
      const dateX = 50;
      const statusX = 140;
      const checkInX = 220;
      const checkOutX = 310;
      const hoursX = 400;
      const officeX = 480;
      
      doc.fontSize(10).fillColor('#fff');
      
      // Header background
      doc.rect(45, tableTop - 5, 510, 20).fill('#3B82F6');
      
      // Header text
      doc.fillColor('#fff')
        .text('Date', dateX, tableTop)
        .text('Status', statusX, tableTop)
        .text('Check In', checkInX, tableTop)
        .text('Check Out', checkOutX, tableTop)
        .text('Hours', hoursX, tableTop)
        .text('Office', officeX, tableTop);
      
      doc.moveDown();

      // Table rows
      let currentY = tableTop + 25;
      attendance.forEach((record, index) => {
        // Check if we need a new page
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
          
          // Repeat header on new page
          doc.rect(45, currentY - 5, 510, 20).fill('#3B82F6');
          doc.fillColor('#fff')
            .text('Date', dateX, currentY)
            .text('Status', statusX, currentY)
            .text('Check In', checkInX, currentY)
            .text('Check Out', checkOutX, currentY)
            .text('Hours', hoursX, currentY)
            .text('Office', officeX, currentY);
          currentY += 25;
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.rect(45, currentY - 5, 510, 20).fill('#F3F4F6');
        }

        // Row data
        doc.fillColor('#000').fontSize(9)
          .text(record.date.toLocaleDateString(), dateX, currentY)
          .text(record.status, statusX, currentY)
          .text(
            record.check_in.time ? new Date(record.check_in.time).toLocaleTimeString() : '-',
            checkInX,
            currentY
          )
          .text(
            record.check_out.time ? new Date(record.check_out.time).toLocaleTimeString() : '-',
            checkOutX,
            currentY
          )
          .text(
            record.total_hours ? record.total_hours.toFixed(2) : '-',
            hoursX,
            currentY
          )
          .text(
            record.check_in.office_name || '-',
            officeX,
            currentY,
            { width: 70, ellipsis: true }
          );

        currentY += 20;
      });
    }

    // Footer
    doc.moveDown(3);
    doc.fontSize(8).fillColor('#666')
      .text(
        `Generated on ${new Date().toLocaleString()} | Expert Attendance System`,
        { align: 'center' }
      );

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Generate PDF report error:', error);
    
    // If headers not sent yet, send JSON error
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate report.',
        error: error.message,
      });
    }
  }
};

// @desc    Generate PDF report for all employees
// @route   GET /api/admin/reports/all-employees/pdf
// @access  Private/Admin
const generateAllEmployeesReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    // Determine date range
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    const start = new Date(targetYear, targetMonth, 1);
    const end = new Date(targetYear, targetMonth + 1, 0);
    end.setHours(23, 59, 59, 999);

    // Get all approved employees
    const employees = await Employee.find({ 
      status: 'approved',
      role: 'employee',
    }).select('employee_id employee_name mobile_no').sort({ employee_name: 1 });

    // Get attendance for all employees
    const employeeStats = await Promise.all(
      employees.map(async (emp) => {
        const attendance = await Attendance.find({
          employee_id: emp._id,
          date: { $gte: start, $lte: end },
        });

        const stats = {
          present: attendance.filter(a => a.status === 'present').length,
          absent: attendance.filter(a => a.status === 'absent').length,
          leave: attendance.filter(a => a.status === 'on-leave').length,
          totalHours: attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0),
        };

        return {
          employee: emp,
          stats,
        };
      })
    );

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=all_employees_report_${targetYear}_${targetMonth + 1}.pdf`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(24).fillColor('#3B82F6').text('Expert Attendance', { align: 'center' });
    doc.fontSize(12).fillColor('#666').text('All Employees Attendance Report', { align: 'center' });
    doc.moveDown();

    // Period
    doc.fontSize(14).fillColor('#000')
      .text(`Report Period: ${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    const totalEmployees = employees.length;
    const totalPresent = employeeStats.reduce((sum, e) => sum + e.stats.present, 0);
    const totalAbsent = employeeStats.reduce((sum, e) => sum + e.stats.absent, 0);
    const totalLeave = employeeStats.reduce((sum, e) => sum + e.stats.leave, 0);
    const totalHours = employeeStats.reduce((sum, e) => sum + e.stats.totalHours, 0);

    doc.fontSize(12).text(`Total Employees: ${totalEmployees}`)
      .text(`Total Present Days: ${totalPresent}`)
      .text(`Total Absent Days: ${totalAbsent}`)
      .text(`Total Leave Days: ${totalLeave}`)
      .text(`Total Hours Worked: ${totalHours.toFixed(2)}`);
    
    doc.moveDown(2);

    // Employee table
    doc.fontSize(14).text('Employee-wise Statistics', { underline: true });
    doc.moveDown();

    // Table headers
    let currentY = doc.y;
    const nameX = 50;
    const empIdX = 200;
    const presentX = 280;
    const absentX = 340;
    const leaveX = 400;
    const hoursX = 460;

    doc.rect(45, currentY - 5, 515, 20).fill('#3B82F6');
    doc.fontSize(9).fillColor('#fff')
      .text('Name', nameX, currentY)
      .text('ID', empIdX, currentY)
      .text('Present', presentX, currentY)
      .text('Absent', absentX, currentY)
      .text('Leave', leaveX, currentY)
      .text('Hours', hoursX, currentY);

    currentY += 25;

    // Table rows
    employeeStats.forEach((empData, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
        
        // Repeat header
        doc.rect(45, currentY - 5, 515, 20).fill('#3B82F6');
        doc.fillColor('#fff')
          .text('Name', nameX, currentY)
          .text('ID', empIdX, currentY)
          .text('Present', presentX, currentY)
          .text('Absent', absentX, currentY)
          .text('Leave', leaveX, currentY)
          .text('Hours', hoursX, currentY);
        currentY += 25;
      }

      if (index % 2 === 0) {
        doc.rect(45, currentY - 5, 515, 18).fill('#F3F4F6');
      }

      doc.fillColor('#000').fontSize(8)
        .text(empData.employee.employee_name, nameX, currentY, { width: 140, ellipsis: true })
        .text(empData.employee.employee_id || '-', empIdX, currentY)
        .text(empData.stats.present.toString(), presentX, currentY)
        .text(empData.stats.absent.toString(), absentX, currentY)
        .text(empData.stats.leave.toString(), leaveX, currentY)
        .text(empData.stats.totalHours.toFixed(2), hoursX, currentY);

      currentY += 18;
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#666')
      .text(
        `Generated on ${new Date().toLocaleString()} | Expert Attendance System`,
        { align: 'center' }
      );

    doc.end();

  } catch (error) {
    console.error('Generate all employees PDF report error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate report.',
        error: error.message,
      });
    }
  }
};

module.exports = {
  generateEmployeeReport,
  generateAllEmployeesReport,
};
